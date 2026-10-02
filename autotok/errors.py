"""Exception hierarchy.

Every error raised on purpose by autotok derives from :class:`AutotokError`, so
callers can catch one type. ``retryable`` tells automation (the scheduler, your
own scripts) whether running the same upload again is safe: it is only ``True``
when the failure happened before anything was sent to TikTok's publish
endpoint, so a retry cannot create a duplicate post.
"""
from __future__ import annotations


class AutotokError(Exception):
    """Base class for all autotok errors."""

    retryable: bool = False


class ValidationError(AutotokError, ValueError):
    """Invalid input (caption too long, bad schedule, bad proxy string...)."""


class AccountNotFoundError(AutotokError):
    """No saved session exists for the requested account name."""


class NotLoggedInError(AutotokError):
    """The saved account has no TikTok ``sessionid`` cookie, or it expired."""


class LoginError(AutotokError):
    """The interactive login did not complete."""


class BrowserNotInstalledError(AutotokError):
    """Playwright's Chromium is missing. Run ``autotok install-browser``."""


class MissingDependencyError(AutotokError):
    """An optional extra (e.g. ``autotok[youtube]``) is not installed."""


class ConfigurationError(AutotokError):
    """A setting is missing or invalid (e.g. ``BROWSERBASE_API_KEY`` is not set)."""


class RemoteBrowserError(AutotokError):
    """A cloud browser (Browserbase) session could not be started or reached."""

    retryable = True


class SigningError(AutotokError):
    """Generating TikTok's request signatures failed (nothing was published)."""

    retryable = True


class UploadError(AutotokError):
    """The video could not be transferred to TikTok (nothing was published)."""

    retryable = True

    def __init__(self, message: str, *, status: int | None = None, body: str | None = None):
        super().__init__(message)
        self.status = status
        self.body = body


class PublishError(AutotokError):
    """TikTok rejected the post, e.g. invalid parameters or a guidelines block."""

    def __init__(self, message: str, *, status_code: int | None = None, status_msg: str | None = None,
                 response: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.status_msg = status_msg
        self.response = response or {}


class PublishUncertainError(AutotokError):
    """The publish request failed in transit, so the post may or may not exist.

    Check the account on TikTok before trying again.
    """
