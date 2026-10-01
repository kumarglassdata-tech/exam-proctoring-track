from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

class InviteCreate(BaseModel):
    exam_id: Optional[uuid.UUID] = None
    candidate_emails: List[str]

class InviteResponse(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    token: str
    expires_at: datetime
    status: str

    class Config:
        from_attributes = True

class InviteValidateResponse(BaseModel):
    exam_title: str
    candidate_name: str
    username: str
    exam_window_start: datetime
    exam_window_end: datetime
