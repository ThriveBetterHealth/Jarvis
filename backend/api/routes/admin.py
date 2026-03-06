"""Admin routes - system health, audit logs, user management."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_owner
from models.user import User
from services.audit_service import AuditService
from services.user_service import UserService

router = APIRouter()


@router.get("/health")
async def system_health(current_user: User = Depends(require_owner)):
    """System health overview."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": "production",
    }


@router.get("/audit-logs")
async def get_audit_logs(
    action_type: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    service = AuditService(db)
    logs = await service.list_logs(
        user_id=current_user.id,
        action_type=action_type,
        skip=skip,
        limit=limit,
    )
    return {"logs": logs, "total": len(logs)}


@router.get("/users")
async def list_users(
    current_user: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    users = await service.list_all()
    return {"users": users}


@router.patch("/users/{user_id}/preferences")
async def update_user_preferences(
    user_id: UUID,
    preferences: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Users can only update their own preferences unless owner
    if current_user.id != user_id and current_user.role.value != "owner":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    service = UserService(db)
    await service.update_preferences(user_id, preferences)
    return {"message": "Preferences updated"}
