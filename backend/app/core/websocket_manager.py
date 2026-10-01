from fastapi import WebSocket
from typing import Dict, List
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.proctor_connections: List[WebSocket] = []

    async def connect(self, session_id: str, websocket: WebSocket, is_proctor: bool = False):
        await websocket.accept()
        if is_proctor:
            self.proctor_connections.append(websocket)
        else:
            self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str, websocket: WebSocket, is_proctor: bool = False):
        if is_proctor and websocket in self.proctor_connections:
            self.proctor_connections.remove(websocket)
        elif session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_to_session(self, session_id: str, data_dict: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(data_dict)

    async def broadcast_to_proctors(self, data_dict: dict):
        for connection in self.proctor_connections:
            await connection.send_json(data_dict)

manager = ConnectionManager()
