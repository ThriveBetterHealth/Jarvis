"""ARQ background worker definitions."""

import json
from typing import Optional

import httpx
import structlog
from arq import create_pool
from arq.connections import RedisSettings

from core.config import settings

log = structlog.get_logger()

REDIS_SETTINGS = RedisSettings.from_dsn(settings.REDIS_URL)


async def research_agent_task(ctx, job_id: str, user_id: str, brief: str, save_to_notebook: bool):
    """Autonomous research agent: decomposes query, searches web, synthesises report."""
    log.info("research_agent.start", job_id=job_id)
    from core.database import AsyncSessionLocal
    from models.research import ResearchJob, ResearchStatus
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job or job.status == ResearchStatus.CANCELLED:
                return

            job.status = ResearchStatus.RUNNING
            job.progress_pct = 5
            await db.commit()

            # 1. Decompose brief into sub-questions
            from services.ai.providers.anthropic_provider import AnthropicProvider
            from services.ai.providers.base import ChatMessage
            provider = AnthropicProvider()

            decompose_response = await provider.chat([
                ChatMessage(role="system", content="You are a research agent. Break the given research brief into 3-5 focused sub-questions. Return a JSON array of question strings only."),
                ChatMessage(role="user", content=brief),
            ])
            try:
                sub_questions = json.loads(decompose_response["content"])
            except Exception:
                sub_questions = [brief]

            job.sub_questions = sub_questions
            job.progress_pct = 20
            await db.commit()

            # 2. Search and gather information for each sub-question
            sources = []
            search_results = []
            async with httpx.AsyncClient(timeout=30) as client:
                for question in sub_questions[:5]:
                    try:
                        # Use DuckDuckGo HTML search as a free search fallback
                        resp = await client.get(
                            "https://html.duckduckgo.com/html/",
                            params={"q": question},
                            headers={"User-Agent": "Jarvis Research Agent/1.0"},
                        )
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(resp.text, "html.parser")
                        for result_div in soup.select(".result__body")[:3]:
                            snippet = result_div.get_text(strip=True)
                            url_tag = result_div.find_previous("a", {"class": "result__url"})
                            url = url_tag.get_text(strip=True) if url_tag else ""
                            if snippet:
                                sources.append({"url": url, "snippet": snippet[:500], "question": question})
                                search_results.append(f"Q: {question}\nSnippet: {snippet[:300]}")
                    except Exception as e:
                        log.warning("research.search_failed", question=question, error=str(e))

            job.sources = sources
            job.progress_pct = 60
            await db.commit()

            # 3. Synthesise into report
            synthesis_context = "\n\n".join(search_results[:20])
            synthesis_response = await provider.chat([
                ChatMessage(
                    role="system",
                    content=(
                        "You are Jarvis, a research assistant. Synthesise the provided search results into a comprehensive, "
                        "well-structured research report in Markdown format. Include: Executive Summary, Key Findings, "
                        "Analysis, and Sources. Be factual and cite sources where possible."
                    ),
                ),
                ChatMessage(role="user", content=f"Research Brief: {brief}\n\nSearch Results:\n{synthesis_context}"),
            ])
            report_markdown = synthesis_response["content"]

            job.report_markdown = report_markdown
            job.progress_pct = 90
            await db.commit()

            # 4. Save to notebook if requested
            if save_to_notebook:
                from services.notebook_service import NotebookService
                from sqlalchemy import select as sa_select
                from models.notebook import Workspace
                from uuid import UUID

                nb_service = NotebookService(db)
                uid = UUID(user_id)
                workspaces = await nb_service.list_workspaces(uid)
                ws = workspaces[0] if workspaces else await nb_service.create_workspace(uid, "Research")
                page = await nb_service.create_page(
                    user_id=uid,
                    workspace_id=ws.id,
                    title=f"Research: {brief[:80]}",
                    blocks=[{"type": "markdown", "content": report_markdown}],
                    tags=["research", "ai-generated"],
                )
                from uuid import UUID as Uuid
                job.output_page_id = page.id

            job.status = ResearchStatus.COMPLETED
            job.progress_pct = 100
            await db.commit()
            log.info("research_agent.complete", job_id=job_id)

        except Exception as e:
            log.error("research_agent.failed", job_id=job_id, error=str(e))
            result = await db.execute(select(ResearchJob).where(ResearchJob.id == job_id))
            job = result.scalar_one_or_none()
            if job:
                job.status = ResearchStatus.FAILED
                job.error_message = str(e)
                await db.commit()


async def process_reminders_task(ctx):
    """Fire due reminders."""
    from core.database import AsyncSessionLocal
    from services.reminder_service import ReminderService
    from services.notifications.email_notifier import EmailNotifier

    async with AsyncSessionLocal() as db:
        service = ReminderService(db)
        due = await service.get_due_reminders()
        notifier = EmailNotifier()
        for reminder in due:
            try:
                await notifier.send(reminder)
            except Exception as e:
                log.warning("reminder.send_failed", reminder_id=str(reminder.id), error=str(e))
        await db.commit()


async def enqueue_research(job_id: str, user_id: str, brief: str, save_to_notebook: bool):
    pool = await create_pool(REDIS_SETTINGS)
    job = await pool.enqueue_job("research_agent_task", job_id, user_id, brief, save_to_notebook)
    await pool.close()
    return job


class WorkerSettings:
    functions = [research_agent_task, process_reminders_task]
    redis_settings = REDIS_SETTINGS
    cron_jobs = [
        # Fire reminders every minute
        {"coroutine": process_reminders_task, "minute": {i for i in range(60)}},
    ]
    max_jobs = 10
    job_timeout = 300
