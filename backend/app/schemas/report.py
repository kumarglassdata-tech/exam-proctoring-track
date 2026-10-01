from pydantic import BaseModel
from typing import Dict, Any, List
from datetime import datetime
import uuid

class EvaluationResult(BaseModel):
    question_id: uuid.UUID
    score: float
    is_correct: bool
    details: Optional[Dict[str, Any]] = None

class ReportResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    total_score: float
    max_score: float
    section_scores: Dict[str, float]
    integrity_score: float
    flag_summary: Dict[str, int]
    pdf_url: Optional[str] = None
    evidence_package_url: Optional[str] = None
    generated_at: datetime

    class Config:
        from_attributes = True
