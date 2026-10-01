import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class Candidate(Base):
    __tablename__ = 'candidates'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    candidate_code = Column(String, unique=True, index=True)
    profile_photo_url = Column(String, nullable=True)
    device_fingerprint = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
