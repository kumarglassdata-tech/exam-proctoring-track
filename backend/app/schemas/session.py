from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from app.schemas.exam import QuestionResponse

class SessionCreate(BaseModel):
    exam_id: uuid.UUID
    invite_id: uuid.UUID

class SessionResponse(BaseModel):
    id: uuid.UUID
    candidate_id: uuid.UUID
    exam_id: uuid.UUID
    status: str
    current_question_index: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    class Config:
        from_attributes = True

class HeartbeatRequest(BaseModel):
    timestamp: datetime
    client_status: Dict[str, Any] = {}

class AnswerSubmit(BaseModel):
    question_id: uuid.UUID
    response: Optional[str] = None
    language_id: Optional[int] = None
    time_taken_seconds: Optional[int] = None

class NextQuestionResponse(BaseModel):
    question: QuestionResponse
    index: int
    total: int
