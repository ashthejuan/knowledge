from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.ingest import router as ingest_router

app = FastAPI(title="AI Knowledge Platform API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "databases": "pending connection"}
