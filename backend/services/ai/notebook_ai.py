"""AI functions for notebook pages."""

import json
from models.notebook import Page
from models.user import User
from services.ai.providers.anthropic_provider import AnthropicProvider
from services.ai.providers.base import ChatMessage


def _page_to_text(page: Page) -> str:
    """Extract plain text from page blocks."""
    parts = [page.title]
    for block in (page.blocks or []):
        if isinstance(block, dict):
            block.get("type", "")  # type consumed implicitly via content parsing
            content = block.get("content", "")
            if isinstance(content, str):
                parts.append(content)
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                        parts.append(item.get("text", ""))
    return "\n".join(filter(None, parts))


class NotebookAIService:
    def __init__(self, db, user: User):
        self.db = db
        self.user = user
        self.provider = AnthropicProvider()

    async def summarise(self, page: Page) -> str:
        text = _page_to_text(page)
        messages = [
            ChatMessage(role="system", content="You are Jarvis, a personal AI assistant. Summarise the following note concisely in 2-4 sentences."),
            ChatMessage(role="user", content=text[:8000]),
        ]
        response = await self.provider.chat(messages)
        return response["content"]

    async def generate_tasks(self, page: Page) -> list:
        text = _page_to_text(page)
        messages = [
            ChatMessage(
                role="system",
                content=(
                    "You are Jarvis. Extract actionable tasks from the following note. "
                    "Return a JSON array of objects with fields: title (string), description (string, optional), "
                    "priority (critical|high|medium|low), due_date (ISO date string or null). "
                    "Return ONLY the JSON array, no other text."
                ),
            ),
            ChatMessage(role="user", content=text[:8000]),
        ]
        response = await self.provider.chat(messages)
        try:
            tasks = json.loads(response["content"])
            return tasks if isinstance(tasks, list) else []
        except json.JSONDecodeError:
            return []

    async def extract_insights(self, page: Page) -> dict:
        text = _page_to_text(page)
        messages = [
            ChatMessage(
                role="system",
                content=(
                    "You are Jarvis. Analyse this note and extract insights. "
                    "Return JSON with: key_points (list of strings), decisions (list), risks (list), open_questions (list). "
                    "Return ONLY the JSON object."
                ),
            ),
            ChatMessage(role="user", content=text[:8000]),
        ]
        response = await self.provider.chat(messages)
        try:
            return json.loads(response["content"])
        except json.JSONDecodeError:
            return {"key_points": [], "decisions": [], "risks": [], "open_questions": []}
