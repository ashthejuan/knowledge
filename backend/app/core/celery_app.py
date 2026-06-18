import ssl

from celery import Celery

from app.core.config import get_required_env

redis_url = get_required_env("REDIS_URL")

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

celery_app.conf.broker_connection_retry_on_startup = True
