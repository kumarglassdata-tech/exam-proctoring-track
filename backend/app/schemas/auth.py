from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import uuid

class LoginRequest(BaseModel):
    email: str
    password: str
    invite_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Optional[Dict[str, Any]] = None

class OTPVerifyRequest(BaseModel):
    email: Optional[str] = None
    code: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True
