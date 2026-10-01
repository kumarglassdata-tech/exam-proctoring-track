from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter(tags=['reports'])

@router.get("/reports/{session_id}")
async def get_report_summary(session_id: str, db: AsyncSession = Depends(get_db)):
    return {"message": "Report summary"}

@router.get("/reports/{session_id}/export")
async def download_report(session_id: str):
    return {"message": "PDF Download link"}

@router.get("/reports/{session_id}/evidence")
async def download_evidence(session_id: str):
    return {"message": "Evidence ZIP link"}
