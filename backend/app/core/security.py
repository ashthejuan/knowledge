import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Tokens are minted by NextAuth on the frontend and signed with the shared
# NEXTAUTH_SECRET using HS256, so the backend verifies them with the identical
# secret/algorithm pair (via PyJWT). Keeping this contract in one place avoids
# drift.
NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET")
JWT_ALGORITHM = "HS256"

if not NEXTAUTH_SECRET:
    raise RuntimeError(
        "NEXTAUTH_SECRET is not configured. It is required to verify the JWTs "
        "issued by the NextAuth frontend."
    )

# The tokenUrl is only used to render the interactive docs "Authorize" flow;
# the real tokens are obtained from the NextAuth session on the frontend.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=True)

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate authentication credentials",
    headers={"WWW-Authenticate": "Bearer"},
)
_password_hasher = PasswordHasher()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def build_credentials_user_id(email: str) -> str:
    return f"credentials:{normalize_email(email)}"


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except Argon2Error:
        return False


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + (expires_delta or timedelta(days=30))
    payload = {"sub": subject, "iat": now, "exp": expires_at}

    return jwt.encode(payload, NEXTAUTH_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    """Verify the bearer token and return the owning user's subject identifier.

    The returned value is the tenant boundary for every downstream store, so a
    missing/invalid signature or absent ``sub`` claim must hard-fail with 401
    before any ingestion, chat, or graph work is allowed to begin.
    """
    try:
        payload = jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=[JWT_ALGORITHM],
            # NextAuth does not set an audience claim on our minted token.
            options={"verify_aud": False},
        )
    except jwt.InvalidTokenError as exc:
        raise CREDENTIALS_EXCEPTION from exc

    user_id = payload.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise CREDENTIALS_EXCEPTION

    return user_id


# Reusable dependency annotation for route signatures.
CurrentUser = Annotated[str, Depends(get_current_user)]
