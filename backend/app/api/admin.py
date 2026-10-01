import uuid
import secrets
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import hash_password
from app.core.email import send_invite_email
from app.core.config import settings
from app.models.exam import Exam
from app.models.question import Question
from app.models.invite import Invite
from app.models.user import User
from app.models.candidate import Candidate
from app.models.session import Session
from app.models.flag import Flag
from app.schemas.exam import ExamCreate, ExamUpdate, QuestionCreate
from app.schemas.invite import InviteCreate
from app.api.auth import get_current_user

router = APIRouter(tags=['admin'])

# ─────────────────────────── EXAM CRUD ────────────────────────────────────────

@router.post("/admin/exams")
async def create_exam(
    exam_in: ExamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    exam = Exam(
        id=uuid.uuid4(),
        title=exam_in.title,
        description=exam_in.description,
        duration_minutes=exam_in.duration_minutes,
        sections=[s.model_dump() for s in exam_in.sections],
        settings=exam_in.settings,
        window_start=exam_in.window_start or now,
        window_end=exam_in.window_end or (now + timedelta(days=30)),
        created_by=current_user.id,
        is_active=exam_in.is_active,
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return {
        "id": str(exam.id),
        "title": exam.title,
        "description": exam.description,
        "duration_minutes": exam.duration_minutes,
        "sections": exam.sections or [],
        "settings": exam.settings or {},
        "is_active": exam.is_active,
        "window_start": exam.window_start.isoformat() if exam.window_start else None,
        "window_end": exam.window_end.isoformat() if exam.window_end else None,
        "created_at": exam.created_at.isoformat() if exam.created_at else None,
        "candidate_count": 0,
    }

@router.get("/admin/exams")
async def list_exams(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Exam).order_by(Exam.created_at.desc()))
    exams = res.scalars().all()

    result = []
    for exam in exams:
        inv_count_res = await db.execute(
            select(func.count(Invite.id)).where(Invite.exam_id == exam.id)
        )
        candidate_count = inv_count_res.scalar() or 0
        result.append({
            "id": str(exam.id),
            "title": exam.title,
            "description": exam.description,
            "duration_minutes": exam.duration_minutes,
            "sections": exam.sections or [],
            "settings": exam.settings or {},
            "is_active": exam.is_active,
            "window_start": exam.window_start.isoformat() if exam.window_start else None,
            "window_end": exam.window_end.isoformat() if exam.window_end else None,
            "created_at": exam.created_at.isoformat() if exam.created_at else None,
            "candidate_count": candidate_count,
        })
    return result

@router.get("/admin/exams/{id}")
async def get_exam(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Exam).where(Exam.id == id))
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(404, detail="Exam not found")

    q_res = await db.execute(select(Question).where(Question.exam_id == id))
    questions = q_res.scalars().all()

    return {
        "id": str(exam.id),
        "title": exam.title,
        "description": exam.description,
        "duration_minutes": exam.duration_minutes,
        "sections": exam.sections or [],
        "settings": exam.settings or {},
        "is_active": exam.is_active,
        "window_start": exam.window_start.isoformat() if exam.window_start else None,
        "window_end": exam.window_end.isoformat() if exam.window_end else None,
        "created_at": exam.created_at.isoformat() if exam.created_at else None,
        "questions": [
            {
                "id": str(q.id),
                "exam_id": str(q.exam_id),
                "section": q.section,
                "type": q.type,
                "text": q.text,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "tolerance": q.tolerance,
                "test_cases": q.test_cases,
                "passage": q.passage,
                "sub_questions": q.sub_questions,
                "marks": q.marks,
                "negative_marks": q.negative_marks,
                "difficulty": q.difficulty,
            }
            for q in questions
        ],
    }

@router.put("/admin/exams/{id}")
async def update_exam(id: uuid.UUID, exam_in: ExamUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Exam).where(Exam.id == id))
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(404, detail="Exam not found")

    update_data = exam_in.model_dump(exclude_unset=True)
    # Serialize sections if present
    if "sections" in update_data and update_data["sections"] is not None:
        update_data["sections"] = [
            s.model_dump() if hasattr(s, "model_dump") else s
            for s in update_data["sections"]
        ]
    for key, value in update_data.items():
        setattr(exam, key, value)
    await db.commit()
    await db.refresh(exam)
    return {"message": "Exam updated successfully", "id": str(exam.id)}

# ─────────────────────────── QUESTIONS ────────────────────────────────────────

@router.post("/admin/exams/{id}/questions")
async def add_question(id: uuid.UUID, q_in: QuestionCreate, db: AsyncSession = Depends(get_db)):
    # verify exam exists
    res = await db.execute(select(Exam).where(Exam.id == id))
    if not res.scalar_one_or_none():
        raise HTTPException(404, detail="Exam not found")

    q = Question(id=uuid.uuid4(), exam_id=id, **q_in.model_dump())
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return {
        "id": str(q.id),
        "exam_id": str(q.exam_id),
        "section": q.section,
        "type": q.type,
        "text": q.text,
        "marks": q.marks,
        "negative_marks": q.negative_marks,
        "difficulty": q.difficulty,
    }

@router.put("/admin/questions/{id}")
async def update_question(id: uuid.UUID, q_in: QuestionCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Question).where(Question.id == id))
    q = res.scalar_one_or_none()
    if not q:
        raise HTTPException(404, detail="Question not found")
    for key, value in q_in.model_dump(exclude_unset=True).items():
        setattr(q, key, value)
    await db.commit()
    return {"message": "Question updated"}

