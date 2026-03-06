"""User service."""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email.lower(), User.deleted_at.is_(None)))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[User]:
        result = await self.db.execute(select(User).where(User.deleted_at.is_(None)))
        return result.scalars().all()

    async def update_refresh_jti(self, user_id: UUID, jti: Optional[str]):
        user = await self.get_by_id(user_id)
        if user:
            user.active_refresh_jti = jti
            await self.db.flush()

    async def enable_mfa(self, user_id: UUID, encrypted_secret: str):
        user = await self.get_by_id(user_id)
        if user:
            user.mfa_enabled = True
            user.mfa_secret = encrypted_secret
            await self.db.flush()

    async def disable_mfa(self, user_id: UUID):
        user = await self.get_by_id(user_id)
        if user:
            user.mfa_enabled = False
            user.mfa_secret = None
            await self.db.flush()

    async def update_preferences(self, user_id: UUID, preferences: dict):
        user = await self.get_by_id(user_id)
        if user:
            user.preferences = {**user.preferences, **preferences}
            await self.db.flush()
