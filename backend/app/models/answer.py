import uuid
from sqlalchemy import Column, Text, Integer, Float, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class Answer(Base):
    __tablename__ = 'answers'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.id'))
    question_id = Column(UUID(as_uuid=True), ForeignKey('questions.id'))
    response = Column(Text, nullable=True)
    language_id = Column(Integer, nullable=True)
    score = Column(Float, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    similarity_score = Column(Float, nullable=True)
    judge0_result = Column(JSON, nullable=True)
    time_taken_seconds = Column(Integer, nullable=True)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
