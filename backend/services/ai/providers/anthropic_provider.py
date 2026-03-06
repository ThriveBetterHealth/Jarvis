"""Anthropic Claude provider."""

import io
from typing import AsyncGenerator

import anthropic

from core.config import settings
from services.ai.providers.base import AIProvider, ChatMessage


class AnthropicProvider(AIProvider):
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _convert_messages(self, messages: list[ChatMessage]) -> tuple[str, list[dict]]:
        """Split system message and convert the rest."""
        system_parts = []
        converted = []
        for msg in messages:
            if msg.role == "system":
                system_parts.append(msg.content)
            else:
                converted.append({"role": msg.role, "content": msg.content})
        system = "\n\n".join(system_parts) if system_parts else "You are Jarvis, a personal AI operating system."
        return system, converted

    async def chat(self, messages: list[ChatMessage], model: str = "claude-sonnet-4-6", **kwargs) -> dict:
        system, converted = self._convert_messages(messages)
        response = await self.client.messages.create(
            model=model,
            max_tokens=8096,
            system=system,
            messages=converted,
        )
        return {
            "content": response.content[0].text,
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
        }

    async def stream_chat(
        self, messages: list[ChatMessage], model: str = "claude-sonnet-4-6", **kwargs
    ) -> AsyncGenerator[dict, None]:
        system, converted = self._convert_messages(messages)
        async with self.client.messages.stream(
            model=model,
            max_tokens=8096,
            system=system,
            messages=converted,
        ) as stream:
            async for text in stream.text_stream:
                yield {"delta": text, "done": False}
        yield {"delta": "", "done": True}
