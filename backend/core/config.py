"""Application configuration using Pydantic Settings."""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # App
    APP_ENV: str = "development"
    APP_SECRET_KEY: str
    APP_DOMAIN: str = "jarvisapp.cloud"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str
    REDIS_PASSWORD: str = ""

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption
    ENCRYPTION_MASTER_KEY: str  # 64-char hex string

    # AI Providers (bootstrap only; stored encrypted in DB after setup)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_AI_API_KEY: Optional[str] = None
    MANUS_API_KEY: Optional[str] = None

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "jarvis@jarvisapp.cloud"
    SMTP_FROM_NAME: str = "Jarvis"

    # Storage
    FILE_STORAGE_PATH: str = "/app/storage"
    MAX_FILE_SIZE_MB: int = 50

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_AI_PER_MINUTE: int = 20

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://localhost:3000",
        "https://jarvisapp.cloud",
        "https://www.jarvisapp.cloud",
    ]

    # Sentry
    SENTRY_DSN: Optional[str] = None

    LOG_LEVEL: str = "INFO"

    @property
    def encryption_key_bytes(self) -> bytes:
        return bytes.fromhex(self.ENCRYPTION_MASTER_KEY)


settings = Settings()
