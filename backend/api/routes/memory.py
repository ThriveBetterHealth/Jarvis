"""AI Memory routes."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from models.memory import MemorySourceType
from models.user import User
from services.memory_service import MemoryService

router = APIRouter()


class SearchMemoryRequest(BaseModel):
    query: str
    limit: int = 5
    source_type: Optional[MemorySourceType] = None


@router.get("")
async def list_memories(
    source_type: Optional[MemorySourceType] = Query(None),
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    memories = await service.list_memories(current_user.id, source_type=source_type, limit=limit)
    return {"memories": memories}


@router.post("/search")
async def search_memory(
    body: SearchMemoryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Semantic search over memory vectors."""
    service = MemoryService(db)
    results = await service.semantic_search(
        user_id=current_user.id,
        query=body.query,
        limit=body.limit,
        source_type=body.source_type,
    )
    return {"results": results}


@router.delete("/{memory_id}", status_code=204)
async def delete_memory(
    memory_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    await service.delete_memory(memory_id, current_user.id)


@router.delete("", status_code=204)
async def clear_all_memory(
    confirm: str = Query(..., description="Must be 'yes-clear-all'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if confirm != "yes-clear-all":
        return
    service = MemoryService(db)
    await service.clear_all(current_user.id)
