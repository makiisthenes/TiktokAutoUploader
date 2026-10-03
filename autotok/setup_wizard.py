"""``autotok setup``: connect a TikTok account step by step.

Walks through what the README's Getting started section does by hand: the
browser, the account name, a proxy (the user's own, or one from a provider in
:mod:`autotok.proxy_providers`), a proxy test and the TikTok login.
"""
from __future__ import annotations

import webbrowser
from pathlib import Path
from typing import Callable, Protocol, Sequence, TypeVar

from .accounts import Account, AccountStore, validate_account_name
from .browsers import CloudProvider, get_provider
from .errors import AutotokError, ValidationError
from .proxy import Proxy, check_proxy
from .proxy_providers import ProxyProvider, proxy_providers

T = TypeVar("T")
STEPS = 4
_BACK = object()  # the user left the proxy prompt empty: show the proxy menu again


class UI(Protocol):
    def say(self, text: str = "") -> None: ...
    def heading(self, text: str) -> None: ...
    def choose(self, question: str, options: Sequence[tuple[T, str]], default: T | None = None) -> T: ...
    def ask(self, question: str) -> str: ...


class TerminalUI:
    """Arrow-key menus and prompts in the terminal (prompt_toolkit)."""

    def say(self, text: str = "") -> None:
        print(text, flush=True)

    def heading(self, text: str) -> None:
        from prompt_toolkit import print_formatted_text
        from prompt_toolkit.formatted_text import FormattedText

        print_formatted_text(FormattedText([("bold", f"\n{text}")]))

    def choose(self, question, options, default=None):
        from prompt_toolkit.shortcuts import choice

        return choice(question, options=list(options), default=default)

    def ask(self, question: str) -> str:
        from prompt_toolkit import prompt

        try:
            return prompt(f"{question} ")
        except EOFError:  # Ctrl+D
            raise KeyboardInterrupt from None


def run_setup(store: AccountStore, ui: UI | None = None, *,
              open_url: Callable[[str], object] = webbrowser.open,
              on_live_url: Callable[[str], None] | None = None) -> int:
    ui = ui or TerminalUI()
    ui.heading("autotok setup")
    ui.say("Connect a TikTok account in four steps: browser, account name, proxy and login.")
    ui.say("Press Ctrl+C to stop at any time.")

    ui.heading(f"[1/{STEPS}] Browser")
    if not _browser_step(ui):
        return 1

    ui.heading(f"[2/{STEPS}] Account name")
    name, existing = _account_step(ui, store)

    ui.heading(f"[3/{STEPS}] Proxy")
    proxy = _proxy_step(ui, existing, open_url)

    ui.heading(f"[4/{STEPS}] Log in to TikTok")
    logged_in = _login_step(ui, store, name, proxy, existing, on_live_url)

    via = f" with proxy {proxy.masked()}" if proxy else " without a proxy"
    if logged_in:
        ui.heading("All set")
        ui.say(f"'{name}' is saved{via}. Next:")
        ui.say(f"  autotok accounts check {name}")
        ui.say(f'  autotok upload -u {name} -v clip.mp4 -t "My caption #fyp"')
    elif existing:
        ui.heading("Saved")
        ui.say(f"'{name}' now connects{via}. Log in when you're ready:")
        ui.say(f"  autotok login -n {name} --force")
    else:
        ui.heading("Not saved yet")
        ui.say("The account is saved when you log in. When you're ready, run:")
        ui.say(f"  autotok login -n {name}" + (" -p <your proxy>" if proxy else ""))
    return 0


def _browser_step(ui: UI) -> bool:
    provider = get_provider()
    if isinstance(provider, CloudProvider):
        ui.say(f"Using the {provider.label} cloud browser (AUTOTOK_BROWSER), so there's nothing to install.")
        return True
    if _chromium_installed():
        ui.say("Chromium is installed.")
        return True
    ui.say("autotok needs Chromium (about 300 MB) for the TikTok login and to sign uploads.")
    if not ui.choose("Download it now?", [(True, "Yes, download Chromium"), (False, "No, stop setup")]):
        ui.say("Run 'autotok install-browser', then 'autotok setup' again.")
        return False
    from .browsers import install_browser

    if install_browser() != 0:
        ui.say("The download failed. On a fresh Linux server, run 'autotok install-browser --with-deps' "
               "as root, then 'autotok setup' again.")
        return False
    return True


