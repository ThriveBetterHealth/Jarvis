"""Notebook models: Workspace, Page, PageVersion."""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.base import TimestampMixin, SoftDeleteMixin, UUIDMixin


class Workspace(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "workspaces"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    user = relationship("User", back_populates="workspaces")
    pages = relationship("Page", back_populates="workspace", cascade="all, delete-orphan")


class Page(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "pages"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("pages.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="Untitled")
    # Block-based content stored as JSONB array of typed blocks
    blocks: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(default=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    current_version: Mapped[int] = mapped_column(Integer, default=1)

    workspace = relationship("Workspace", back_populates="pages")
    children = relationship("Page", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Page", back_populates="children", remote_side="Page.id")
    versions = relationship("PageVersion", back_populates="page", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="linked_page")


class PageVersion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "page_versions"

    page_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pages.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    blocks: Mapped[list] = mapped_column(JSONB, nullable=False)

    page = relationship("Page", back_populates="versions")
