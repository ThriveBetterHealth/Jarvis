"""Jarvis AI - FastAPI Application Entry Point"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from api.routes import (
    admin,
    assistant,
    auth,
    dashboard,
    documents,
    files,
    memory,
    notebook,
    reminders,
    research,
    tasks,
)
from core.config import settings
from core.events import startup_event, shutdown_event

log = structlog.get_logger()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await startup_event()
    yield
    await shutdown_event()


app = FastAPI(
    title="Jarvis AI",
    description="Personal AI Operating System API",
    version="1.0.0",
    docs_url="/api/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/api/redoc" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# Middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["Assistant"])
app.include_router(notebook.router, prefix="/api/notebook", tags=["Notebook"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(reminders.router, prefix="/api/reminders", tags=["Reminders"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(research.router, prefix="/api/research", tags=["Research"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(memory.router, prefix="/api/memory", tags=["Memory"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
