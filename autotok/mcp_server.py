"""MCP server: lets AI agents (Claude, Cursor, VS Code...) use autotok.

Run it with ``autotok mcp`` (stdio, what desktop clients launch) or
``autotok mcp --http`` (streamable HTTP on ``http://127.0.0.1:8000/mcp``).
Needs the ``mcp`` extra: ``pip install "autotok[mcp]"``.

The tools work on the same saved accounts as the CLI. Saved sessions never
leave this process and proxies are always shown masked. The SDK runs these
sync tools in worker threads, which also keeps Playwright's sync API (login,
request signing) off the server's event loop.
"""
import functools
import threading
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any, Callable, Literal, Optional, TypeVar

from . import __version__, auth, settings
from .accounts import AccountStore, validate_account_name
from .browsers import CloudProvider, get_provider
from .errors import (
    AccountNotFoundError,
    AutotokError,
    MissingDependencyError,
    NotLoggedInError,
    PublishUncertainError,
    ValidationError,
)
from .proxy import check_proxy, parse_proxy
from .uploader import MAX_CAPTION_LENGTH, Client

try:  # pydantic comes with mcp
    from mcp.server.mcpserver import MCPServer
    from mcp.server.mcpserver.exceptions import ToolError
    from mcp.types import ToolAnnotations
    from pydantic import Field
except ImportError:  # without the mcp extra
    raise MissingDependencyError('The MCP server needs the mcp extra: pip install "autotok[mcp]"') from None

INSTRUCTIONS = f"""\
autotok uploads videos to TikTok accounts that were logged in on this computer.

Typical flow: list_accounts, then upload_video. If the account isn't listed, call login and
tell the user to finish logging in (a browser window on this computer, or the live_url you get
back), then poll login_status until it says saved.

- Every upload is a real post, public unless private is true. When the account, video or caption
  is unclear, confirm with the user before uploading.
- Captions: up to {MAX_CAPTION_LENGTH} characters. #hashtags and @mentions become clickable.
- Scheduling: 15 minutes to 30 days ahead (some accounts only allow 10 days). Private videos
  can't be scheduled.
- An error that says the post may or may not exist must not be retried: ask the user to check
  the account on TikTok first, or the video may be posted twice.
"""

LOGIN_TIMEOUT = 600.0
# How long login waits before answering: long enough for a cloud browser to hand back its live
# URL, and for a local browser to fail fast (say, Chromium not installed).
CLOUD_URL_WAIT = 60.0
LOCAL_START_WAIT = 3.0

READ_ONLY = ToolAnnotations(read_only_hint=True, destructive_hint=False, open_world_hint=False)
READ_ONLY_REMOTE = ToolAnnotations(read_only_hint=True, destructive_hint=False, open_world_hint=True)

AccountName = Annotated[str, Field(description="Saved account name, as shown by list_accounts.")]
ProxyUrl = Annotated[
    Optional[str],
    Field(description="Proxy URL such as http://user:pass@host:port or socks5://host:port."),
]

F = TypeVar("F", bound=Callable[..., Any])


def _describe(exc: AutotokError) -> str:
    msg = str(exc) or type(exc).__name__
    if isinstance(exc, PublishUncertainError):
        return (f"{msg} The post may or may not exist. Do not retry: ask the user to check the "
                "account on TikTok first, or the video may be posted twice.")
    if exc.retryable:
        return f"{msg} Nothing was published, so it is safe to try again."
    if isinstance(exc, (AccountNotFoundError, NotLoggedInError)):
        return f"{msg} (Here: call the login tool.)"
    return msg


def _tool_errors(fn: F) -> F:
    """Report autotok's own errors to the agent as tool errors, with retry advice."""

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except AutotokError as exc:
            raise ToolError(_describe(exc)) from exc

    return wrapper  # type: ignore[return-value]


def _parse_when(value: str) -> datetime:
    text = value.strip()
    if text.endswith(("Z", "z")):  # fromisoformat only accepts "Z" from Python 3.11
        text = text[:-1] + "+00:00"
    try:
        when = datetime.fromisoformat(text)
    except ValueError:
        raise ValidationError(f"schedule_at is not an ISO 8601 date and time: {value!r}") from None
    if when.tzinfo is None:
        raise ValidationError("schedule_at needs a UTC offset, e.g. 2026-05-01T18:00:00+01:00 or ...Z")
    return when


