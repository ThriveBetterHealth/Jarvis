"""Dashboard routes - daily briefing and widget data."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/briefing")
async def get_daily_briefing(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and return the daily briefing."""
    service = DashboardService(db, current_user)
    briefing = await service.generate_briefing()
    return briefing


@router.get("/widgets/tasks")
async def get_task_widget(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db, current_user)
    return await service.get_task_summary()


@router.get("/widgets/notes")
async def get_recent_notes_widget(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db, current_user)
    return await service.get_recent_notes()


@router.get("/widgets/reminders")
async def get_upcoming_reminders_widget(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db, current_user)
    return await service.get_upcoming_reminders()
