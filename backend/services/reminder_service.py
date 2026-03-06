"""Reminder service."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.reminder import Reminder


class ReminderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_reminders(self, user_id: UUID, acknowledged: Optional[bool] = None) -> list:
        q = select(Reminder).where(Reminder.user_id == user_id, Reminder.deleted_at.is_(None))
        if acknowledged is not None:
            q = q.where(Reminder.is_acknowledged == acknowledged)
        q = q.order_by(Reminder.trigger_at.asc().nullslast())
        result = await self.db.execute(q)
        return result.scalars().all()

    async def create_reminder(self, user_id: UUID, **kwargs) -> Reminder:
        reminder = Reminder(user_id=user_id, **kwargs)
        self.db.add(reminder)
        await self.db.flush()
        return reminder

    async def get_reminder(self, reminder_id: UUID, user_id: UUID) -> Optional[Reminder]:
        result = await self.db.execute(
            select(Reminder).where(
                Reminder.id == reminder_id,
                Reminder.user_id == user_id,
                Reminder.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def update_reminder(self, reminder_id: UUID, user_id: UUID, **kwargs) -> Optional[Reminder]:
        reminder = await self.get_reminder(reminder_id, user_id)
        if not reminder:
            return None
        for key, value in kwargs.items():
            if hasattr(reminder, key):
                setattr(reminder, key, value)
        await self.db.flush()
        return reminder

    async def acknowledge(self, reminder_id: UUID, user_id: UUID) -> Optional[Reminder]:
        reminder = await self.get_reminder(reminder_id, user_id)
        if not reminder:
            return None
        reminder.is_acknowledged = True
        reminder.acknowledged_at = datetime.now(timezone.utc)
        await self.db.flush()
        return reminder

    async def delete_reminder(self, reminder_id: UUID, user_id: UUID):
        reminder = await self.get_reminder(reminder_id, user_id)
        if reminder:
            reminder.soft_delete()
            await self.db.flush()

    async def get_due_reminders(self) -> list:
        """Fetch unacknowledged reminders that are due (for worker)."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Reminder).where(
                Reminder.is_acknowledged.is_(False),
                Reminder.deleted_at.is_(None),
                Reminder.next_fire_at <= now,
            )
        )
        return result.scalars().all()