@dataclass
class _Login:
    status: Literal["waiting", "saved", "failed"] = "waiting"
    live_url: Optional[str] = None
    error: Optional[str] = None

    def view(self, account: str) -> dict:
        out: dict = {"account": account, "status": self.status}
        if self.status == "waiting":
            out["message"] = (
                f"Ask the user to log in to TikTok at {self.live_url}" if self.live_url else
                "A browser window opened on this computer. Ask the user to log in to TikTok "
                "there; scanning the QR code with the TikTok app is quickest."
            ) + " Then call login_status."
        if self.live_url and self.status == "waiting":
            out["live_url"] = self.live_url
        if self.error:
            out["error"] = self.error
        return out


def create_server(store: Optional[AccountStore] = None, *,
                  log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "WARNING") -> MCPServer:
    """Build the MCP server. ``store`` defaults to the accounts in ``$AUTOTOK_HOME``."""
    store = store or AccountStore()
    logins: dict[str, _Login] = {}
    lock = threading.Lock()

    server = MCPServer(
        name="autotok",
        title="autotok: TikTok uploader",
        instructions=INSTRUCTIONS,
        version=__version__,
        website_url="https://github.com/makiisthenes/TiktokAutoUploader",
        log_level=log_level,
    )

    @server.tool(annotations=READ_ONLY)
    @_tool_errors
    def list_accounts() -> dict:
        """List the saved TikTok accounts, whether each has a session, and its proxy (masked)."""
        out = []
        for name in store.list():
            try:
                acct = store.load(name)
            except AutotokError as exc:
                out.append({"name": name, "error": str(exc)})
                continue
            proxy = acct.get_proxy()
            out.append({"name": name, "logged_in": acct.has_session,
                        "proxy": proxy.masked() if proxy else None})
        return {"accounts": out}

    @server.tool(annotations=READ_ONLY_REMOTE)
    @_tool_errors
    def check_account(account: AccountName) -> dict:
        """Ask TikTok whether the account's saved session still works for uploads."""
        ok = Client.from_account(account, store=store).check_session()
        return {"account": account, "session_ok": ok,
                "message": "Session OK." if ok else "TikTok rejected the session. Log in again with force=true."}

    @server.tool(annotations=READ_ONLY)
    @_tool_errors
    def list_videos() -> dict:
        """List the files in the videos folder. upload_video accepts these by file name."""
        videos = []
        for d in settings.video_search_dirs():
            if d.is_dir():
                videos.extend({"name": p.name, "path": str(p), "size_mb": round(p.stat().st_size / 1e6, 1)}
                              for p in sorted(d.iterdir()) if p.is_file())
        return {"videos_dir": str(settings.videos_dir()), "videos": videos}

    @server.tool(annotations=ToolAnnotations(read_only_hint=False, destructive_hint=False,
                                             idempotent_hint=False, open_world_hint=True))
    @_tool_errors
    def upload_video(
        account: AccountName,
        caption: Annotated[str, Field(description=f"Post caption, at most {MAX_CAPTION_LENGTH} characters. "
                                                   "#hashtags and @mentions become clickable.")],
        video: Annotated[Optional[str], Field(description="Path to a video file, or a file name in the "
                                                          "videos folder (see list_videos).")] = None,
        youtube_url: Annotated[Optional[str], Field(description="Download this YouTube video and upload it, "
                                                                "instead of video.")] = None,
        schedule_in_minutes: Annotated[Optional[int], Field(description="Publish this many minutes from now "
                                                                        "(15 to 43200).")] = None,
        schedule_at: Annotated[Optional[str], Field(description="Publish at this ISO 8601 time with a UTC "
                                                                "offset, 15 minutes to 30 days ahead.")] = None,
        private: Annotated[bool, Field(description="Only the account owner can see the post.")] = False,
        allow_comments: bool = True,
        allow_duet: bool = False,
        allow_stitch: bool = False,
        ai_generated: Annotated[bool, Field(description="Label the post as AI-generated content.")] = False,
    ) -> dict:
        """Upload a video to a TikTok account and post it now or at a scheduled time.

        Give exactly one of video or youtube_url, and at most one of schedule_in_minutes or
        schedule_at. Returns the TikTok video id.
        """
        if (video is None) == (youtube_url is None):
            raise ValidationError("give exactly one of video or youtube_url")
        if schedule_in_minutes is not None and schedule_at is not None:
            raise ValidationError("give at most one of schedule_in_minutes or schedule_at")
        schedule: Any = None
        if schedule_in_minutes is not None:
            schedule = schedule_in_minutes * 60
        elif schedule_at is not None:
            schedule = _parse_when(schedule_at)

        client = Client.from_account(account, store=store)
        source = video
        if youtube_url is not None:
            from .youtube import download

            source = str(download(youtube_url))  # like the CLI's -yt: downloaded without the proxy
        result = client.upload(
            source, caption, schedule=schedule, visibility="private" if private else "public",
            allow_comment=allow_comments, allow_duet=allow_duet, allow_stitch=allow_stitch,
            ai_label=ai_generated,
        )
        out = {"account": account, "video_id": result.video_id,
               "status": "scheduled" if result.scheduled_for else "published"}
        if result.scheduled_for:
            out["scheduled_for"] = result.scheduled_for.isoformat()
        if youtube_url is not None:
            out["downloaded_to"] = source
        return out

    @server.tool(annotations=ToolAnnotations(read_only_hint=False, destructive_hint=False,
                                             idempotent_hint=False, open_world_hint=True))
    @_tool_errors
    def login(
        account: Annotated[str, Field(description="Name to save the account under: letters, digits, '.', '_' "
                                                  "or '-'.")],
        proxy: ProxyUrl = None,
        force: Annotated[bool, Field(description="Log in again even if a session is already saved.")] = False,
    ) -> dict:
        """Start logging in to a TikTok account. A person has to finish it.

        With the local browser a window opens on this computer; with a cloud browser the result
        has a live_url for the user. Poll login_status until it says saved. Logging in again
        keeps the account's saved proxy unless a new one is given.
        """
        validate_account_name(account)
        with lock:
            job = logins.get(account)
            if job and job.status == "waiting":
                return job.view(account)
            existing = store.load(account) if store.exists(account) else None
            if existing and existing.has_session and not force:
                return {"account": account, "status": "saved",
                        "message": "A session is already saved. Pass force=true to log in again."}
            p = parse_proxy(proxy or (existing.proxy if existing else None))
            job = logins[account] = _Login()

        answered = threading.Event()

        def on_live_url(url: str) -> None:
            job.live_url = url
            answered.set()

        def run() -> None:
            try:
                auth.login_interactive(account, proxy=p, timeout=LOGIN_TIMEOUT, store=store,
                                       on_live_url=on_live_url)
                job.status = "saved"
            except Exception as exc:  # reported through login_status
                job.error = _describe(exc) if isinstance(exc, AutotokError) else f"{type(exc).__name__}: {exc}"
                job.status = "failed"
            finally:
                answered.set()

        threading.Thread(target=run, name=f"autotok-login-{account}", daemon=True).start()
        try:
            cloud = isinstance(get_provider(), CloudProvider)
        except AutotokError:
            cloud = False  # the login thread reports the configuration error
        answered.wait(CLOUD_URL_WAIT if cloud else LOCAL_START_WAIT)
        return job.view(account)

    @server.tool(annotations=READ_ONLY)
    @_tool_errors
    def login_status(account: AccountName) -> dict:
        """Check on a login started with login: waiting, saved or failed."""
        validate_account_name(account)
        job = logins.get(account)
        if job is not None:
            return job.view(account)
        if store.exists(account):
            return {"account": account, "status": "saved"}
        return {"account": account, "status": "not_started",
                "message": "No login in progress and no saved session. Call login first."}

    @server.tool(annotations=ToolAnnotations(read_only_hint=False, destructive_hint=False,
                                             idempotent_hint=True, open_world_hint=False))
    @_tool_errors
    def set_proxy(
        account: AccountName,
        proxy: Annotated[Optional[str], Field(description="Proxy URL to save, or null to remove the account's "
                                                          "proxy.")],
    ) -> dict:
        """Save or remove the proxy an account logs in, signs and uploads through."""
        acct = store.set_proxy(account, proxy)
        p = acct.get_proxy()
        return {"account": account, "proxy": p.masked() if p else None}

    @server.tool(annotations=READ_ONLY_REMOTE)
    @_tool_errors
    def test_proxy(
        account: Annotated[Optional[str], Field(description="Test this account's saved proxy.")] = None,
        proxy: ProxyUrl = None,
    ) -> dict:
        """Show the public IP TikTok will see, through an account's proxy or a given one.

        With neither, tests the direct connection.
        """
        if account is not None and proxy is not None:
            raise ValidationError("give at most one of account or proxy")
        p = store.load(account).get_proxy() if account is not None else parse_proxy(proxy)
        return {"proxy": p.masked() if p else "direct connection", "public_ip": check_proxy(p)}

    return server


__all__ = ["create_server", "INSTRUCTIONS"]
