# import os
# from pathlib import Path

# from celery import Celery
# from dotenv import load_dotenv


# load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# celery_app = Celery(
#     "knowledge_worker",
#     broker=os.getenv("REDIS_URL"),
#     backend=os.getenv("REDIS_URL"),
#     include=["app.services.tasks"],
# )

import os
import ssl
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

redis_url = os.getenv("REDIS_URL")

celery_app = Celery(
    "knowledge_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.services.tasks"],
)

# Required for Upstash Redis over TLS
if redis_url and redis_url.startswith("rediss://"):
    celery_app.conf.broker_use_ssl = {
        "ssl_cert_reqs": ssl.CERT_NONE
    }

    celery_app.conf.redis_backend_use_ssl = {
        "ssl_cert_reqs": ssl.CERT_NONE
    }