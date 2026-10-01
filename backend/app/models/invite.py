import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class InviteStatus(str, enum.Enum):
    pending = "pending"
    opened = "opened"
    completed = "completed"

class Invite(Base):
    __tablename__ = 'invites'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey('exams.id'))
    candidate_id = Column(UUID(as_uuid=True), ForeignKey('candidates.id'))
    token = Column(String(128), unique=True, nullable=False)
    temp_password_hash = Column(String, nullable=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(SQLEnum(InviteStatus), default=InviteStatus.pending)
