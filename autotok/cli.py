"""The ``autotok`` command line.

Flag names match TiktokAutoUploader 1.x, so ``python cli.py upload -u alice -v
clip.mp4 -t "caption"`` keeps working (``cli.py`` in the repo forwards here).
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import shlex
import sys
import webbrowser

from . import __version__
from .accounts import AccountStore
from .browsers import CloudProvider, available_providers, get_provider
from .errors import AutotokError, ValidationError
from .proxy import check_proxy, parse_proxy

log = logging.getLogger("autotok")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="autotok",
        description="Upload and schedule TikTok videos from the command line.",
    )
    parser.add_argument("--version", action="version", version=f"autotok {__version__}")
    parser.add_argument("-q", "--quiet", action="store_true", help="only print errors")
    parser.add_argument("--debug", action="store_true", help="verbose logging")
    parser.add_argument("--browser", choices=available_providers(),
                        help="where the login/signing browser runs (default: $AUTOTOK_BROWSER or local)")
    sub = parser.add_subparsers(dest="command", metavar="<command>")

    sub.add_parser("setup", help="connect a TikTok account step by step: browser, proxy and login")

    lp = sub.add_parser("login", help="log in to TikTok and save the session")
    lp.add_argument("-n", "--name", required=True, help="name to save this account under")
    lp.add_argument("-p", "--proxy", help="proxy for this account (used for login and every upload)")
    lp.add_argument("--force", action="store_true", help="log in again even if a session is saved")
    lp.add_argument("--sessionid", help="save this sessionid cookie instead of opening a browser")
    lp.add_argument("--datacenter", help="tt-target-idc cookie value to save with --sessionid")
    lp.add_argument("--timeout", type=int, default=600, help="seconds to wait for the login (default 600)")

    up = sub.add_parser("upload", help="upload a video")
    up.add_argument("-u", "--user", "--users", dest="user", required=True, help="saved account name")
    src = up.add_mutually_exclusive_group(required=True)
    src.add_argument("-v", "--video", help="video file (path, or a name inside your videos folder)")
    src.add_argument("-yt", "--youtube", help="YouTube URL to download and upload")
    up.add_argument("-t", "--title", required=True, help="caption, up to 2200 characters")
    up.add_argument("-sc", "--schedule", type=int, default=0,
                    help="publish this many seconds from now (900 to 2592000, TikTok-side "
                         "scheduling; some accounts only allow up to 864000)")
    up.add_argument("-vi", "--visibility", type=int, choices=[0, 1], default=0, help="0 = public, 1 = private")
    up.add_argument("-ct", "--comment", type=int, choices=[0, 1], default=1, help="allow comments")
    up.add_argument("-d", "--duet", type=int, choices=[0, 1], default=0, help="allow duets")
    up.add_argument("-st", "--stitch", type=int, choices=[0, 1], default=0, help="allow stitches")
    up.add_argument("-ai", "--ailabel", type=int, choices=[0, 1], default=0, help="label as AI-generated")
    proxy_group = up.add_mutually_exclusive_group()
    proxy_group.add_argument("-p", "--proxy", help="proxy for this upload (default: the account's saved proxy)")
    proxy_group.add_argument("--no-proxy", action="store_true", help="ignore the account's saved proxy")
    # Accepted for compatibility with 1.x scripts; they were never sent to TikTok.
    up.add_argument("-bo", "--brandorganic", type=int, default=0, help=argparse.SUPPRESS)
    up.add_argument("-bc", "--brandcontent", type=int, default=0, help=argparse.SUPPRESS)

    sp = sub.add_parser("show", help="list saved accounts or videos")
    sp.add_argument("-u", "--users", action="store_true", help="list saved accounts")
    sp.add_argument("-v", "--videos", action="store_true", help="list videos in your videos folder")

    ap = sub.add_parser("accounts", help="manage saved accounts")
    asub = ap.add_subparsers(dest="action", metavar="<action>", required=True)
    asub.add_parser("list", help="list accounts with their proxy")
    ar = asub.add_parser("remove", help="delete a saved session")
    ar.add_argument("name")
    ac = asub.add_parser("check", help="check that TikTok still accepts the saved session")
    ac.add_argument("name")

    pp = sub.add_parser("proxy", help="set, clear or test proxies")
    psub = pp.add_subparsers(dest="action", metavar="<action>", required=True)
    ps = psub.add_parser("set", help="save a proxy for an account")
    ps.add_argument("name")
    ps.add_argument("proxy")
    pc = psub.add_parser("clear", help="remove an account's proxy")
    pc.add_argument("name")
    pt = psub.add_parser("test", help="show the IP TikTok will see")
    pt.add_argument("proxy", nargs="?", help="proxy URL to test")
    pt.add_argument("-u", "--user", help="test this account's saved proxy")

    ib = sub.add_parser("install-browser", help="download the Chromium build autotok uses")
    ib.add_argument("--with-deps", action="store_true", help="also install system libraries (Linux, needs root)")

    bp = sub.add_parser("browser", help="check the login/signing browser (local or cloud)")
    bsub = bp.add_subparsers(dest="action", metavar="<action>", required=True)
    bc = bsub.add_parser("check", help="start the browser and show the IP it browses from")
    bc.add_argument("-u", "--user", help="use this account's proxy")

    sub.add_parser("shell", help="interactive prompt")

    mp = sub.add_parser("mcp", help="run an MCP server so AI agents can use autotok (needs autotok[mcp])")
    mp.add_argument("--http", action="store_true",
                    help="serve streamable HTTP at http://HOST:PORT/mcp instead of stdio")
    mp.add_argument("--host", default="127.0.0.1", help="HTTP address to listen on (default: 127.0.0.1)")
    mp.add_argument("--port", type=int, default=8000, help="HTTP port (default: 8000)")
    return parser


# -- commands -------------------------------------------------------------------


def cmd_setup(args, store: AccountStore) -> int:
    from .setup_wizard import run_setup

    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        print("autotok setup is interactive; run it in a terminal. Without one, use:\n"
              "  autotok login -n <name> -p <proxy>", file=sys.stderr)
        return 2
    return run_setup(store, on_live_url=_show_live_url)


def cmd_login(args, store: AccountStore) -> int:
    from .auth import import_session, login_interactive

    existing = store.load(args.name) if store.exists(args.name) else None
    if existing and not args.force and not args.sessionid:
        print(f"A session for '{args.name}' is already saved. Use --force to log in again.")
        return 0
    # Logging in again keeps the account's saved proxy unless -p is given.
    proxy = args.proxy or (existing.proxy if existing else None)
    if args.sessionid:
        import_session(args.name, args.sessionid, datacenter=args.datacenter,
                       user_agent=existing.user_agent if existing else None, proxy=proxy, store=store)
        print(f"Saved session for '{args.name}'.")
        if not args.datacenter:
            print("Tip: also pass --datacenter <tt-target-idc cookie value> to avoid upload errors.")
        return 0
    provider = get_provider()
    if isinstance(provider, CloudProvider):
        print(f"Starting a {provider.label} cloud browser...")
    else:
        print("A browser window will open. Log in to TikTok there; it closes by itself when done.")
    if proxy:
        print(f"Using proxy {parse_proxy(proxy).masked()}")
    login_interactive(args.name, proxy=proxy, timeout=args.timeout, store=store, on_live_url=_show_live_url)
    print(f"Account '{args.name}' saved.")
    return 0


def _show_live_url(url: str) -> None:
    print("\nOpen this link in your browser and log in to TikTok there. "
          "The session is saved as soon as you're in:")
    print(f"  {url}\n", flush=True)
    try:
        webbrowser.open(url)
    except Exception:  # no desktop browser (servers, containers)
        pass


def cmd_upload(args, store: AccountStore) -> int:
    from .uploader import Client

    if args.brandorganic or args.brandcontent:
        log.warning("--brandorganic/--brandcontent are not supported and are ignored")
    if args.no_proxy:
        proxy = None
    elif args.proxy:
        proxy = parse_proxy(args.proxy)
    else:
        proxy = True  # the account's saved proxy
    client = Client.from_account(args.user, store=store, proxy=proxy)

    video = args.video
    if args.youtube:
        from .youtube import download

        video = download(args.youtube)
        print(f"Downloaded {video}")

    result = client.upload(
        video,
        args.title,
        schedule=args.schedule or None,
        visibility=args.visibility,
        allow_comment=bool(args.comment),
        allow_duet=bool(args.duet),
        allow_stitch=bool(args.stitch),
        ai_label=bool(args.ailabel),
    )
    when = f" (scheduled for {result.scheduled_for.astimezone():%Y-%m-%d %H:%M %Z})" if result.scheduled_for else ""
    print(f"Published{when}. Video id: {result.video_id}")
    return 0


def cmd_show(args, store: AccountStore) -> int:
    from . import settings

    if not args.users and not args.videos:
        print("Use -u to list accounts or -v to list videos.")
        return 1
    if args.users:
        names = store.list()
        print("Saved accounts:" if names else "No saved accounts. Run: autotok login -n <name>")
        for n in names:
            print(f"  {n}")
    if args.videos:
        files = []
        for d in settings.video_search_dirs():
            if d.is_dir():
                files.extend(p for p in sorted(d.iterdir()) if p.is_file())
        print("Videos:" if files else f"No videos in {settings.videos_dir()}")
        for p in files:
            print(f"  {p.name}  ({p.parent})")
    return 0


def cmd_accounts(args, store: AccountStore) -> int:
    if args.action == "list":
        names = store.list()
        if not names:
            print("No saved accounts. Run: autotok login -n <name>")
        for n in names:
            acct = store.load(n)
            proxy = acct.get_proxy()
            print(f"  {n:<24} session: {'yes' if acct.has_session else 'NO':<4} "
                  f"proxy: {proxy.masked() if proxy else '-'}")
        return 0
    if args.action == "remove":
        if store.delete(args.name):
            print(f"Removed '{args.name}'.")
            return 0
        print(f"No saved account '{args.name}'.", file=sys.stderr)
        return 1
    if args.action == "check":
        from .uploader import Client

        ok = Client.from_account(args.name, store=store).check_session()
        print(f"'{args.name}': {'session OK' if ok else 'session rejected, log in again with --force'}")
        return 0 if ok else 1
    return 1


def cmd_proxy(args, store: AccountStore) -> int:
    if args.action == "set":
        acct = store.set_proxy(args.name, args.proxy)
        print(f"Proxy for '{args.name}' set to {acct.get_proxy().masked()}")
        return 0
    if args.action == "clear":
        store.set_proxy(args.name, None)
        print(f"Proxy for '{args.name}' cleared.")
        return 0
    if args.action == "test":
        if args.user:
            proxy = store.load(args.user).get_proxy()
            if proxy is None:
                print(f"'{args.user}' has no proxy saved; testing your direct connection.")
        else:
            proxy = parse_proxy(args.proxy)
        label = proxy.masked() if proxy else "direct connection"
        ip = check_proxy(proxy)
        print(f"{label} -> public IP {ip}")
        return 0
    return 1


def cmd_install_browser(args, store: AccountStore) -> int:
    from .browsers import install_browser

    provider = get_provider()
    if isinstance(provider, CloudProvider):
        print(f"Not needed: browsers run on {provider.label} (AUTOTOK_BROWSER). "
              "Use --browser local to install Chromium for local mode.")
        return 0
    return install_browser(with_deps=args.with_deps)


def cmd_browser(args, store: AccountStore) -> int:
    from .browsers import sync_playwright
    from .proxy import IP_ECHO_URL

    provider = get_provider()
    proxy = store.load(args.user).get_proxy() if args.user else None
    print(f"Provider: {provider.label}" + (f" via proxy {proxy.masked()}" if proxy else ""))
    with sync_playwright() as pw:
        handle = provider.open(pw, headless=True, proxy=proxy, timeout=120)
        try:
            page = handle.page(handle.context())
            if handle.is_remote:
                print(f"Session: {handle.session.id}")
            print(f"User agent: {page.evaluate('() => navigator.userAgent')}")
            try:
                page.goto(IP_ECHO_URL, timeout=30_000)
                text = page.inner_text("body").strip()
                try:
                    text = json.loads(text)["ip"]
                except (ValueError, KeyError, TypeError):
                    pass
                print(f"Browsing from IP: {text}")
            except Exception as exc:
                print(f"Could not load a page ({exc}); check the proxy.", file=sys.stderr)
                return 1
        finally:
            handle.close()
    print("Browser OK.")
    return 0


def cmd_shell(args, store: AccountStore) -> int:
    try:
        from prompt_toolkit import PromptSession

        ask = PromptSession().prompt
    except ImportError:
        ask = input
    print(f"autotok {__version__} shell. Type a command (e.g. 'show -u'), 'help', or 'exit'.")
    while True:
        try:
            line = ask("autotok> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if line in ("exit", "quit"):
            return 0
        if not line:
            continue
        argv = ["--help"] if line == "help" else shlex.split(line)
        if argv and argv[0] == "shell":
            continue
        try:
            main(argv, _store=store)
        except SystemExit:
            pass


def cmd_mcp(args, store: AccountStore) -> int:
    from .mcp_server import create_server

    server = create_server(store, log_level="DEBUG" if args.debug else "WARNING")
    if not args.http:
        server.run("stdio")  # stdout carries the protocol; logs go to stderr
        return 0
    if args.host not in ("127.0.0.1", "localhost", "::1"):
        log.warning("Listening on %s with no authentication: anyone who can reach this port can "
                    "upload to your TikTok accounts.", args.host)
    log.info("MCP server at http://%s:%d/mcp", args.host, args.port)
    server.run("streamable-http", host=args.host, port=args.port)
    return 0


COMMANDS = {
    "setup": cmd_setup,
    "login": cmd_login,
    "upload": cmd_upload,
    "show": cmd_show,
    "accounts": cmd_accounts,
    "proxy": cmd_proxy,
    "install-browser": cmd_install_browser,
    "browser": cmd_browser,
    "shell": cmd_shell,
    "mcp": cmd_mcp,
}


def _configure_logging(quiet: bool, debug: bool) -> None:
    level = logging.DEBUG if debug else logging.ERROR if quiet else logging.INFO
    if not log.handlers:
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter("%(message)s"))
        log.addHandler(handler)
    log.setLevel(level)
    log.propagate = False


def main(argv: "list[str] | None" = None, *, _store: AccountStore | None = None) -> int:
    from .env import load_env

    load_env()  # .env in the current directory, then $AUTOTOK_HOME/.env
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command is None:
        parser.print_help()
        print("\nNew here? Run: autotok setup")
        return 1
    _configure_logging(args.quiet, args.debug)
    if args.browser:
        os.environ["AUTOTOK_BROWSER"] = args.browser
    try:
        return COMMANDS[args.command](args, _store or AccountStore())
    except ValidationError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except AutotokError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\ncancelled", file=sys.stderr)
        return 130


def run() -> None:
    sys.exit(main())


if __name__ == "__main__":
    run()
