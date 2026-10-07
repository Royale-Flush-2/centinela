from typing import Protocol, List, Any, runtime_checkable


@runtime_checkable
class ToolProvider(Protocol):
    async def get_tools(self) -> List[Any]:
        ...


@runtime_checkable
class LLMProvider(Protocol):
    async def generate_response(self, prompt: str, tools: List[Any]) -> Any:
        ...

