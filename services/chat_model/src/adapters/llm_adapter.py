import os
from typing import Any, AsyncGenerator, List, Optional
from langchain_openai import ChatOpenAI


class LangChainLLMProvider:
    def __init__(self, model: str = "deepseek-chat"):
        api_key = os.getenv("DEEPSEEK_API_KEY", "fake-key")
        self.llm = ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url="https://api.deepseek.com/v1",
        )

    async def generate_response(self, prompt: str, tools: Optional[List[Any]] = None) -> str:
        if tools:
            llm_with_tools = self.llm.bind_tools(tools)
            response = await llm_with_tools.ainvoke(prompt)
        else:
            response = await self.llm.ainvoke(prompt)
        return str(response.content)

    async def stream_response(self, prompt: str, tools: Optional[List[Any]] = None) -> AsyncGenerator[str, None]:
        llm_with_tools = self.llm.bind_tools(tools) if tools else self.llm
        async for chunk in llm_with_tools.astream(prompt):
            yield f"data: {chunk.content}\n\n"
