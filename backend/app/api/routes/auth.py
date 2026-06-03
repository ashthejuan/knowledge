from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    build_credentials_user_id,
    create_access_token,
    hash_password,
    normalize_email,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User


router = APIRouter(prefix="/api/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]


class CredentialsRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = normalize_email(value)
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("Enter a valid email address")
        return email


class RegisterRequest(CredentialsRequest):
    name: str | None = Field(default=None, max_length=255)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None

        name = value.strip()
        return name or None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    created_at: datetime


class LoginResponse(UserResponse):
    access_token: str
    token_type: str = "bearer"


def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(payload: RegisterRequest, db: DbSession) -> UserResponse:
    user = User(
        id=build_credentials_user_id(payload.email),
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )

    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        ) from exc

    db.refresh(user)
    return to_user_response(user)


@router.post("/login", response_model=LoginResponse)
def login_user(payload: CredentialsRequest, db: DbSession) -> LoginResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return LoginResponse(
        **to_user_response(user).model_dump(),
        access_token=create_access_token(user.id),
    )
