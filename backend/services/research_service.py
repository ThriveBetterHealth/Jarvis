"""Research agent service."""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.research import ResearchJob, ResearchStatus


class ResearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_jobs(self, user_id: UUID, skip: int = 0, limit: int = 20) -> list:
        result = await self.db.execute(
            select(ResearchJob)
            .where(ResearchJob.user_id == user_id, ResearchJob.deleted_at.is_(None))
            .order_by(ResearchJob.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def submit(self, user_id: UUID, brief: str, save_to_notebook: bool = True) -> ResearchJob:
        job = ResearchJob(
            user_id=user_id,
            brief=brief,
            status=ResearchStatus.QUEUED,
        )
        self.db.add(job)
        await self.db.flush()

        # Enqueue background task
        try:
            from workers.main import enqueue_research
            arq_job = await enqueue_research(str(job.id), str(user_id), brief, save_to_notebook)
            if arq_job:
                job.arq_job_id = arq_job.job_id
                await self.db.flush()
        except Exception:
            pass  # Worker may not be available; job will be picked up when available

        return job

    async def get_job(self, job_id: UUID, user_id: UUID) -> Optional[ResearchJob]:
        result = await self.db.execute(
            select(ResearchJob).where(
                ResearchJob.id == job_id,
                ResearchJob.user_id == user_id,
                ResearchJob.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def cancel_job(self, job_id: UUID, user_id: UUID):
        job = await self.get_job(job_id, user_id)
        if job and job.status in (ResearchStatus.QUEUED, ResearchStatus.RUNNING):
            job.status = ResearchStatus.CANCELLED
            await self.db.flush()
