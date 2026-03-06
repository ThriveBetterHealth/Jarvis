"""Reminder routes."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from models.reminder import ReminderChannel, ReminderTriggerType
from models.user import User
from services.reminder_service import ReminderService

router = APIRouter()


class CreateReminderRequest(BaseModel):
    title: str
    body: Optional[str] = None
    trigger_type: ReminderTriggerType
    task_id: Optional[UUID] = None
    trigger_at: Optional[datetime] = None
    offset_minutes: Optional[int] = None
    recurrence_cron: Optional[str] = None
    channels: List[ReminderChannel] = [ReminderChannel.IN_APP, ReminderChannel.DESKTOP]


class UpdateReminderRequest(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    trigger_at: Optional[datetime] = None
    offset_minutes: Optional[int] = None
    recurrence_cron: Optional[str] = None
    channels: Optional[List[ReminderChannel]] = None


@router.get("")
async def list_reminders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    acknowledged: Optional[bool] = None,
):
    service = ReminderService(db)
    reminders = await service.list_reminders(current_user.id, acknowledged=acknowledged)
    return {"reminders": reminders}


@router.post("")
async def create_reminder(
    body: CreateReminderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReminderService(db)
    reminder = await service.create_reminder(user_id=current_user.id, **body.model_dump())
    return reminder


@router.patch("/{reminder_id}")
async def update_reminder(
    reminder_id: UUID,
    body: UpdateReminderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReminderService(db)
    reminder = await service.update_reminder(
        reminder_id=reminder_id,
        user_id=current_user.id,
        **body.model_dump(exclude_none=True),
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


@router.post("/{reminder_id}/acknowledge")
async def acknowledge_reminder(
    reminder_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReminderService(db)
    reminder = await service.acknowledge(reminder_id, current_user.id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReminderService(db)
    await service.delete_reminder(reminder_id, current_user.id)
