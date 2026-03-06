"""Dashboard / daily briefing service."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.notebook import Page
from models.reminder import Reminder
from models.task import Task, TaskStatus
from models.user import User
from services.ai.providers.anthropic_provider import AnthropicProvider
from services.ai.providers.base import ChatMessage


class DashboardService:
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user

    async def get_task_summary(self) -> dict:
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == self.user.id,
                Task.deleted_at.is_(None),
                Task.status.not_in([TaskStatus.DONE, TaskStatus.CANCELLED]),
            ).order_by(Task.due_date.asc().nullslast())
        )
        tasks = result.scalars().all()

        by_priority = {}
        for task in tasks:
            p = task.priority.value
            by_priority.setdefault(p, []).append({
                "id": str(task.id),
                "title": task.title,
                "status": task.status.value,
                "due_date": task.due_date.isoformat() if task.due_date else None,
            })

        return {"tasks_by_priority": by_priority, "total_active": len(tasks)}

    async def get_recent_notes(self) -> dict:
        result = await self.db.execute(
            select(Page)
            .where(Page.user_id == self.user.id, Page.deleted_at.is_(None))
            .order_by(Page.updated_at.desc())
            .limit(5)
        )
        pages = result.scalars().all()
        return {
            "pages": [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "updated_at": p.updated_at.isoformat(),
                    "workspace_id": str(p.workspace_id),
                }
                for p in pages
            ]
        }

    async def get_upcoming_reminders(self) -> dict:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Reminder)
            .where(
                Reminder.user_id == self.user.id,
                Reminder.deleted_at.is_(None),
                Reminder.is_acknowledged == False,
                Reminder.next_fire_at >= now,
            )
            .order_by(Reminder.next_fire_at.asc())
            .limit(5)
        )
        reminders = result.scalars().all()
        return {
            "reminders": [
                {
                    "id": str(r.id),
                    "title": r.title,
                    "next_fire_at": r.next_fire_at.isoformat() if r.next_fire_at else None,
                }
                for r in reminders
            ]
        }

    async def generate_briefing(self) -> dict:
        tasks_data = await self.get_task_summary()
        notes_data = await self.get_recent_notes()
        reminders_data = await self.get_upcoming_reminders()

        # Generate AI insights
        provider = AnthropicProvider()
        context = f"""
Tasks summary: {tasks_data['total_active']} active tasks.
By priority: {tasks_data['tasks_by_priority']}
Recent notes: {[n['title'] for n in notes_data['pages']]}
Upcoming reminders: {[r['title'] for r in reminders_data['reminders']]}
"""
        messages = [
            ChatMessage(
                role="system",
                content="You are Jarvis. Generate a concise daily briefing (3-5 sentences) covering key priorities, overdue items, upcoming deadlines, and any patterns you notice. Be direct and actionable.",
            ),
            ChatMessage(role="user", content=f"Today is {datetime.now(timezone.utc).strftime('%A, %B %d %Y')}.\n{context}"),
        ]
        try:
            response = await provider.chat(messages)
            ai_insights = response["content"]
        except Exception:
            ai_insights = "Unable to generate AI insights at this time."

        return {
            "date": datetime.now(timezone.utc).isoformat(),
            "tasks": tasks_data,
            "recent_notes": notes_data,
            "upcoming_reminders": reminders_data,
            "ai_insights": ai_insights,
        }
