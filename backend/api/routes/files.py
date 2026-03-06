"""File storage routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from services.file_service import FileService

router = APIRouter()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FileService(db)
    stored = await service.upload(user=current_user, file=file)
    return stored


@router.get("/{file_id}")
async def get_file_metadata(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FileService(db)
    f = await service.get(file_id, current_user.id)
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f


@router.get("/{file_id}/download")
async def download_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FileService(db)
    f = await service.get(file_id, current_user.id)
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(f.storage_path, filename=f.original_name, media_type=f.mime_type)


@router.get("/{file_id}/versions")
async def get_file_versions(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FileService(db)
    versions = await service.get_versions(file_id, current_user.id)
    return {"versions": versions}


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FileService(db)
    await service.delete(file_id, current_user.id)
