"""Scheduler service entrypoint.

Runs inside its own container (see web/scheduler/Dockerfile). Reads the same
SQLite DB as the API, picks up due ScheduledUpload rows, and executes uploads
through the autotok package. Serial by design (SCHEDULER_CONCURRENCY=1 in env).
"""
from __future__ import annotations

import logging
import os

from api.db import init_db
from scheduler import worker


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )
    init_db()
    poll = float(os.getenv("SCHEDULER_POLL_SECONDS", "30"))
    worker.loop(poll_interval=poll)


if __name__ == "__main__":
    main()
