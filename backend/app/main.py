import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.core.config import settings

from app.api.voice import router as voice_router

# Configure structured logging for observability
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Voice-to-Website AI Gateway",
    description="Enterprise Autonomous Web Generation & Human Deployment Platform",
    version="0.1.0",
)

# CORS Middleware Configuration
origins = settings.cors_origins if settings.cors_origins else ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register v1 routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(voice_router, prefix="/api/v1")

@app.get("/healthz", summary="Health Check")
async def healthz():
    """Health check endpoint returning system status."""
    return {"status": "ok"}


@app.get("/", summary="API Root")
async def root():
    """Root info endpoint."""
    return {
        "service": "Voice-to-Website AI",
        "version": "0.1.0",
        "status": "online",
        "docs": "/docs",
    }
