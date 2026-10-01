from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class FlagCreate(BaseModel):
    type: str
    severity: str
    confidence: Optional[float] = None
    evidence_ref: Optional[str] = None
    source: str
    message: Optional[str] = None

class FlagResponse(FlagCreate):
    id: uuid.UUID
    session_id: uuid.UUID
    flagged_at: datetime

    class Config:
        from_attributes = True
