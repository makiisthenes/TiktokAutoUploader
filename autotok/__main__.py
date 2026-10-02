"""``python -m autotok`` — same as the ``autotok`` command.

Useful on Windows when pip's Scripts folder isn't on PATH.
"""
from .cli import run

run()
