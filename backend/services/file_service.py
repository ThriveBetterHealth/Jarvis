"""File storage service."""

import os
import uuid
from typing import Optional
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.file import File
from models.user import User


class FileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upload(self, user: User, file: UploadFile) -> File:
        content = await file.read()
        stored_name = f"{uuid.uuid4()}{os.path.splitext(file.filename or '')[1]}"
        user_dir = os.path.join(settings.FILE_STORAGE_PATH, str(user.id))
        os.makedirs(user_dir, exist_ok=True)
        storage_path = os.path.join(user_dir, stored_name)

        with open(storage_path, "wb") as f:
            f.write(content)

        file_record = File(
            user_id=user.id,
            original_name=file.filename or "upload",
            stored_name=stored_name,
            mime_type=file.content_type or "application/octet-stream",
            size_bytes=len(content),
            storage_path=storage_path,
        )
        self.db.add(file_record)
        await self.db.flush()
        return file_record

    async def get(self, file_id: UUID, user_id: UUID) -> Optional[File]:
        result = await self.db.execute(
            select(File).where(
                File.id == file_id,
                File.user_id == user_id,
                File.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_versions(self, file_id: UUID, user_id: UUID) -> list:
        f = await self.get(file_id, user_id)
        if not f:
            return []
        result = await self.db.execute(
            select(File)
            .where(File.parent_file_id == file_id, File.deleted_at.is_(None))
            .order_by(File.version.desc())
        )
        return result.scalars().all()

    async def delete(self, file_id: UUID, user_id: UUID):
        f = await self.get(file_id, user_id)
        if f:
            f.soft_delete()
            await self.db.flush()
