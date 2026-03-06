"""Reminder model."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.base import TimestampMixin, SoftDeleteMixin, UUIDMixin


class ReminderTriggerType(str, enum.Enum):
    TIME_BASED = "time_based"
    DEADLINE_BASED = "deadline_based"
    RECURRING = "recurring"


class ReminderChannel(str, enum.Enum):
    DESKTOP = "desktop"
    EMAIL = "email"
    IN_APP = "in_app"
    PUSH = "push"


class Reminder(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "reminders"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    task_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_type: Mapped[ReminderTriggerType] = mapped_column(Enum(ReminderTriggerType), nullable=False)
    # For time_based: the exact datetime; for deadline_based: offset_minutes before task due; for recurring: cron expression
    trigger_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    offset_minutes: Mapped[int | None] = mapped_column(nullable=True)
    recurrence_cron: Mapped[str | None] = mapped_column(String(100), nullable=True)
    channels: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_fire_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_fired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="reminders")
    task = relationship("Task", back_populates="reminders")
