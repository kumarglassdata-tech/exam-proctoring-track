from celery import Celery
from app.core.config import settings
import asyncio

celery_app = Celery("exam_guard", broker=settings.REDIS_URL)

@celery_app.task
def evaluate_session(session_id: str):
    # Dummy worker body: queries db, computes score, creates report, notifies candidate
    print(f"Evaluating session {session_id}")
    return {"status": "completed", "session_id": session_id}
