"""Task management routes."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from models.task import TaskPriority, TaskStatus
from models.user import User
from services.task_service import TaskService

router = APIRouter()


# ─── Serialiser ───────────────────────────────────────────────────────────────

def _task(t) -> dict:
    return {
        "id": str(t.id),
        "title": t.title,
        "description": t.description,
        "priority": t.priority.value if hasattr(t.priority, "value") else t.priority,
        "status": t.status.value if hasattr(t.status, "value") else t.status,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "tags": t.tags or [],
        "recurrence": t.recurrence,
        "linked_page_id": str(t.linked_page_id) if t.linked_page_id else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


# ─── Request models ───────────────────────────────────────────────────────────

class CreateTaskRequest(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    due_date: Optional[datetime] = None
    tags: List[str] = []
    linked_page_id: Optional[UUID] = None
    recurrence: Optional[dict] = None


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    linked_page_id: Optional[UUID] = None
    recurrence: Optional[dict] = None


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
async def list_tasks(
    status: Optional[TaskStatus] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    due_before: Optional[datetime] = Query(None),
    tag: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    tasks = await service.list_tasks(
        user_id=current_user.id,
        status=status,
        priority=priority,
        due_before=due_before,
        tag=tag,
        skip=skip,
        limit=limit,
    )
    return {"tasks": [_task(t) for t in tasks], "total": len(tasks)}


@router.post("", status_code=201)
async def create_task(
    body: CreateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    task = await service.create_task(
        user_id=current_user.id,
        **body.model_dump(),
    )
    return _task(task)


@router.get("/today")
async def get_todays_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    tasks = await service.get_todays_tasks(current_user.id)
    return {"tasks": [_task(t) for t in tasks]}


@router.get("/{task_id}")
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    task = await service.get_task(task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task(task)


@router.patch("/{task_id}")
async def update_task(
    task_id: UUID,
    body: UpdateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    task = await service.update_task(
        task_id=task_id,
        user_id=current_user.id,
        **body.model_dump(exclude_none=True),
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task(task)


@router.post("/{task_id}/complete")
async def complete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    task = await service.complete_task(task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    await service.delete_task(task_id, current_user.id)
