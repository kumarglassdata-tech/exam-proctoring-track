import asyncio
import uuid
from datetime import datetime, timedelta
from app.core.database import init_db, AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.candidate import Candidate
from app.models.exam import Exam
from app.models.question import Question
from app.models.invite import Invite
from app.models.session import Session, SessionStatus
from sqlalchemy import select

async def create_test_suite():
    await init_db()
    
    async with AsyncSessionLocal() as db:
        # 1. Get or create recruiters
        from app.core.config import settings

        # Seed recruiter from .env (e.g. careers@glassdata.ai)
        if settings.DEFAULT_RECRUITER_EMAIL:
            env_rec_res = await db.execute(select(User).where(User.email == settings.DEFAULT_RECRUITER_EMAIL))
            if not env_rec_res.scalar_one_or_none():
                env_recruiter = User(
                    id=uuid.uuid4(),
                    email=settings.DEFAULT_RECRUITER_EMAIL,
                    name=settings.DEFAULT_RECRUITER_NAME,
                    password_hash=hash_password(settings.DEFAULT_RECRUITER_PASSWORD),
                    role="recruiter"
                )
                db.add(env_recruiter)
                await db.flush()

        rec_res = await db.execute(select(User).where(User.email == "recruiter@examguard.com"))
        recruiter = rec_res.scalar_one_or_none()
        if not recruiter:
            recruiter = User(
                id=uuid.uuid4(),
                email="recruiter@examguard.com",
                name="Sarah Jenkins (Recruiter)",
                password_hash=hash_password("password123"),
                role="recruiter"
            )
            db.add(recruiter)
            await db.flush()

        # 2. Create Candidate
        cand_email = "candidate.test@examguard.com"
        c_res = await db.execute(select(User).where(User.email == cand_email))
        cand_user = c_res.scalar_one_or_none()
        
        if not cand_user:
            cand_user = User(
                id=uuid.uuid4(),
                email=cand_email,
                name="Alex Morgan (Test Candidate)",
                password_hash=hash_password("Password@123"),
                role="candidate"
            )
            db.add(cand_user)
            await db.flush()

        cand_obj_res = await db.execute(select(Candidate).where(Candidate.user_id == cand_user.id))
        candidate = cand_obj_res.scalar_one_or_none()
        if not candidate:
            candidate = Candidate(
                id=uuid.uuid4(),
                user_id=cand_user.id,
                candidate_code="CAND-TEST-99"
            )
            db.add(candidate)
            await db.flush()

        # 3. Create Comprehensive Test Exam with all question types
        now = datetime.utcnow()
        exam = Exam(
            id=uuid.uuid4(),
            title="AI Proctoring & Technical Verification Exam",
            description="Live testing assessment with WebCam Face Detection, Audio Anomaly Monitoring, App Lockdown, and All Question Formats.",
            duration_minutes=45,
            sections=[
                {"name": "General Aptitude", "time_minutes": 10, "question_count": 2},
                {"name": "Python Coding & Algorithms", "time_minutes": 20, "question_count": 1},
                {"name": "Comprehension & Analysis", "time_minutes": 15, "question_count": 1}
            ],
            settings={
                "negative_marking": True,
                "randomize_order": False,
                "forbidden_apps": ["Discord", "AnyDesk", "OBS", "WhatsApp", "Zoom", "Slack", "TeamViewer"]
            },
            window_start=now - timedelta(days=1),
            window_end=now + timedelta(days=30),
            created_by=recruiter.id,
            is_active=True  # Fully active and ready
        )
        db.add(exam)
        await db.flush()

        # 4. Add Questions
        # Q1: Multiple Choice
        q1 = Question(
            id=uuid.uuid4(),
            exam_id=exam.id,
            section="General Aptitude",
            type="mcq",
            text="Which of the following data structures operates on a Last-In-First-Out (LIFO) order?",
            options=["Queue", "Stack", "Binary Tree", "Linked List"],
            correct_answer="B",
            marks=2.0,
            negative_marks=0.5,
            difficulty="easy"
        )

        # Q2: Numerical / Math
        q2 = Question(
            id=uuid.uuid4(),
            exam_id=exam.id,
            section="General Aptitude",
            type="numerical",
            text="Calculate the value of $f(x) = 3x^2 - 5x + 7$ when $x = 4$.",
            correct_answer="35",
            tolerance=0.01,
            marks=3.0,
            negative_marks=0.0,
            difficulty="medium"
        )

        # Q3: Coding (LeetCode style)
        q3 = Question(
            id=uuid.uuid4(),
            exam_id=exam.id,
            section="Python Coding & Algorithms",
            type="coding",
            text="Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.\n\nWrite a solution in Python with function `two_sum(nums, target)`.",
            test_cases=[
                {"input": "[2, 7, 11, 15], 9", "expected_output": "[0, 1]"},
                {"input": "[3, 2, 4], 6", "expected_output": "[1, 2]"},
                {"input": "[3, 3], 6", "expected_output": "[0, 1]"}
            ],
            time_limit_ms=2000,
            memory_limit_mb=128,
            allowed_languages=["python", "javascript", "cpp"],
            marks=10.0,
            negative_marks=0.0,
            difficulty="medium"
        )

        # Q4: Paragraph Comprehension
        q4 = Question(
            id=uuid.uuid4(),
            exam_id=exam.id,
            section="Comprehension & Analysis",
            type="paragraph",
            text="Read the passage on zero-knowledge architecture and answer the sub-question.",
            passage="In high-stakes online examinations, client-side zero-knowledge proctoring models process webcam video and audio locally in WebAssembly (WASM) or native binaries rather than continuously transmitting raw video streams over the network. This architecture achieves two critical objectives: candidate privacy preservation and minimal bandwidth consumption. Server-side communication is restricted to cryptographic integrity heartbeats and flagged anomaly events with momentary evidentiary snapshots.",
            sub_questions=[
                {
                    "sub_type": "short_answer",
                    "text": "What are the two primary objectives achieved by processing video streams locally in client-side proctoring?",
                    "model_answer": "Candidate privacy preservation and minimal network bandwidth consumption.",
                    "marks": 5.0
                }
            ],
            marks=5.0,
            negative_marks=0.0,
            difficulty="medium"
        )

        db.add_all([q1, q2, q3, q4])
        await db.flush()

        # 5. Create Invite for the candidate
        token = "test-live-proctor-token-2026"
        inv_res = await db.execute(select(Invite).where(Invite.token == token))
        existing_invite = inv_res.scalar_one_or_none()
        if existing_invite:
            await db.delete(existing_invite)
            await db.flush()

        invite = Invite(
            id=uuid.uuid4(),
            exam_id=exam.id,
            candidate_id=candidate.id,
            token=token,
            temp_password_hash=hash_password("Password@123"),
            email_sent_at=now,
            expires_at=now + timedelta(days=30),
            status="pending"
        )
        db.add(invite)
        await db.commit()

        print("================ TEST ENVIRONMENT INITIALIZED ================")
        print(f"Exam ID:        {exam.id}")
        print(f"Exam Title:     {exam.title}")
        print(f"Candidate Name: {cand_user.name}")
        print(f"Candidate Email: {cand_user.email}")
        print(f"Password:       Password@123")
        print(f"Invite Token:   {token}")
        print(f"App Deep Link:  examguard://login?token={token}")
        print("==============================================================")

if __name__ == "__main__":
    asyncio.run(create_test_suite())
