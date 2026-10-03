# Built by docker compose (see docker-compose.yml). `base` is the image built
# from web/base.Dockerfile. Without compose (from the repository root):
#   docker build -t tiktok-base -f web/base.Dockerfile .
#   docker build --build-context base=docker-image://tiktok-base -f web/api/Dockerfile -t tiktok-api .
FROM base

WORKDIR /app

COPY web/api /app/api

EXPOSE 8000

# Reload disabled in prod; enable via --reload when developing.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
