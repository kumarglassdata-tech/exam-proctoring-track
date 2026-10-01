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
from app.models.flag import Flag
from app.models.report import Report
from app.models.answer import Answer

async def seed():
    print("Initializing database tables...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # 1. Create Recruiter (merged role — manages exams AND monitors live sessions)
        recruiter = User(
            id=uuid.uuid4(),
            email="recruiter@examguard.com",
            name="Sarah Jenkins",
            password_hash=hash_password("password123"),
            role="recruiter"
        )
        db.add(recruiter)
        await db.flush()

        # 3. Create Candidates
        cands_data = [
            ("Rahul Sharma", "rahul.sharma@example.com"),
            ("Priya Nair", "priya.nair@example.com"),
            ("Karan Mehta", "karan.mehta@example.com"),
            ("Ananya Roy", "ananya.roy@example.com"),
        ]

        created_cands = []
        for name, email in cands_data:
            user = User(
                id=uuid.uuid4(),
                email=email,
                name=name,
                password_hash=hash_password("password123"),
                role="candidate"
            )
            db.add(user)
            await db.flush()

            cand = Candidate(
                id=uuid.uuid4(),
                user_id=user.id,
                candidate_code=f"CAND-{str(uuid.uuid4())[:6].upper()}"
            )
            db.add(cand)
            await db.flush()
            created_cands.append((user, cand))

        # 4. Create Real Exam
        now = datetime.utcnow()
        exam = Exam(
            id=uuid.uuid4(),
            title="Software Development Engineer - 1st Round Assessment",
            description="Technical assessment covering Aptitude, Core CS, Problem Solving, and Comprehension.",
            duration_minutes=60,
            sections=[
                {"name": "Aptitude & Math", "time_minutes": 15, "question_count": 2},
                {"name": "Coding & Data Structures", "time_minutes": 25, "question_count": 1},
                {"name": "System Design & Comprehension", "time_minutes": 20, "question_count": 1}
            ],
            settings={
                "negative_marking": True,
                "randomize_order": True,
                "forbidden_apps": ["Discord", "AnyDesk", "OBS", "WhatsApp", "Zoom"]
            },
            window_start=now,
            window_end=now + timedelta(days=7),
            created_by=recruiter.id
        )
        db.add(exam)
        await db.flush()

        # 5. Add Questions
        q1 = Question(
            id=uuid.uuid4(),
            exam_id=exam.id,
            section="Aptitude & Math",
            type="mcq",
            text="A car travels a certain distance at 60 km/h and returns at 40 km/h. What is the average speed for the entire journey?",
            options=["48 km/h", "50 km/h", "52 km/h", "45 km/h"],
            correct_answer="A",
            marks=2.0,
            negative_marks=0.5,
            difficulty="easy"
        )
        q2 = Question(
            id=uuid.uuid4(),
            exam_id=exam.id,
            section="Aptitude & Math",
            type="numerical",
            text=r"Evaluate the limit as x approaches 0: $\lim_{x \to 0} \frac{\sin(3x)}{x}$",
            correct_answer="3",
            tolerance=0.01,
            marks=3.0,
            negative_marks=0.0,
            difficulty="medium"
        )
        q3 = Question(
            id=uuid.uuid4(),
            exam_id=exam.id,
            section="Coding & Data Structures",
            type="coding",
            text="Write a function that takes an integer n and returns true if it is a prime number, or false otherwise.",
            test_cases=[
                {"input": "7", "expected_output": "true"},
                {"input": "10", "expected_output": "false"},
                {"input": "2", "expected_output": "true"}
            ],
            time_limit_ms=1000,
            memory_limit_mb=128,
            allowed_languages=["python", "javascript", "cpp", "java"],
            marks=10.0,
            negative_marks=0.0,
            difficulty="medium"
        )
        q4 = Question(
            id=uuid.uuid4(),
            exam_id=exam.id,
            section="System Design & Comprehension",
            type="paragraph",
            text="Database Indexing Trade-offs",
            passage="B-tree indices significantly enhance read performance by allowing logarithmic lookup time for range queries and equality comparisons. However, write operations (INSERT, UPDATE, DELETE) incur an overhead because the underlying tree structure must be rebalanced and synchronized to disk. Furthermore, in high-concurrency environments, index page splits can lead to thread contention and latch bottlenecks.",
            sub_questions=[
                {
                    "sub_type": "mcq",
                    "text": "What is the time complexity of lookup in a balanced B-tree index?",
                    "options": ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
                    "correct_answer": "B",
                    "marks": 2.0
                },
                {
                    "sub_type": "short_answer",
                    "text": "Explain why heavy write operations degrade performance in heavily indexed tables.",
                    "model_answer": "Write operations require maintaining and rebalancing index trees and writing index entries to disk, increasing I/O and contention.",
                    "similarity_threshold": 0.7,
                    "marks": 3.0
                }
            ],
            marks=5.0,
            negative_marks=0.0,
            difficulty="medium"
        )
        db.add_all([q1, q2, q3, q4])
        await db.flush()

        # 6. Create Sessions and Invites
        # Candidate 0: Rahul Sharma (Active session right now!)
        u0, c0 = created_cands[0]
        inv0 = Invite(
            id=uuid.uuid4(),
            exam_id=exam.id,
            candidate_id=c0.id,
            token="token-rahul-sharma-123",
            temp_password_hash=hash_password("password123"),
            expires_at=now + timedelta(days=7),
            status="opened"
        )
        db.add(inv0)
        await db.flush()

        sess0 = Session(
            id=uuid.uuid4(),
            candidate_id=c0.id,
            exam_id=exam.id,
            invite_id=inv0.id,
            status=SessionStatus.active,
            question_order=[str(q1.id), str(q2.id), str(q3.id), str(q4.id)],
            start_time=datetime.utcnow() - timedelta(minutes=15),
            integrity_score=82.0
        )
        db.add(sess0)
        await db.flush()

        # Flags for Rahul
        db.add(Flag(
            session_id=sess0.id,
            type="multi_face",
            severity="critical",
            confidence=0.94,
            message="2 faces detected in camera frame simultaneously",
            source="client_ai"
        ))
        db.add(Flag(
            session_id=sess0.id,
            type="focus_loss",
            severity="high",
            confidence=1.0,
            message="Exam window lost focus / tab switch attempted",
            source="system"
        ))

        # Candidate 1: Priya Nair (Submitted, 92/100, 98% integrity)
        u1, c1 = created_cands[1]
        sess1 = Session(
            id=uuid.uuid4(),
            candidate_id=c1.id,
            exam_id=exam.id,
            status=SessionStatus.submitted,
            question_order=[str(q1.id), str(q2.id), str(q3.id), str(q4.id)],
            start_time=datetime.utcnow() - timedelta(hours=2),
            end_time=datetime.utcnow() - timedelta(hours=1, minutes=20),
            total_score=92.0,
            integrity_score=98.0
        )
        db.add(sess1)

        # Candidate 2: Karan Mehta (Submitted, 64/100, 68% integrity)
        u2, c2 = created_cands[2]
        sess2 = Session(
            id=uuid.uuid4(),
            candidate_id=c2.id,
            exam_id=exam.id,
            status=SessionStatus.submitted,
            question_order=[str(q1.id), str(q2.id), str(q3.id), str(q4.id)],
            start_time=datetime.utcnow() - timedelta(hours=3),
            end_time=datetime.utcnow() - timedelta(hours=2, minutes=10),
            total_score=64.0,
            integrity_score=68.0
        )
        db.add(sess2)
        await db.flush()
        db.add(Flag(
            session_id=sess2.id,
            type="focus_loss",
            severity="high",
            confidence=1.0,
            message="Window Defocus / Alt-Tab pressed",
            source="system"
        ))
        db.add(Flag(
            session_id=sess2.id,
            type="gaze_away",
            severity="medium",
            confidence=0.88,
            message="Looking away from screen for >5 sec",
            source="client_ai"
        ))

        # Candidate 3: Ananya Roy (Submitted, 88/100, 96% integrity)
        u3, c3 = created_cands[3]
        sess3 = Session(
            id=uuid.uuid4(),
            candidate_id=c3.id,
            exam_id=exam.id,
            status=SessionStatus.submitted,
            question_order=[str(q1.id), str(q2.id), str(q3.id), str(q4.id)],
            start_time=datetime.utcnow() - timedelta(hours=4),
            end_time=datetime.utcnow() - timedelta(hours=3, minutes=15),
            total_score=88.0,
            integrity_score=96.0
        )
        db.add(sess3)

        await db.commit()
        print("Database seeded successfully with real users, exams, questions, active sessions, and evaluated reports!")

if __name__ == "__main__":
    asyncio.run(seed())
