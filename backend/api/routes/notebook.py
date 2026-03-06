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
    return {"workspaces": workspaces}


@router.post("/workspaces")
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
    return workspace


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
    return {"pages": pages}


@router.post("/pages")
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
    return page


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
    return page


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
    return page


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
    return {"versions": versions}


# ─── Search ──────────────────────────────────────────────────────────────────

@router.get("/search")
async def search_pages(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotebookService(db)
    results = await service.search(current_user.id, q)
    return {"results": results}


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
