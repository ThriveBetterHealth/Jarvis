"""Research job model."""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from models.base import TimestampMixin, SoftDeleteMixin, UUIDMixin


class ResearchStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ResearchJob(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "research_jobs"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    brief: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ResearchStatus] = mapped_column(Enum(ResearchStatus), default=ResearchStatus.QUEUED, nullable=False, index=True)
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sub_questions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    sources: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    report_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_page_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)  # linked notebook page
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    arq_job_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
