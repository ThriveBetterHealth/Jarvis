"""Document and DocumentAnalysis models."""

import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.base import TimestampMixin, SoftDeleteMixin, UUIDMixin


class DocumentType(str, enum.Enum):
    PDF = "pdf"
    DOCX = "docx"
    IMAGE = "image"
    CSV = "csv"
    JSON = "json"
    XLSX = "xlsx"
    TEXT = "text"


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=False)
    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="documents")
    file = relationship("File")
    analyses = relationship("DocumentAnalysis", back_populates="document", cascade="all, delete-orphan")


class DocumentAnalysis(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_analyses"

    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    status: Mapped[AnalysisStatus] = mapped_column(Enum(AnalysisStatus), default=AnalysisStatus.PENDING, nullable=False)
    analysis_type: Mapped[str] = mapped_column(String(50), default="general", nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_insights: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    risks: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    action_items: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    raw_tables: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    processing_time_ms: Mapped[int] = mapped_column(Integer, default=0)

    document = relationship("Document", back_populates="analyses")
