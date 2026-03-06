"""Conversation service."""

import uuid
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.conversation import AIModel, Conversation, Message, MessageRole


class ConversationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_for_user(self, user_id: UUID, skip: int = 0, limit: int = 50) -> list:
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.deleted_at.is_(None))
            .order_by(Conversation.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def create(
        self,
        user_id: UUID,
        title: str = "New Conversation",
        model: AIModel = AIModel.AUTO,
        system_prompt: Optional[str] = None,
    ) -> Conversation:
        conv = Conversation(
            user_id=user_id,
            title=title,
            model=model,
            system_prompt=system_prompt,
        )
        self.db.add(conv)
        await self.db.flush()
        return conv

    async def get(self, conversation_id: UUID, user_id: UUID) -> Optional[Conversation]:
        result = await self.db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
                Conversation.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, conversation_id: UUID, user_id: UUID):
        from datetime import datetime, timezone
        conv = await self.get(conversation_id, user_id)
        if conv:
            conv.deleted_at = datetime.now(timezone.utc)
            await self.db.flush()

    async def add_message(
        self,
        conversation_id: UUID,
        role: MessageRole,
        content: str,
        model_used: Optional[AIModel] = None,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        latency_ms: int = 0,
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            model_used=model_used,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
        )
        self.db.add(msg)
        await self.db.flush()
        return msg
