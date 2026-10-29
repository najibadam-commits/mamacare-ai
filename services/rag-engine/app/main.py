"""FastAPI entry point:  uvicorn app.main:app"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import Settings
from app.engine.pipeline import RagPipeline

log = logging.getLogger("mamacare.rag")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        pipeline = RagPipeline(settings)
        try:
            log.info("Vector index: %s", pipeline.ensure_index())
        except Exception:
            log.exception("Could not build the vector index; /health will report 'degraded'")
        app.state.pipeline = pipeline
        yield

    app = FastAPI(
        title="MamaCare AI - RAG Engine",
        version="0.1.0",
        description="Grounded, non-prescriptive maternal health Q&A over a verified guideline corpus.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.include_router(router)
    return app


app = create_app()
