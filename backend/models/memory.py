"""AI Memory Vector model using pgvector."""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.base import TimestampMixin, SoftDeleteMixin, UUIDMixin


class MemorySourceType(str, enum.Enum):
    CONVERSATION = "conversation"
    NOTE = "note"
    TASK = "task"
    DOCUMENT = "document"
    PREFERENCE = "preference"
    CONTACT = "contact"


class MemoryVector(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "memory_vectors"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    source_type: Mapped[MemorySourceType] = mapped_column(Enum(MemorySourceType), nullable=False, index=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # embedding column added via raw SQL in migration (pgvector type)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    importance_score: Mapped[float] = mapped_column(default=1.0, nullable=False)

    user = relationship("User", back_populates="memory_vectors")
