import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

if BACKEND_ENV_FILE.exists():
    load_dotenv(BACKEND_ENV_FILE)


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if value:
        return value

    raise RuntimeError(f"{name} is not configured")


def get_frontend_origins() -> list[str]:
    origins = ["http://localhost:3000"]

    for origin in (
        os.getenv("FRONTEND_URL"),
        os.getenv("NEXTAUTH_URL"),
        os.getenv("VERCEL_URL"),
    ):
        if not origin:
            continue

        normalized_origin = origin.strip().rstrip("/")
        if not normalized_origin:
            continue

        if "://" not in normalized_origin:
            normalized_origin = f"https://{normalized_origin}"

        origins.append(normalized_origin)

    cors_origins = os.getenv("CORS_ORIGINS")
    if cors_origins:
        origins.extend(
            origin.strip().rstrip("/")
            for origin in cors_origins.split(",")
            if origin.strip()
        )

    return list(dict.fromkeys(origins))
