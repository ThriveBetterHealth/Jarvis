"""OpenAI GPT provider."""

import io
from typing import AsyncGenerator

import openai

from core.config import settings
from services.ai.providers.base import AIProvider, ChatMessage


class OpenAIProvider(AIProvider):
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    def _convert(self, messages: list[ChatMessage]) -> list[dict]:
        return [{"role": m.role, "content": m.content} for m in messages]

    async def chat(self, messages: list[ChatMessage], model: str = "gpt-4o", **kwargs) -> dict:
        response = await self.client.chat.completions.create(
            model=model,
            messages=self._convert(messages),
        )
        choice = response.choices[0]
        return {
            "content": choice.message.content,
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
        }

    async def stream_chat(
        self, messages: list[ChatMessage], model: str = "gpt-4o", **kwargs
    ) -> AsyncGenerator[dict, None]:
        stream = await self.client.chat.completions.create(
            model=model,
            messages=self._convert(messages),
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            done = chunk.choices[0].finish_reason is not None
            yield {"delta": delta, "done": done}

    async def transcribe(self, audio_bytes: bytes, filename: str) -> str:
        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = filename
        transcript = await self.client.audio.transcriptions.create(
            model="whisper-1",
            file=file_obj,
        )
        return transcript.text
