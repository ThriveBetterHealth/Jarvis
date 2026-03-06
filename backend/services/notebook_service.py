"""Notebook service - workspaces, pages, versions."""

from typing import Optional
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.notebook import Page, PageVersion, Workspace

MAX_VERSIONS = 5


class NotebookService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Workspaces ──────────────────────────────────────────────────────────

    async def list_workspaces(self, user_id: UUID) -> list:
        result = await self.db.execute(
            select(Workspace)
            .where(Workspace.user_id == user_id, Workspace.deleted_at.is_(None))
            .order_by(Workspace.sort_order, Workspace.created_at)
        )
        return result.scalars().all()

    async def create_workspace(self, user_id: UUID, name: str, description=None, icon=None) -> Workspace:
        ws = Workspace(user_id=user_id, name=name, description=description, icon=icon)
        self.db.add(ws)
        await self.db.flush()
        return ws

    async def delete_workspace(self, workspace_id: UUID, user_id: UUID):
        result = await self.db.execute(
            select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == user_id)
        )
        ws = result.scalar_one_or_none()
        if ws:
            ws.soft_delete()
            await self.db.flush()

    # ─── Pages ───────────────────────────────────────────────────────────────

    async def list_pages(self, user_id: UUID, workspace_id=None, parent_id=None) -> list:
        q = select(Page).where(Page.user_id == user_id, Page.deleted_at.is_(None))
        if workspace_id:
            q = q.where(Page.workspace_id == workspace_id)
        if parent_id is not None:
            q = q.where(Page.parent_id == parent_id)
        q = q.order_by(Page.sort_order, Page.created_at)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def create_page(
        self,
        user_id: UUID,
        workspace_id: UUID,
        parent_id=None,
        title: str = "Untitled",
        blocks: list = None,
        tags: list = None,
    ) -> Page:
        page = Page(
            user_id=user_id,
            workspace_id=workspace_id,
            parent_id=parent_id,
            title=title,
            blocks=blocks or [],
            tags=tags or [],
        )
        self.db.add(page)
        await self.db.flush()
        return page

    async def get_page(self, page_id: UUID, user_id: UUID) -> Optional[Page]:
        result = await self.db.execute(
            select(Page).where(Page.id == page_id, Page.user_id == user_id, Page.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def update_page(self, page_id: UUID, user_id: UUID, **kwargs) -> Optional[Page]:
        page = await self.get_page(page_id, user_id)
        if not page:
            return None

        # Save version before update
        await self._save_version(page)

        for key, value in kwargs.items():
            if value is not None and hasattr(page, key):
                setattr(page, key, value)

        page.current_version += 1
        await self.db.flush()
        return page

    async def delete_page(self, page_id: UUID, user_id: UUID):
        page = await self.get_page(page_id, user_id)
        if page:
            page.soft_delete()
            await self.db.flush()

    async def _save_version(self, page: Page):
        version = PageVersion(
            page_id=page.id,
            version_number=page.current_version,
            title=page.title,
            blocks=page.blocks,
        )
        self.db.add(version)
        await self.db.flush()

        # Prune old versions (keep last 5)
        result = await self.db.execute(
            select(PageVersion)
            .where(PageVersion.page_id == page.id)
            .order_by(PageVersion.version_number.desc())
            .offset(MAX_VERSIONS)
        )
        old_versions = result.scalars().all()
        for v in old_versions:
            await self.db.delete(v)

    async def get_versions(self, page_id: UUID, user_id: UUID) -> list:
        page = await self.get_page(page_id, user_id)
        if not page:
            return []
        result = await self.db.execute(
            select(PageVersion)
            .where(PageVersion.page_id == page_id)
            .order_by(PageVersion.version_number.desc())
        )
        return result.scalars().all()

    async def search(self, user_id: UUID, query: str) -> list:
        # Simple title + tag search; semantic search is in MemoryService
        result = await self.db.execute(
            select(Page).where(
                Page.user_id == user_id,
                Page.deleted_at.is_(None),
                or_(
                    Page.title.ilike(f"%{query}%"),
                    Page.tags.cast(str).ilike(f"%{query}%"),
                ),
            ).limit(20)
        )
        return result.scalars().all()
