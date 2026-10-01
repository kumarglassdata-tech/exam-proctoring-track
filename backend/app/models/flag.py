import uuid
import enum
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class FlagSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class FlagSource(str, enum.Enum):
    client_ai = "client_ai"
    system = "system"
    proctor_manual = "proctor_manual"

class Flag(Base):
    __tablename__ = 'flags'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.id'))
    type = Column(String, nullable=False)
    severity = Column(SQLEnum(FlagSeverity), nullable=False)
    confidence = Column(Float, nullable=True)
    evidence_ref = Column(Text, nullable=True)
    source = Column(SQLEnum(FlagSource), nullable=False)
    message = Column(Text, nullable=True)
    flagged_at = Column(DateTime(timezone=True), server_default=func.now())
