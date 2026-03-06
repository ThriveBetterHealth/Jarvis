"""AI Assistant routes - chat, voice, model selection."""

import json
from typing import AsyncGenerator, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.conversation import AIModel
from services.ai.orchestrator import AIOrchestrator
from services.conversation_service import ConversationService

router = APIRouter()


class ChatRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    message: str
    model: AIModel = AIModel.AUTO
    stream: bool = True


class CreateConversationRequest(BaseModel):
    title: str = "New Conversation"
    model: AIModel = AIModel.AUTO
    system_prompt: Optional[str] = None


@router.get("/conversations")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    service = ConversationService(db)
    conversations = await service.list_for_user(current_user.id, skip=skip, limit=limit)
    return {"conversations": conversations, "total": len(conversations)}


@router.post("/conversations")
async def create_conversation(
    body: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversationService(db)
    conv = await service.create(
        user_id=current_user.id,
        title=body.title,
        model=body.model,
        system_prompt=body.system_prompt,
    )
    return conv


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversationService(db)
    conv = await service.get(conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ConversationService(db)
    await service.delete(conversation_id, current_user.id)


@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get a response. Supports streaming."""
    orchestrator = AIOrchestrator(db, current_user)
    conv_service = ConversationService(db)

    # Get or create conversation
    if body.conversation_id:
        conv = await conv_service.get(body.conversation_id, current_user.id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = await conv_service.create(user_id=current_user.id, model=body.model)

    if body.stream:
        async def event_stream() -> AsyncGenerator[str, None]:
            async for chunk in orchestrator.stream_chat(
                conversation=conv,
                user_message=body.message,
                model=body.model,
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")
    else:
        response = await orchestrator.chat(
            conversation=conv,
            user_message=body.message,
            model=body.model,
        )
        return response


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transcribe audio using OpenAI Whisper."""
    orchestrator = AIOrchestrator(db, current_user)
    content = await audio.read()
    transcript = await orchestrator.transcribe_audio(content, audio.filename)
    return {"transcript": transcript}


@router.post("/models")
async def list_models(current_user: User = Depends(get_current_user)):
    """Return available AI models."""
    return {
        "models": [
            {"id": AIModel.GPT4O, "name": "GPT-4o", "provider": "OpenAI", "strength": "Code generation, general reasoning"},
            {"id": AIModel.GPT4O_MINI, "name": "GPT-4o Mini", "provider": "OpenAI", "strength": "Fast, cost-effective"},
            {"id": AIModel.CLAUDE_OPUS, "name": "Claude Opus 4", "provider": "Anthropic", "strength": "Long-form analysis, document work"},
            {"id": AIModel.CLAUDE_SONNET, "name": "Claude Sonnet 4", "provider": "Anthropic", "strength": "Balanced speed and quality"},
            {"id": AIModel.GEMINI_PRO, "name": "Gemini Pro", "provider": "Google", "strength": "Multimodal, large context"},
            {"id": AIModel.AUTO, "name": "Auto (Recommended)", "provider": "Jarvis", "strength": "Automatic routing"},
        ]
    }
