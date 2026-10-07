import asyncio
from mcp.client.sse import sse_client
from mcp.client.session import ClientSession
from contextlib import AsyncExitStack

async def test_mcp():
    url = "https://jk3v3ufmrk.us-east-2.awsapprunner.com/sse"
    exit_stack = AsyncExitStack()
    
    try:
        sse_transport = await exit_stack.enter_async_context(sse_client(url))
        read, write = sse_transport
        session = await exit_stack.enter_async_context(ClientSession(read, write))
        await session.initialize()
        
        tools_res = await session.list_tools()
        for t in tools_res.tools:
            print(f"Tool: {t.name}")
            print(dir(t))
            if hasattr(t, "inputSchema"):
                print(f"Schema: {t.inputSchema}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await exit_stack.aclose()

asyncio.run(test_mcp())
