"""
Authentication router - Admin Only Lockdown
"""
import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, status, Depends

# Load env variables
load_dotenv()
from pydantic import BaseModel
from datetime import timedelta
from backend.auth.auth import (
    create_access_token,
    get_password_hash,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    Token,
)
from backend.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Single Admin configuration from environment or fallback
ADMIN_USER = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_HASH = get_password_hash(ADMIN_PASS)

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest):
    """Admin-only login"""
    input_user = login_data.username.strip()
    input_pass = login_data.password.strip()

    if input_user != ADMIN_USER or not verify_password(input_pass, ADMIN_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": ADMIN_USER}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_current_user_info(current_user: str = Depends(get_current_user)):
    """Get current user info (protected)"""
    return {
        "username": ADMIN_USER,
        "role": "administrator",
        "status": "active"
    }