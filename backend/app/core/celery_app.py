from celery import Celery
import os

celery_app = Celery(
    "knowledge_worker",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL")
)