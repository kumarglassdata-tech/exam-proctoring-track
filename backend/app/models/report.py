import uuid
from sqlalchemy import Column, Float, JSON, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class Report(Base):
    __tablename__ = 'reports'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.id'), unique=True)
    total_score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    section_scores = Column(JSON, nullable=False)
    integrity_score = Column(Float, nullable=False)
    flag_summary = Column(JSON, nullable=False)
    pdf_url = Column(Text, nullable=True)
    evidence_package_url = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
