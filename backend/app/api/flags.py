import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.core.database import get_db
from app.core.websocket_manager import manager
from app.models.flag import Flag
from app.schemas.flag import FlagCreate, FlagResponse
from app.core.redis import publish_flag

router = APIRouter(tags=['flags'])

@router.post("/sessions/{id}/flags", response_model=FlagResponse)
async def ingest_flag(id: uuid.UUID, flag_in: FlagCreate, db: AsyncSession = Depends(get_db)):
    db_flag = Flag(**flag_in.model_dump(), session_id=id)
    db.add(db_flag)
    await db.commit()
    await db.refresh(db_flag)
    
    await publish_flag(str(id), {"type": db_flag.type, "severity": db_flag.severity})
    await manager.broadcast_to_proctors(db_flag.model_dump(mode="json"))
    return db_flag

@router.get("/sessions/{id}/flags", response_model=List[FlagResponse])
async def list_flags(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Flag).where(Flag.session_id == id))
    return result.scalars().all()

@router.post("/sessions/{id}/flags/manual", response_model=FlagResponse)
async def manual_flag(id: uuid.UUID, flag_in: FlagCreate, db: AsyncSession = Depends(get_db)):
    flag_in.source = "proctor_manual"
    return await ingest_flag(id, flag_in, db)

@router.websocket("/ws/session/{id}")
async def websocket_session(websocket: WebSocket, id: str):
    await manager.connect(id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # process client-side events or real-time flags
    except WebSocketDisconnect:
        manager.disconnect(id, websocket)
