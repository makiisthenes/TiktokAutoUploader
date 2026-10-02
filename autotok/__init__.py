"""autotok: upload and schedule TikTok videos from Python or the command line.

Quick start::

    import autotok

    autotok.login("alice")                       # opens a browser once
    autotok.upload_video("alice", "clip.mp4", "Hello #fyp")

    client = autotok.Client.from_account("alice", proxy="http://user:pass@host:8000")
    client.upload("clip.mp4", "Scheduled #fyp", schedule=3600)
"""
from __future__ import annotations

__version__ = "2.0.0"

from .accounts import Account, AccountStore
from .errors import (
    AccountNotFoundError,
    AutotokError,
    BrowserNotInstalledError,
    LoginError,
    MissingDependencyError,
    NotLoggedInError,
    PublishError,
    PublishUncertainError,
    SigningError,
    UploadError,
    ValidationError,
)
from .auth import import_session, login_interactive
from .env import load_env
from .proxy import Proxy, check_proxy, parse_proxy
from .uploader import Client, UploadResult, upload_video

login = login_interactive

__all__ = [
    "__version__",
    "Account",
    "AccountStore",
    "Client",
    "Proxy",
    "UploadResult",
    "check_proxy",
    "import_session",
    "load_env",
    "login",
    "login_interactive",
    "parse_proxy",
    "upload_video",
    "AutotokError",
    "AccountNotFoundError",
    "BrowserNotInstalledError",
    "LoginError",
    "MissingDependencyError",
    "NotLoggedInError",
    "PublishError",
    "PublishUncertainError",
    "SigningError",
    "UploadError",
    "ValidationError",
]
