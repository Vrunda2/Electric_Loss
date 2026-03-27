"""
Authentication router - Login and Register endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends
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

# Temporary in-memory user database (replace with real database)
fake_users_db = {
    "admin": {
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "Admin User",
        "hashed_password": get_password_hash("admin123"),
        "disabled": False,
    }
}


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = None


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest):
    """
    Login endpoint - returns JWT token

    Example request:
    {
        "username": "admin",
        "password": "admin123"
    }
    """
    user = fake_users_db.get(login_data.username)

    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=Token)
def register(register_data: RegisterRequest):
    """
    Register endpoint - creates new user and returns JWT token

    Example request:
    {
        "username": "john_doe",
        "email": "john@example.com",
        "password": "secure_password",
        "full_name": "John Doe"
    }
    """
    if register_data.username in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    fake_users_db[register_data.username] = {
        "username": register_data.username,
        "email": register_data.email,
        "full_name": register_data.full_name,
        "hashed_password": get_password_hash(register_data.password),
        "disabled": False,
    }

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": register_data.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def get_current_user_info(current_user: str = Depends(get_current_user)):
    """Get current user info (protected endpoint)"""
    user = fake_users_db.get(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"]
    }