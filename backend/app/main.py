import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.chat import router as chat_router
from app.api.routes.graph import router as graph_router
from app.api.routes.ingest import router as ingest_router
from app.services.graph_db_service import ensure_graph_constraints

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_graph_constraints()
    except Exception as exc:
        logger.warning(
            "Neo4j graph constraints were not ensured on startup: %s",
            exc,
            exc_info=logger.isEnabledFor(logging.DEBUG),
        )
    yield


app = FastAPI(title="AI Knowledge Platform API", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(graph_router)
app.include_router(chat_router)
app.include_router(auth_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "databases": "pending connection"}
