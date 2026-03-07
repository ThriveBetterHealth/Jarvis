"""Notebook routes - workspaces, pages, blocks."""

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from services.notebook_service import NotebookService
from services.ai.notebook_ai import NotebookAIService

router = APIRouter()


# ─── Serialisers ─────────────────────────────────────────────────────────────

def _ws(ws) -> dict:
    return {
        "id": str(ws.id),
        "name": ws.name,
        "description": ws.description,
        "icon": ws.icon,
        "sort_order": ws.sort_order,
        "created_at": ws.created_at.isoformat() if ws.created_at else None,
        "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
    }


def _page(p) -> dict:
    return {
        "id": str(p.id),
        "workspace_id": str(p.workspace_id),
        "parent_id": str(p.parent_id) if p.parent_id else None,
        "title": p.title,
        "blocks": p.blocks or [],
        "tags": p.tags or [],
        "icon": p.icon,
        "word_count": p.word_count,
        "current_version": p.current_version,
        "is_published": p.is_published,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _version(v) -> dict:
    return {
        "id": str(v.id),
        "page_id": str(v.page_id),
        "version_number": v.version_number,
        "title": v.title,
        "blocks": v.blocks or [],
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


# ─── Request models ───────────────────────────────────────────────────────────

class CreateWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None


class CreatePageRequest(BaseModel):
    workspace_id: UUID
    parent_id: Optional[UUID] = None
    title: str = "Untitled"
    blocks: List[Dict[str, Any]] = []
    tags: List[str] = []


class UpdatePageRequest(BaseModel):
    title: Optional[str] = None
    blocks: Optional[List[Dict[str, Any]]] = None
    tags: Optional[List[str]] = None
    icon: Optional[str] = None


# ─── Workspaces ──────────────────────────────────────────────────────────────

@router.get("/workspaces")
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    workspaces = await service.list_workspaces(current_user.id)
    return {"workspaces": [_ws(w) for w in workspaces]}


@router.post("/workspaces", status_code=201)
async def create_workspace(
    body: CreateWorkspaceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    workspace = await service.create_workspace(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        icon=body.icon,
    )
    return _ws(workspace)


@router.delete("/workspaces/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    await service.delete_workspace(workspace_id, current_user.id)


# ─── Pages ───────────────────────────────────────────────────────────────────

@router.get("/pages")
async def list_pages(
    workspace_id: Optional[UUID] = Query(None),
    parent_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    pages = await service.list_pages(current_user.id, workspace_id=workspace_id, parent_id=parent_id)
    return {"pages": [_page(p) for p in pages]}


@router.post("/pages", status_code=201)
async def create_page(
    body: CreatePageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    page = await service.create_page(
        user_id=current_user.id,
        workspace_id=body.workspace_id,
        parent_id=body.parent_id,
        title=body.title,
        blocks=body.blocks,
        tags=body.tags,
    )
    return _page(page)


@router.get("/pages/{page_id}")
async def get_page(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    page = await service.get_page(page_id, current_user.id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return _page(page)


@router.patch("/pages/{page_id}")
async def update_page(
    page_id: UUID,
    body: UpdatePageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    page = await service.update_page(
        page_id=page_id,
        user_id=current_user.id,
        title=body.title,
        blocks=body.blocks,
        tags=body.tags,
        icon=body.icon,
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return _page(page)


@router.delete("/pages/{page_id}", status_code=204)
async def delete_page(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    await service.delete_page(page_id, current_user.id)


@router.get("/pages/{page_id}/versions")
async def get_page_versions(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    versions = await service.get_versions(page_id, current_user.id)
    return {"versions": [_version(v) for v in versions]}


# ─── Search ──────────────────────────────────────────────────────────────────

@router.get("/search")
async def search_pages(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    results = await service.search(current_user.id, q)
    return {"results": [_page(p) for p in results]}


# ─── AI Functions ────────────────────────────────────────────────────────────

@router.post("/pages/{page_id}/summarise")
async def summarise_page(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    page = await service.get_page(page_id, current_user.id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    ai_service = NotebookAIService(db, current_user)
    summary = await ai_service.summarise(page)
    return {"summary": summary}


@router.post("/pages/{page_id}/generate-tasks")
async def generate_tasks_from_page(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    page = await service.get_page(page_id, current_user.id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    ai_service = NotebookAIService(db, current_user)
    tasks = await ai_service.generate_tasks(page)
    return {"tasks": tasks}


@router.post("/pages/{page_id}/extract-insights")
async def extract_insights(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    page = await service.get_page(page_id, current_user.id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    ai_service = NotebookAIService(db, current_user)
    insights = await ai_service.extract_insights(page)
    return {"insights": insights}