@router.delete("/admin/questions/{id}")
async def delete_question(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Question).where(Question.id == id))
    q = res.scalar_one_or_none()
    if not q:
        raise HTTPException(404, detail="Question not found")
    await db.delete(q)
    await db.commit()
    return {"message": "Question deleted successfully"}

# ─────────────────────────── INVITES ──────────────────────────────────────────

@router.post("/admin/exams/{id}/invites")
async def send_invites(id: uuid.UUID, req: InviteCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Exam).where(Exam.id == id))
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(404, detail="Exam not found")

    window_start_str = exam.window_start.strftime("%d %b %Y, %I:%M %p") if exam.window_start else "Open"
    window_end_str   = exam.window_end.strftime("%d %b %Y, %I:%M %p")   if exam.window_end   else "No expiry"

    created_invites = []
    emails_sent = 0

    for email_addr in req.candidate_emails:
        email_addr = email_addr.strip().lower()
        if not email_addr or "@" not in email_addr:
            continue

        u_res = await db.execute(select(User).where(User.email == email_addr))
        user = u_res.scalar_one_or_none()

        temp_password = secrets.token_urlsafe(10)
        if not user:
            user = User(
                id=uuid.uuid4(),
                email=email_addr,
                name=email_addr.split("@")[0].replace(".", " ").title(),
                password_hash=hash_password(temp_password),
                role="candidate",
            )
            db.add(user)
            await db.flush()

        c_res = await db.execute(select(Candidate).where(Candidate.user_id == user.id))
        candidate = c_res.scalar_one_or_none()
        if not candidate:
            candidate = Candidate(
                id=uuid.uuid4(),
                user_id=user.id,
                candidate_code=f"CAND-{secrets.token_hex(3).upper()}",
            )
            db.add(candidate)
            await db.flush()

        invite_token = secrets.token_hex(24)
        invite = Invite(
            id=uuid.uuid4(),
            exam_id=exam.id,
            candidate_id=candidate.id,
            token=invite_token,
            temp_password_hash=hash_password(temp_password),
            email_sent_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="pending",
        )
        db.add(invite)

        deep_link = f"examguard://login?token={invite_token}"

        # Attempt real email
        email_sent = send_invite_email(
            to_email=email_addr,
            candidate_name=user.name,
            exam_title=exam.title,
            exam_window_start=window_start_str,
            exam_window_end=window_end_str,
            duration_minutes=exam.duration_minutes,
            invite_link=deep_link,
            username=user.email,
            temp_password=temp_password,
        )
        if email_sent:
            emails_sent += 1

        created_invites.append({
            "email": email_addr,
            "candidate_name": user.name,
            "username": user.email,
            "temp_password": temp_password,   # always returned so recruiter can share manually
            "token": invite_token,
            "deep_link": deep_link,
            "email_sent": email_sent,
        })

    await db.commit()
    return {
        "sent": len(created_invites),
        "emails_delivered": emails_sent,
        "email_enabled": settings.EMAIL_ENABLED,
        "invitations": created_invites,
    }

@router.get("/admin/exams/{id}/candidates")
async def list_candidates(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Invite).where(Invite.exam_id == id))
    invites = res.scalars().all()
    result = []
    for inv in invites:
        c_res = await db.execute(select(Candidate).where(Candidate.id == inv.candidate_id))
        cand = c_res.scalar_one_or_none()
        if cand:
            u_res = await db.execute(select(User).where(User.id == cand.user_id))
            u = u_res.scalar_one_or_none()
            if u:
                result.append({
                    "candidate_id": str(cand.id),
                    "name": u.name,
                    "email": u.email,
                    "invite_status": str(inv.status),
                    "invite_token": inv.token,
                })
    return result

# ─────────────────────────── RESULTS ──────────────────────────────────────────

async def _build_result_row(s: Session, db: AsyncSession) -> dict:
    candidate_name, candidate_email = "Candidate", "candidate@example.com"
    c_res = await db.execute(select(Candidate).where(Candidate.id == s.candidate_id))
    cand = c_res.scalar_one_or_none()
    if cand:
        u_res = await db.execute(select(User).where(User.id == cand.user_id))
        u = u_res.scalar_one_or_none()
        if u:
            candidate_name = u.name
            candidate_email = u.email

    f_res = await db.execute(select(func.count(Flag.id)).where(Flag.session_id == s.id))
    flag_count = f_res.scalar() or 0

    time_taken = 0
    if s.start_time and s.end_time:
        time_taken = int((s.end_time - s.start_time).total_seconds())

    return {
        "candidate_id": str(s.candidate_id),
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "session_id": str(s.id),
        "status": str(s.status),
        "total_score": s.total_score if s.total_score is not None else 0.0,
        "max_score": 100.0,
        "integrity_score": s.integrity_score if s.integrity_score is not None else 100.0,
        "time_taken_seconds": time_taken,
        "flag_count": flag_count,
        "submitted_at": (s.end_time or s.created_at).isoformat() if (s.end_time or s.created_at) else None,
    }

@router.get("/admin/exams/{id}/results")
async def get_exam_results(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.exam_id == id))
    sessions = res.scalars().all()
    return [await _build_result_row(s, db) for s in sessions]

@router.get("/admin/results/all")
async def get_all_results(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).order_by(Session.created_at.desc()))
    sessions = res.scalars().all()
    return [await _build_result_row(s, db) for s in sessions]
