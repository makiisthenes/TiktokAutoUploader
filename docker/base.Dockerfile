# Shared base image for the api, scheduler and novnc services.
# Python 3.11 + the autotok package (with YouTube support) + the web-app
# server dependencies + Playwright's Chromium and its system libraries.
FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/opt/playwright

# ffmpeg merges YouTube audio/video streams.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl ffmpeg fonts-liberation fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Server dependencies first for better layer caching.
COPY requirements-server.txt /app/requirements-server.txt
RUN pip install -r /app/requirements-server.txt

# The autotok package itself.
COPY pyproject.toml README.md LICENSE THIRD_PARTY_NOTICES.md /app/
COPY autotok /app/autotok
RUN pip install "/app[youtube]" \
    && python -m playwright install --with-deps chromium

ENV PYTHONPATH=/app

# Services append their own COPY + CMD.
