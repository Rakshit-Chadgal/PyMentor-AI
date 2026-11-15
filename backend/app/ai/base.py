from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(frozen=True)
class ChatTurn:
    role: Literal["system", "user", "assistant"]
    content: str


@dataclass(frozen=True)
class StreamEvent:
    kind: Literal["delta", "usage", "done"]
    text: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0


class LLMProvider(Protocol):
    name: str

    async def stream(
        self,
        messages: list[ChatTurn],
        *,
        model: str,
        max_output_tokens: int,
        response_schema: dict[str, object] | None,
        timeout: float,
    ) -> AsyncIterator[StreamEvent]: ...

    async def complete_json(
        self,
        messages: list[ChatTurn],
        *,
        model: str,
        schema: dict[str, object],
        max_output_tokens: int,
        timeout: float,
    ) -> dict[str, object]: ...
