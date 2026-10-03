from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./examguard.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "supersecret-examguard-key-for-local-development-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── JWT / Security Aliases from .env ───────────────────────────────────
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: Optional[str] = None
    JWT_RECRUITER_EXPIRE_HOURS: Optional[int] = None
    JWT_CANDIDATE_EXPIRE_HOURS: Optional[int] = None

    # ── Application URLs & Settings ─────────────────────────────────────────
    APP_URL: str = "https://careers.glassdata.ai"
    DEFAULT_VIOLATION_LOCK_THRESHOLD: int = 3

    # ── Recruiter Default Credentials ───────────────────────────────────────
    DEFAULT_RECRUITER_EMAIL: str = "careers@glassdata.ai"
    DEFAULT_RECRUITER_PASSWORD: str = "devops1067"
    DEFAULT_RECRUITER_NAME: str = "Careers Glassdata Recruiter"

    # ── SMTP / Email ────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    FROM_EMAIL: str = ""
    EMAIL_ENABLED: bool = False

    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: Optional[bool] = True
    MAIL_FROM: Optional[str] = None
    MAIL_FROM_NAME: Optional[str] = None

    # ── Storage / Services ──────────────────────────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "examguard"
    MINIO_SECRET_KEY: str = "secret123"
    MINIO_BUCKET: str = "examguard-recordings"
    JUDGE0_URL: str = "http://localhost:2358"
    FRONTEND_URL: str = "http://localhost:1420"
    APP_NAME: str = "ExamGuard"

    @model_validator(mode="after")
    def sync_config(self):
        # Normalize database URL to use asyncpg for postgresql
        if self.DATABASE_URL.startswith("postgresql://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

        # JWT
        if self.JWT_SECRET_KEY:
            self.SECRET_KEY = self.JWT_SECRET_KEY
        if self.JWT_ALGORITHM:
            self.ALGORITHM = self.JWT_ALGORITHM
        if self.JWT_RECRUITER_EXPIRE_HOURS:
            self.ACCESS_TOKEN_EXPIRE_MINUTES = self.JWT_RECRUITER_EXPIRE_HOURS * 60

        # SMTP & Mail
        if self.SMTP_USERNAME and not self.SMTP_USER:
            self.SMTP_USER = self.SMTP_USERNAME
        if self.SMTP_PASSWORD and not self.SMTP_PASS:
            self.SMTP_PASS = self.SMTP_PASSWORD
        if self.MAIL_FROM and not self.FROM_EMAIL:
            self.FROM_EMAIL = self.MAIL_FROM

        # Auto-enable email if credentials are provided
        if (self.SMTP_USER or self.SMTP_USERNAME) and (self.SMTP_PASS or self.SMTP_PASSWORD):
            self.EMAIL_ENABLED = True

        return self

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
