from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

class InviteCreate(BaseModel):
    exam_id: Optional[uuid.UUID] = None
    candidate_emails: List[str]
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    window_start_display: Optional[str] = None
    window_end_display: Optional[str] = None
    duration_minutes: Optional[int] = None
    frontend_url: Optional[str] = None

class InviteResponse(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    token: str
    expires_at: datetime
    status: str

    class Config:
        from_attributes = True

class InviteValidateResponse(BaseModel):
    valid: bool = True
    exam_id: Optional[str] = None
    exam_title: str
    candidate_id: Optional[str] = None
    candidate_name: str
    username: str
    duration_minutes: Optional[int] = 60
    exam_window_start: Optional[str] = None
    exam_window_end: Optional[str] = None
    status: str = "pending"
