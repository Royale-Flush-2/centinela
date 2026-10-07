import asyncio
import logging
from typing import Any, List, Type, Dict
from contextlib import AsyncExitStack
from mcp.client.sse import sse_client
from mcp.client.session import ClientSession
from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, create_model
import inspect

logger = logging.getLogger(__name__)

class MCPClientWrapper:
    def __init__(self, url: str):
        self.url = url
        self.exit_stack = AsyncExitStack()
        self.session: ClientSession = None
        self.langchain_tools: List[BaseTool] = []

    async def connect(self):
        try:
            logger.info(f"Conectando al servidor MCP: {self.url}")
            sse_transport = await self.exit_stack.enter_async_context(sse_client(self.url))
            read, write = sse_transport
            self.session = await self.exit_stack.enter_async_context(ClientSession(read, write))
            await self.session.initialize()
            logger.info("Sesión MCP inicializada.")
            
            tools_res = await self.session.list_tools()
            logger.info(f"Se encontraron {len(tools_res.tools)} herramientas en el MCP.")
            
            self._map_tools(tools_res.tools)
            
        except Exception as e:
            logger.error(f"Error conectando al MCP: {e}")
            raise

    async def disconnect(self):
        await self.exit_stack.aclose()
        logger.info("Desconectado del servidor MCP.")

    def _map_tools(self, mcp_tools):
        for t in mcp_tools:
            tool_name = t.name
            description = t.description or f"Ejecuta {tool_name}"
            # Usa input_schema (el nombre pydantic de la lib mcp)
            input_schema = getattr(t, "input_schema", {})
            
            fields = {}
            if input_schema and "properties" in input_schema:
                for prop_name, prop_info in input_schema["properties"].items():
                    prop_type = str
                    if prop_info.get("type") == "integer":
                        prop_type = int
                    elif prop_info.get("type") == "boolean":
                        prop_type = bool
                    
                    is_required = prop_name in input_schema.get("required", [])
                    default_val = ... if is_required else None
                    fields[prop_name] = (prop_type, default_val)
                    
            args_schema = create_model(f"{tool_name}Schema", **fields)
            
            async def _invoke_mcp(*args, tool_name=tool_name, **kwargs) -> str:
                final_args = kwargs
                if args and hasattr(args[0], "dict"):
                    final_args = args[0].dict()
                
                try:
                    logger.info(f"Llamando MCP tool {tool_name} con args {final_args}")
                    result = await self.session.call_tool(tool_name, arguments=final_args)
                    if result.isError:
                        return f"Error de MCP: {result.content}"
                    
                    text_outputs = [c.text for c in result.content if c.type == "text"]
                    return "\n".join(text_outputs)
                except Exception as e:
                    return f"Error interno llamando a {tool_name}: {e}"

            lc_tool = StructuredTool.from_function(
                func=None,
                coroutine=_invoke_mcp,
                name=tool_name,
                description=description,
                args_schema=args_schema
            )
            
            self.langchain_tools.append(lc_tool)
