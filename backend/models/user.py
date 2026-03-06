"""User model."""

import enum

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.base import TimestampMixin, SoftDeleteMixin, UUIDMixin


class UserRole(str, enum.Enum):
    OWNER = "owner"
    USER = "user"
    READ_ONLY = "read_only"


class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        # create_type=False: the 'userrole' enum is created by migration 002.
        # values_callable: use enum .value ("owner") not .name ("OWNER") so
        # the string sent to PostgreSQL matches the lowercase enum labels.
        Enum(
            UserRole,
            name="userrole",
            create_type=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        default=UserRole.OWNER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # MFA
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[str | None] = mapped_column(Text, nullable=True)  # stored encrypted

    # Preferences (model choices, UI settings, etc.)
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Refresh token tracking (jti of last issued refresh token)
    active_refresh_jti: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Relationships
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    files = relationship("File", back_populates="user", cascade="all, delete-orphan")
    memory_vectors = relationship("MemoryVector", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
