"""Google Gemini provider."""

from typing import AsyncGenerator

import google.generativeai as genai

from core.config import settings
from services.ai.providers.base import AIProvider, ChatMessage


class GoogleProvider(AIProvider):
    def __init__(self):
        genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
        self.model_name = "gemini-pro"

    def _build_history(self, messages: list[ChatMessage]) -> tuple[list[dict], str]:
        history = []
        last_user_msg = ""
        for msg in messages:
            if msg.role == "system":
                continue
            role = "user" if msg.role == "user" else "model"
            history.append({"role": role, "parts": [msg.content]})
        if history and history[-1]["role"] == "user":
            last_user_msg = history[-1]["parts"][0]
            history = history[:-1]
        return history, last_user_msg

    async def chat(self, messages: list[ChatMessage], model: str = "gemini-pro", **kwargs) -> dict:
        history, last_msg = self._build_history(messages)
        m = genai.GenerativeModel(model)
        chat = m.start_chat(history=history)
        response = await chat.send_message_async(last_msg)
        return {
            "content": response.text,
            "prompt_tokens": 0,
            "completion_tokens": 0,
        }

    async def stream_chat(
        self, messages: list[ChatMessage], model: str = "gemini-pro", **kwargs
    ) -> AsyncGenerator[dict, None]:
        history, last_msg = self._build_history(messages)
        m = genai.GenerativeModel(model)
        chat = m.start_chat(history=history)
        async for chunk in await chat.send_message_async(last_msg, stream=True):
            yield {"delta": chunk.text, "done": False}
        yield {"delta": "", "done": True}
