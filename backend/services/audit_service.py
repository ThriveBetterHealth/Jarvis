"""Audit logging service."""

import hashlib
import json
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.audit import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: str,
        user_id: Optional[UUID] = None,
        target_entity_type: Optional[str] = None,
        target_entity_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        metadata: dict = None,
    ):
        payload = json.dumps(metadata or {}, sort_keys=True, default=str)
        payload_hash = hashlib.sha256(payload.encode()).hexdigest()

        entry = AuditLog(
            user_id=user_id,
            action_type=action,
            target_entity_type=target_entity_type,
            target_entity_id=target_entity_id,
            ip_address=ip_address,
            payload_hash=payload_hash,
            metadata_=metadata or {},
        )
        self.db.add(entry)
        await self.db.flush()

    async def list_logs(
        self,
        user_id: Optional[UUID] = None,
        action_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list:
        q = select(AuditLog)
        if user_id:
            q = q.where(AuditLog.user_id == user_id)
        if action_type:
            q = q.where(AuditLog.action_type == action_type)
        q = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()
