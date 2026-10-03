#!/usr/bin/env python3
"""Backwards-compatible entry point.

``python cli.py <command>`` is the same as the ``autotok <command>`` console
script installed by ``pip install autotok``. Run it from the repository root
after ``pip install -e .``.
"""
from autotok.cli import run

if __name__ == "__main__":
    run()