def _chromium_installed() -> bool:
    from . import settings
    from .browsers import sync_playwright

    if settings.browser_executable() or settings.browser_channel():
        return True  # the user points autotok at a browser of their own
    try:
        with sync_playwright() as pw:
            return Path(pw.chromium.executable_path).exists()
    except Exception:
        return False


def _account_step(ui: UI, store: AccountStore) -> tuple[str, Account | None]:
    ui.say("Pick a name to use this account by, e.g. 'my_account' (letters, digits, . _ -).")
    while True:
        name = ui.ask("Account name:").strip()
        try:
            validate_account_name(name)
        except ValidationError as exc:
            ui.say(f"  {exc}")
            continue
        if not store.exists(name):
            return name, None
        if ui.choose(f"'{name}' is already saved. Set it up again?",
                     [(True, "Yes, set it up again"), (False, "No, pick another name")]):
            return name, store.load(name)


def _proxy_step(ui: UI, existing: Account | None, open_url: Callable[[str], object]) -> Proxy | None:
    ui.say("A proxy gives this account its own IP address. Running several accounts? Use one")
    ui.say("residential proxy per account, with a sticky session (the same IP for hours).")
    current = existing.get_proxy() if existing else None
    while True:
        options: list = []
        if current:
            options.append(("keep", f"Keep the current proxy ({current.masked()})"))
        options.append(("own", "I have a proxy, paste it"))
        for p in proxy_providers():
            sponsor = " (sponsor)" if p.sponsor else ""
            options.append((p, f"Get a proxy from {p.name}{sponsor}: {p.tagline}"))
        options.append(("none", "No proxy, connect directly"))
        picked = ui.choose("Proxy for this account:", options, default=options[0][0])
        if picked == "keep":
            return current
        if picked == "none":
            return None
        if isinstance(picked, ProxyProvider):
            _open_provider(ui, picked, open_url)
        proxy = _paste_proxy(ui)
        if proxy is not _BACK:
            return proxy


def _open_provider(ui: UI, provider: ProxyProvider, open_url: Callable[[str], object]) -> None:
    ui.say(f"Opening {provider.name} in your browser: {provider.signup_url}")
    try:
        open_url(provider.signup_url)
    except Exception:  # no desktop browser (servers, containers): the link is printed above
        pass
    for i, step in enumerate(provider.steps, 1):
        ui.say(f"  {i}. {step}")
    ui.say(f"Then come back and paste the proxy here ({provider.proxy_format}).")


def _paste_proxy(ui: UI):
    """Ask for a proxy and test it. Returns a Proxy, or _BACK."""
    local = not isinstance(get_provider(), CloudProvider)
    while True:
        raw = ui.ask("Proxy (Enter to go back):").strip()
        if not raw:
            return _BACK
        try:
            proxy = Proxy.parse(raw)
            if local:
                proxy.for_playwright()  # the login browser has to be able to use it
        except ValidationError as exc:
            ui.say(f"  {exc}")
            continue
        ui.say(f"Testing {proxy.masked()}...")
        try:
            ip = check_proxy(proxy)
        except AutotokError as exc:
            ui.say(f"  {exc}")
            action = ui.choose("The proxy didn't work. What now?", [
                ("retry", "Paste a different proxy"),
                ("use", "Use it anyway"),
                ("back", "Go back"),
            ])
            if action == "use":
                return proxy
            if action == "back":
                return _BACK
            continue
        ui.say(f"  It works. TikTok will see IP {ip}.")
        return proxy


def _login_step(ui: UI, store: AccountStore, name: str, proxy: Proxy | None,
                existing: Account | None, on_live_url: Callable[[str], None] | None) -> bool:
    provider = get_provider()
    cloud = isinstance(provider, CloudProvider)
    where = f"a {provider.label} cloud browser (you'll get a link)" if cloud else "a browser window"
    if not ui.choose("Log in to TikTok now?", [(True, f"Yes, open {where}"), (False, "Later")]):
        if existing:
            store.set_proxy(name, proxy)
        return False
    ui.say("Log in to TikTok there; the QR code with the TikTok app on your phone is quickest.")
    if not cloud:
        ui.say("The window closes by itself once you're in.")
    from .auth import login_interactive

    login_interactive(name, proxy=proxy, store=store, on_live_url=on_live_url)
    return True
