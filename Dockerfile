# autotok command-line image.
#
#   docker build -t autotok .
#   docker run --rm -it -v autotok-data:/data autotok accounts list
#
# Data (saved accounts, videos) lives in /data; keep it in a volume or bind
# mount. Put videos in /data/videos (e.g. -v "$PWD/videos:/data/videos").
#
# Logging in needs a browser you can see, which a container doesn't have. Use a
# cloud browser and log in through the link it prints:
#
#   docker run --rm -it -v autotok-data:/data \
#     -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=... \
#     autotok login -n my_account
#
# (or AUTOTOK_BROWSER=steel with STEEL_API_KEY / STEEL_BASE_URL), or save a
# session cookie with: autotok login -n my_account --sessionid ... --datacenter ...
#
# Using a cloud browser for everything? Skip the local Chromium (~500 MB smaller):
#
#   docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .
FROM python:3.12-slim-bookworm

ARG INSTALL_BROWSER=true

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/opt/playwright \
    AUTOTOK_HOME=/data \
    AUTOTOK_VIDEOS_DIR=/data/videos

# ffmpeg merges YouTube audio and video streams.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml README.md LICENSE THIRD_PARTY_NOTICES.md ./
COPY autotok ./autotok
RUN pip install ".[youtube]" \
    && if [ "$INSTALL_BROWSER" = "true" ]; then \
         python -m playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*; \
       fi

# Run as an unprivileged user; /data is theirs.
RUN useradd --create-home --uid 1000 autotok \
    && mkdir -p /data/videos \
    && chown -R autotok:autotok /data
USER autotok
WORKDIR /data
VOLUME /data

ENTRYPOINT ["autotok"]
CMD ["--help"]
