import os
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

celery_app = Celery(
    "knowledge_worker",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL"),
    include=["app.services.tasks"],
)
