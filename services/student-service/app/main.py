"""FastAPI application for student-service."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import HealthResponse
from app.routes import router

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("student-service starting up")
    yield
    logger.info("student-service shutting down")


app = FastAPI(
    title="Student Service",
    description="Student service to view groups, view visible instances, and trigger EC2 lifecycle actions via Azure Storage Queue.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    return HealthResponse(status="healthy")


@app.get("/health/ready", response_model=HealthResponse, tags=["health"])
async def readiness_check() -> HealthResponse:
    return HealthResponse(status="ready")
