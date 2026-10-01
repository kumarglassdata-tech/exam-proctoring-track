import uuid
from sqlalchemy import Column, String, Integer, Float, Text, JSON, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class QuestionType(str, enum.Enum):
    mcq = "mcq"
    numerical = "numerical"
    coding = "coding"
    paragraph = "paragraph"
    descriptive = "descriptive"

class DifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class Question(Base):
    __tablename__ = 'questions'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey('exams.id'))
    section = Column(String, nullable=False)
    type = Column(SQLEnum(QuestionType), nullable=False)
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=True)
    tolerance = Column(Float, default=0.0)
    test_cases = Column(JSON, nullable=True)
    time_limit_ms = Column(Integer, nullable=True)
    memory_limit_mb = Column(Integer, nullable=True)
    allowed_languages = Column(JSON, nullable=True)
    passage = Column(Text, nullable=True)
    sub_questions = Column(JSON, nullable=True)
    marks = Column(Float, nullable=False)
    negative_marks = Column(Float, default=0.0)
    difficulty = Column(SQLEnum(DifficultyEnum), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
