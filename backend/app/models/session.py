import uuid
import enum
from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class SessionStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    paused = "paused"
    submitted = "submitted"
    terminated = "terminated"

class Session(Base):
    __tablename__ = 'sessions'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey('candidates.id'))
    exam_id = Column(UUID(as_uuid=True), ForeignKey('exams.id'))
    invite_id = Column(UUID(as_uuid=True), ForeignKey('invites.id'))
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.pending)
    question_order = Column(JSON, nullable=False)
    current_question_index = Column(Integer, default=0)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    integrity_score = Column(Float, nullable=True)
    total_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
