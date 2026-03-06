"""AI Memory service using pgvector."""

import json
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from models.memory import MemorySourceType, MemoryVector


class MemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_embedding(self, text_content: str) -> list[float]:
        """Generate embedding via OpenAI."""
        try:
            from openai import AsyncOpenAI
            from core.config import settings
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=text_content[:8000],
            )
            return response.data[0].embedding
        except Exception:
            # Return zero vector as fallback (1536 dims for text-embedding-3-small)
            return [0.0] * 1536

    async def store_memory(
        self,
        user_id: UUID,
        content: str,
        source_type: MemorySourceType,
        source_id: Optional[UUID] = None,
        metadata: dict = None,
    ) -> MemoryVector:
        embedding = await self._get_embedding(content)
        vector = MemoryVector(
            user_id=user_id,
            source_type=source_type,
            source_id=source_id,
            content=content,
            metadata_=metadata or {},
        )
        self.db.add(vector)
        await self.db.flush()

        # Update the embedding column (pgvector)
        await self.db.execute(
            text("UPDATE memory_vectors SET embedding = :emb WHERE id = :id"),
            {"emb": str(embedding), "id": str(vector.id)},
        )
        return vector

    async def semantic_search(
        self,
        user_id: UUID,
        query: str,
        limit: int = 5,
        source_type: Optional[MemorySourceType] = None,
    ) -> list[dict]:
        embedding = await self._get_embedding(query)
        emb_str = str(embedding)

        conditions = "user_id = :uid AND deleted_at IS NULL"
        params = {"uid": str(user_id), "emb": emb_str, "limit": limit}
        if source_type:
            conditions += " AND source_type = :st"
            params["st"] = source_type.value

        result = await self.db.execute(
            text(
                f"""
                SELECT id, content, source_type, metadata, importance_score,
                       embedding <=> :emb::vector AS distance
                FROM memory_vectors
                WHERE {conditions}
                ORDER BY distance ASC
                LIMIT :limit
                """
            ),
            params,
        )
        rows = result.fetchall()
        return [
            {
                "id": str(row.id),
                "content": row.content,
                "source_type": row.source_type,
                "metadata": row.metadata,
                "relevance_score": 1.0 - float(row.distance),
            }
            for row in rows
        ]

    async def list_memories(
        self, user_id: UUID, source_type: Optional[MemorySourceType] = None, limit: int = 20
    ) -> list:
        from sqlalchemy import select
        q = select(MemoryVector).where(
            MemoryVector.user_id == user_id, MemoryVector.deleted_at.is_(None)
        )
        if source_type:
            q = q.where(MemoryVector.source_type == source_type)
        q = q.order_by(MemoryVector.created_at.desc()).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def delete_memory(self, memory_id: UUID, user_id: UUID):
        from sqlalchemy import select
        result = await self.db.execute(
            select(MemoryVector).where(
                MemoryVector.id == memory_id, MemoryVector.user_id == user_id
            )
        )
        mem = result.scalar_one_or_none()
        if mem:
            mem.soft_delete()
            await self.db.flush()

    async def clear_all(self, user_id: UUID):
        from datetime import datetime, timezone
        await self.db.execute(
            text("UPDATE memory_vectors SET deleted_at = NOW() WHERE user_id = :uid AND deleted_at IS NULL"),
            {"uid": str(user_id)},
        )
