"""Test configuration and fixtures."""

import asyncio
import os
import pytest

# Set test environment variables before any imports
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://jarvis:test_password@localhost:5432/jarvis_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("REDIS_PASSWORD", "")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-64-chars-long-for-testing-purposes-only-xx")
os.environ.setdefault("APP_SECRET_KEY", "test-app-secret-key-64-chars-for-testing-only-xxxxxxxxxxxxxxxxxxx")
os.environ.setdefault("ENCRYPTION_MASTER_KEY", "0" * 64)
os.environ.setdefault("ANTHROPIC_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")
os.environ.setdefault("GOOGLE_AI_API_KEY", "test")


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
