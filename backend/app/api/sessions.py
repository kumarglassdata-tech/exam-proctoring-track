import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.core.database import get_db
from app.models.session import Session, SessionStatus
from app.models.candidate import Candidate
from app.models.user import User
from app.models.exam import Exam
from app.models.flag import Flag
from pydantic import BaseModel
from app.schemas.session import SessionCreate, SessionResponse, HeartbeatRequest, AnswerSubmit
from app.workers.evaluate import evaluate_session

# In-memory store for real-time webcam video frames per session
LATEST_FRAMES: dict[str, str] = {}

class FrameUpload(BaseModel):
    image: str

router = APIRouter(tags=['sessions'])

@router.post("/sessions", response_model=SessionResponse)
async def start_session(req: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = Session(
        exam_id=req.exam_id,
        invite_id=req.invite_id,
        status=SessionStatus.active,
        question_order=[],
        start_time=datetime.utcnow()
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/sessions/active")
async def list_active_sessions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.status.in_([SessionStatus.active, SessionStatus.paused])))
    sessions = res.scalars().all()
    
    out = []
    for s in sessions:
        candidate_name = "Candidate"
        candidate_email = "candidate@example.com"
        c_res = await db.execute(select(Candidate).where(Candidate.id == s.candidate_id))
        cand = c_res.scalar_one_or_none()
        if cand:
            u_res = await db.execute(select(User).where(User.id == cand.user_id))
            u = u_res.scalar_one_or_none()
            if u:
                candidate_name = u.name
                candidate_email = u.email

        exam_title = "Assessment"
        e_res = await db.execute(select(Exam).where(Exam.id == s.exam_id))
        exam = e_res.scalar_one_or_none()
        if exam:
            exam_title = exam.title

        f_count_res = await db.execute(select(func.count(Flag.id)).where(Flag.session_id == s.id))
        flag_count = f_count_res.scalar() or 0

        # latest flag message
        last_flag_msg = None
        lf_res = await db.execute(select(Flag).where(Flag.session_id == s.id).order_by(Flag.flagged_at.desc()).limit(1))
        latest_flag = lf_res.scalar_one_or_none()
        if latest_flag:
            last_flag_msg = latest_flag.message or latest_flag.type

        out.append({
            "session_id": str(s.id),
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "exam_title": exam_title,
            "status": s.status.value if hasattr(s.status, "value") else str(s.status),
            "integrity_score": s.integrity_score if s.integrity_score is not None else 100.0,
            "flag_count": flag_count,
            "start_time": s.start_time.strftime("%I:%M %p") if s.start_time else "Just now",
            "last_flag": last_flag_msg,
            "latest_frame": LATEST_FRAMES.get(str(s.id)),
        })
    return out

@router.get("/sessions/{id}")
async def get_session(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.id == id))
    sess = res.scalar_one_or_none()
    if not sess: raise HTTPException(404, detail="Session not found")
    return sess

@router.post("/sessions/{id}/heartbeat")
async def heartbeat(id: uuid.UUID, req: HeartbeatRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.id == id))
    sess = res.scalar_one_or_none()
    if not sess: raise HTTPException(404, detail="Session not found")
    sess.last_heartbeat = req.timestamp
    await db.commit()
    return {"status": "ok"}

@router.post("/sessions/{id}/pause")
async def pause_session(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.id == id))
    sess = res.scalar_one_or_none()
    if not sess: raise HTTPException(404, detail="Session not found")
    sess.status = SessionStatus.paused
    await db.commit()
    return {"status": "paused", "session_id": str(id)}

@router.post("/sessions/{id}/resume")
async def resume_session(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.id == id))
    sess = res.scalar_one_or_none()
    if not sess: raise HTTPException(404, detail="Session not found")
    sess.status = SessionStatus.active
    await db.commit()
    return {"status": "active", "session_id": str(id)}

@router.post("/sessions/{id}/terminate")
async def terminate_session(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.id == id))
    sess = res.scalar_one_or_none()
    if not sess: raise HTTPException(404, detail="Session not found")
    sess.status = SessionStatus.terminated
    sess.end_time = datetime.utcnow()
    await db.commit()
    return {"status": "terminated", "session_id": str(id)}

@router.post("/sessions/{id}/submit")
async def submit_session(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.id == id))
    sess = res.scalar_one_or_none()
    if not sess: raise HTTPException(404, detail="Session not found")
    sess.status = SessionStatus.submitted
    sess.end_time = datetime.utcnow()
    await db.commit()
    return {"status": "submitted", "session_id": str(id)}

@router.post("/sessions/{id}/frame")
async def upload_frame(id: str, payload: FrameUpload):
    LATEST_FRAMES[str(id)] = payload.image
    return {"status": "ok"}

@router.get("/sessions/{id}/frame")
async def get_frame(id: str):
    img = LATEST_FRAMES.get(str(id))
    if not img:
        raise HTTPException(status_code=404, detail="No video frame available")
    return {"image": img}
