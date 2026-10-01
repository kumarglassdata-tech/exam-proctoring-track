from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class SectionConfig(BaseModel):
    name: str
    time_minutes: int = 0
    question_count: int = 0

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int
    sections: List[SectionConfig] = []
    settings: Dict[str, Any] = {"negative_marking": False, "randomize_order": True, "forbidden_apps": []}
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    created_by: Optional[uuid.UUID] = None
    is_active: bool = False

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    sections: Optional[List[SectionConfig]] = None
    settings: Optional[Dict[str, Any]] = None
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    is_active: Optional[bool] = None

class ExamResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    duration_minutes: int
    sections: List[SectionConfig] = []
    settings: Dict[str, Any] = {}
    is_active: bool = True
    created_at: Optional[datetime] = None
    candidate_count: int = 0

    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    section: str
    type: str
    text: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    tolerance: float = 0.0
    test_cases: Optional[List[Dict[str, Any]]] = None
    time_limit_ms: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    allowed_languages: Optional[List[str]] = None
    passage: Optional[str] = None
    sub_questions: Optional[List[Dict[str, Any]]] = None
    marks: float = 1.0
    negative_marks: float = 0.0
    difficulty: str = "medium"

class QuestionResponse(QuestionCreate):
    id: uuid.UUID
    exam_id: uuid.UUID

    class Config:
        from_attributes = True
