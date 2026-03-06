"""Research agent routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from services.research_service import ResearchService

router = APIRouter()


class ResearchBriefRequest(BaseModel):
    brief: str
    save_to_notebook: bool = True


@router.get("")
async def list_research_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    service = ResearchService(db)
    jobs = await service.list_jobs(current_user.id, skip=skip, limit=limit)
    return {"jobs": jobs}


@router.post("")
async def submit_research_brief(
    body: ResearchBriefRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a research brief. The agent runs asynchronously."""
    service = ResearchService(db)
    job = await service.submit(
        user_id=current_user.id,
        brief=body.brief,
        save_to_notebook=body.save_to_notebook,
    )
    return job


@router.get("/{job_id}")
async def get_research_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResearchService(db)
    job = await service.get_job(job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Research job not found")
    return job


@router.post("/{job_id}/cancel", status_code=204)
async def cancel_research_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResearchService(db)
    await service.cancel_job(job_id, current_user.id)
