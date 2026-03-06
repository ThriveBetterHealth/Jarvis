"""AI Orchestration Layer - model routing, prompt construction, streaming."""

import time
from typing import AsyncGenerator

import structlog

from models.conversation import AIModel, Conversation, MessageRole
from models.user import User
from services.ai.providers.anthropic_provider import AnthropicProvider
from services.ai.providers.base import AIProvider, ChatMessage
from services.ai.providers.openai_provider import OpenAIProvider
from services.ai.providers.google_provider import GoogleProvider
from services.memory_service import MemoryService

log = structlog.get_logger()


class AIOrchestrator:
    """Provider-agnostic AI orchestration layer."""

    def __init__(self, db, user: User):
        self.db = db
        self.user = user
        self._providers: dict[str, AIProvider] = {}

    def _get_provider(self, model: AIModel) -> AIProvider:
        if model in (AIModel.GPT4O, AIModel.GPT4O_MINI):
            key = "openai"
            if key not in self._providers:
                self._providers[key] = OpenAIProvider()
            return self._providers[key]
        elif model in (AIModel.CLAUDE_OPUS, AIModel.CLAUDE_SONNET):
            key = "anthropic"
            if key not in self._providers:
                self._providers[key] = AnthropicProvider()
            return self._providers[key]
        elif model == AIModel.GEMINI_PRO:
            key = "google"
            if key not in self._providers:
                self._providers[key] = GoogleProvider()
            return self._providers[key]
        else:
            # Default to Claude Sonnet
            key = "anthropic_default"
            if key not in self._providers:
                self._providers[key] = AnthropicProvider()
            return self._providers[key]

    def _route_model(self, message: str, preferred: AIModel) -> AIModel:
        """Auto-route to the most appropriate model based on task."""
        if preferred != AIModel.AUTO:
            return preferred

        msg_lower = message.lower()
        if any(kw in msg_lower for kw in ["code", "function", "debug", "programming", "script"]):
            return AIModel.GPT4O
        elif any(kw in msg_lower for kw in ["analyse", "analyze", "summarise", "summarize", "document", "report"]):
            return AIModel.CLAUDE_SONNET
        elif any(kw in msg_lower for kw in ["image", "photo", "vision", "multimodal"]):
            return AIModel.GEMINI_PRO
        return AIModel.CLAUDE_SONNET

    async def _build_messages(self, conversation: Conversation, user_message: str) -> list[ChatMessage]:
        """Build message list with memory context injected."""
        messages: list[ChatMessage] = []

        # Inject memory context as system context
        memory_service = MemoryService(self.db)
        memories = await memory_service.semantic_search(
            user_id=self.user.id, query=user_message, limit=5
        )
        if memories:
            context = "\n".join([f"- {m['content']}" for m in memories])
            messages.append(ChatMessage(
                role="system",
                content=f"Relevant context from memory:\n{context}"
            ))

        # Add conversation history (last 20 messages)
        for msg in (conversation.messages or [])[-20:]:
            messages.append(ChatMessage(role=msg.role.value, content=msg.content))

        messages.append(ChatMessage(role="user", content=user_message))
        return messages

    async def chat(self, conversation: Conversation, user_message: str, model: AIModel) -> dict:
        routed_model = self._route_model(user_message, model)
        provider = self._get_provider(routed_model)
        messages = await self._build_messages(conversation, user_message)

        start = time.time()
        response = await provider.chat(messages, model=routed_model.value)
        latency_ms = int((time.time() - start) * 1000)

        # Persist user message and assistant response
        from services.conversation_service import ConversationService
        conv_service = ConversationService(self.db)
        await conv_service.add_message(conversation.id, MessageRole.USER, user_message)
        await conv_service.add_message(
            conversation.id,
            MessageRole.ASSISTANT,
            response["content"],
            model_used=routed_model,
            prompt_tokens=response.get("prompt_tokens", 0),
            completion_tokens=response.get("completion_tokens", 0),
            latency_ms=latency_ms,
        )

        return {
            "conversation_id": str(conversation.id),
            "message": response["content"],
            "model_used": routed_model.value,
            "tokens": {
                "prompt": response.get("prompt_tokens", 0),
                "completion": response.get("completion_tokens", 0),
            },
            "latency_ms": latency_ms,
        }

    async def stream_chat(
        self, conversation: Conversation, user_message: str, model: AIModel
    ) -> AsyncGenerator[dict, None]:
        routed_model = self._route_model(user_message, model)
        provider = self._get_provider(routed_model)
        messages = await self._build_messages(conversation, user_message)

        full_content = ""
        async for chunk in provider.stream_chat(messages, model=routed_model.value):
            full_content += chunk.get("delta", "")
            yield chunk

        # Persist after streaming completes
        from services.conversation_service import ConversationService
        conv_service = ConversationService(self.db)
        await conv_service.add_message(conversation.id, MessageRole.USER, user_message)
        await conv_service.add_message(
            conversation.id, MessageRole.ASSISTANT, full_content, model_used=routed_model
        )

    async def transcribe_audio(self, content: bytes, filename: str) -> str:
        provider = OpenAIProvider()
        return await provider.transcribe(content, filename)
