from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./examguard.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "supersecret-examguard-key-for-local-development-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── SMTP / Email ────────────────────────────────────────────────────────
    # For Gmail: use smtp.gmail.com:587, your Gmail address, and a Gmail App Password
    # (Google Account → Security → 2-Step Verification → App Passwords)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""          # your Gmail address, e.g. yourname@gmail.com
    SMTP_PASS: str = ""          # Gmail App Password (16 chars, no spaces)
    FROM_EMAIL: str = ""         # same as SMTP_USER usually
    EMAIL_ENABLED: bool = False  # set to True once SMTP_USER/PASS are configured

    # ── Storage / Services ──────────────────────────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "examguard"
    MINIO_SECRET_KEY: str = "secret123"
    MINIO_BUCKET: str = "examguard-recordings"
    JUDGE0_URL: str = "http://localhost:2358"
    FRONTEND_URL: str = "http://localhost:1420"
    APP_NAME: str = "ExamGuard"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
