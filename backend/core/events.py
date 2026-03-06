"""Application startup and shutdown events."""

import structlog
from core.database import engine

log = structlog.get_logger()


async def startup_event():
    log.info("Jarvis AI starting up")


async def shutdown_event():
    await engine.dispose()
    log.info("Jarvis AI shut down")
