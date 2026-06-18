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


