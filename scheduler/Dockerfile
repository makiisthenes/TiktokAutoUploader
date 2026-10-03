FROM base

WORKDIR /app

# Scheduler needs both the api package (for db, models, services) and its own
# worker module. Both get the shared /data volume mounted at runtime.
COPY api /app/api
COPY scheduler /app/scheduler

CMD ["python", "-m", "scheduler.main"]
