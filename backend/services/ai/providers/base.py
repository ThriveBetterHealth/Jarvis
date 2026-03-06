"""Abstract AI provider interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncGenerator, Optional


@dataclass
class ChatMessage:
    role: str  # "user" | "assistant" | "system"
    content: str


class AIProvider(ABC):
    """Every model provider implements this interface."""

    @abstractmethod
    async def chat(self, messages: list[ChatMessage], model: str, **kwargs) -> dict:
        """Non-streaming chat. Returns dict with 'content', 'prompt_tokens', 'completion_tokens'."""
        ...

    @abstractmethod
    async def stream_chat(
        self, messages: list[ChatMessage], model: str, **kwargs
    ) -> AsyncGenerator[dict, None]:
        """Streaming chat. Yields dicts with 'delta' and optional 'done' flag."""
        ...
