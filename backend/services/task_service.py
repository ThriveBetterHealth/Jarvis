"""Task service."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.task import Task, TaskPriority, TaskStatus, TaskCreatedBy


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_tasks(
        self,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        due_before: Optional[datetime] = None,
        tag: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list:
        q = select(Task).where(Task.user_id == user_id, Task.deleted_at.is_(None))
        if status:
            q = q.where(Task.status == status)
        if priority:
            q = q.where(Task.priority == priority)
        if due_before:
            q = q.where(Task.due_date <= due_before)
        if tag:
            q = q.where(Task.tags.contains([tag]))
        q = q.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def get_todays_tasks(self, user_id: UUID) -> list:
        today = datetime.now(timezone.utc).date()
        tomorrow = datetime(today.year, today.month, today.day + 1, tzinfo=timezone.utc) if today.day < 28 else None
        q = select(Task).where(
            Task.user_id == user_id,
            Task.deleted_at.is_(None),
            Task.status.not_in([TaskStatus.DONE, TaskStatus.CANCELLED]),
        )
        result = await self.db.execute(q.order_by(Task.priority.desc()))
        return result.scalars().all()

    async def create_task(self, user_id: UUID, **kwargs) -> Task:
        task = Task(user_id=user_id, **kwargs)
        self.db.add(task)
        await self.db.flush()
        return task

    async def get_task(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id, Task.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def update_task(self, task_id: UUID, user_id: UUID, **kwargs) -> Optional[Task]:
        task = await self.get_task(task_id, user_id)
        if not task:
            return None
        for key, value in kwargs.items():
            if hasattr(task, key):
                setattr(task, key, value)
        await self.db.flush()
        return task

    async def complete_task(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        task = await self.get_task(task_id, user_id)
        if not task:
            return None
        task.status = TaskStatus.DONE
        task.completed_at = datetime.now(timezone.utc)
        await self.db.flush()
        return task

    async def delete_task(self, task_id: UUID, user_id: UUID):
        task = await self.get_task(task_id, user_id)
        if task:
            task.soft_delete()
            await self.db.flush()
