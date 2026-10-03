from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, sessions, flags, admin, reports, execute

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        from app.models.user import User
        from app.core.security import hash_password
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import select
        import uuid

        async with AsyncSessionLocal() as db:
            if settings.DEFAULT_RECRUITER_EMAIL:
                r_res = await db.execute(select(User).where(User.email == settings.DEFAULT_RECRUITER_EMAIL))
                if not r_res.scalar_one_or_none():
                    rec = User(
                        id=uuid.uuid4(),
                        email=settings.DEFAULT_RECRUITER_EMAIL,
                        name=settings.DEFAULT_RECRUITER_NAME,
                        password_hash=hash_password(settings.DEFAULT_RECRUITER_PASSWORD),
                        role="recruiter"
                    )
                    db.add(rec)
                    await db.commit()
    except Exception as e:
        print("[STARTUP NOTICE]", e)
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(flags.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(execute.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "healthy"}
# Environment settings reloaded

