"""FastAPI application entry point.

Exposes CRUD and upload endpoints backed by SQLite. OpenAPI docs at /docs
render the Pydantic schemas defined in api.schemas — this is what satisfies
"all schemas are defined and presented in the API".
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import autotok
from api.db import init_db
from api.routers import accounts, login, proxy, schedules, uploads, videos
from autotok import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="autotok API",
        version=autotok.__version__,
        description=(
            "REST API for managing TikTok accounts, uploading videos "
            "(local file or YouTube URL), and scheduling uploads. "
            "Backs the React web UI; shares its account store with the autotok CLI."
        ),
    )

    # Local-first tool — webapp and api are on the same compose network and
    # the api port binds to 127.0.0.1. CORS is permissive for dev convenience.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )

    @app.on_event("startup")
    def _startup() -> None:
        # Ensure the account store and video library exist on the shared volume.
        for d in (settings.accounts_dir(), settings.videos_dir()):
            os.makedirs(d, exist_ok=True)
        init_db()

    @app.get("/health", tags=["meta"])
    def health():
        return {"status": "ok"}

    app.include_router(accounts.router)
    app.include_router(videos.router)
    app.include_router(uploads.router)
    app.include_router(schedules.router)
    app.include_router(login.router)
    app.include_router(proxy.router)
    return app


app = create_app()
