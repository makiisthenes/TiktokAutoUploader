"""FastAPI application entry point.

Exposes CRUD and upload endpoints backed by SQLite. OpenAPI docs at /docs
render the Pydantic schemas defined in api.schemas — this is what satisfies
"all schemas are defined and presented in the API".
"""
from __future__ import annotations

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import autotok
from api.db import init_db
from api.routers import accounts, login, proxy, schedules, uploads, videos
from autotok import settings


# Browsers can't add custom headers to cross-site requests without a CORS
# preflight, which this API never approves. Requiring one on every request that
# changes something stops other web pages from driving the local API (CSRF).
CSRF_HEADER = "X-Requested-With"
CSRF_VALUE = "autotok"
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


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

    # The web app is served from the same origin (nginx / the Vite dev proxy),
    # so no cross-origin access is allowed unless explicitly configured.
    origins = [o.strip() for o in os.getenv("AUTOTOK_CORS_ORIGINS", "").split(",") if o.strip()]
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["*"],
            allow_headers=["*"],
            allow_credentials=False,
        )

    @app.middleware("http")
    async def _require_csrf_header(request: Request, call_next):
        if (
            request.method not in _SAFE_METHODS
            and request.url.path.startswith("/api/")
            and request.headers.get(CSRF_HEADER) != CSRF_VALUE
        ):
            return JSONResponse(
                {"detail": f"missing header {CSRF_HEADER}: {CSRF_VALUE}"}, status_code=403
            )
        return await call_next(request)

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
