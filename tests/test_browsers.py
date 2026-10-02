"""Browser providers: the factory, Browserbase and Steel (mocked HTTP), and
the cloud code path end to end against a local Chromium posing as the cloud."""
import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

import pytest
import responses

from autotok import browsers
from autotok.browsers import (
    BrowserbaseProvider,
    CloudProvider,
    CloudSession,
    LocalProvider,
    SteelProvider,
    get_provider,
    register_provider,
)
from autotok.browsers.http import reachable
from autotok.errors import ConfigurationError, RemoteBrowserError, ValidationError
from autotok.proxy import Proxy

BB = "https://api.browserbase.com/v1"


# -- factory ----------------------------------------------------------------------


def test_factory_picks_provider_from_env(monkeypatch):
    assert isinstance(get_provider(), LocalProvider)
    monkeypatch.setenv("AUTOTOK_BROWSER", "Browserbase")
    assert isinstance(get_provider(), BrowserbaseProvider)
    monkeypatch.setenv("AUTOTOK_BROWSER", "steel")
    assert isinstance(get_provider(), SteelProvider)
    assert isinstance(get_provider("local"), LocalProvider)


def test_unknown_provider(monkeypatch):
    monkeypatch.setenv("AUTOTOK_BROWSER", "nope")
    with pytest.raises(ConfigurationError, match="browserbase, local, steel"):
        get_provider()


def test_register_custom_provider(monkeypatch):
    class Custom(LocalProvider):
        label = "custom"

    monkeypatch.setitem(browsers._REGISTRY, "custom", Custom)
    register_provider("Custom", Custom)
    assert "custom" in browsers.available_providers()
    assert get_provider("custom").label == "custom"


def test_cloud_open_releases_session_when_connect_fails():
    released = []

    class FakeSession(CloudSession):
        id = "s1"
        connect_url = "ws://nowhere"

        def live_view_url(self):
            return "https://live"

        def release(self):
            released.append(self.id)

    class Fake(CloudProvider):
        label = "Fake"

        def create_session(self, *, proxy=None, timeout=None):
            return FakeSession()

    class PW:
        class chromium:
            @staticmethod
            def connect_over_cdp(url):
                raise RuntimeError("refused")

    with pytest.raises(RemoteBrowserError, match="Fake"):
        Fake().open(PW())
    assert released == ["s1"]


# -- Browserbase --------------------------------------------------------------------


def test_browserbase_needs_api_key():
    with pytest.raises(ConfigurationError, match="BROWSERBASE_API_KEY"):
        BrowserbaseProvider().create_session()


@responses.activate
def test_browserbase_create_session(monkeypatch):
    monkeypatch.setenv("BROWSERBASE_API_KEY", "bb_key")
    monkeypatch.setenv("BROWSERBASE_PROJECT_ID", "proj")
    monkeypatch.setenv("BROWSERBASE_REGION", "eu-central-1")
    responses.add(responses.POST, f"{BB}/sessions", status=201,
                  json={"id": "sess1", "connectUrl": "wss://connect.browserbase.com?signingKey=x"})
    session = BrowserbaseProvider().create_session(
        proxy=Proxy.parse("http://user:pw@proxy.example:8000"), timeout=900)
    call = responses.calls[0]
    assert call.request.headers["X-BB-API-Key"] == "bb_key"
    assert json.loads(call.request.body) == {
        "projectId": "proj", "region": "eu-central-1", "timeout": 900,
        "proxies": [{"type": "external", "server": "http://proxy.example:8000",
                     "username": "user", "password": "pw"}],
    }
    assert session.id == "sess1" and session.connect_url.startswith("wss://")
    assert "bb_key" not in repr(session) and "signingKey" not in repr(session)


@responses.activate
def test_browserbase_timeout_is_clamped(monkeypatch):
    monkeypatch.setenv("BROWSERBASE_API_KEY", "k")
    responses.add(responses.POST, f"{BB}/sessions", json={"id": "s", "connectUrl": "wss://x"})
    BrowserbaseProvider().create_session(timeout=5)
    assert json.loads(responses.calls[0].request.body)["timeout"] == 60


def test_browserbase_rejects_socks_proxy(monkeypatch):
    monkeypatch.setenv("BROWSERBASE_API_KEY", "k")
    with pytest.raises(ValidationError, match="HTTP/HTTPS"):
        BrowserbaseProvider().create_session(proxy=Proxy.parse("socks5://h.example:1080"))


@responses.activate
def test_browserbase_errors(monkeypatch):
    monkeypatch.setenv("BROWSERBASE_API_KEY", "bad")
    responses.add(responses.POST, f"{BB}/sessions", status=401, json={"message": "Invalid API key"})
    with pytest.raises(ConfigurationError, match="Invalid API key"):
        BrowserbaseProvider().create_session()
    responses.replace(responses.POST, f"{BB}/sessions", status=402, json={"message": "Upgrade your plan"})
    with pytest.raises(RemoteBrowserError, match="Upgrade your plan"):
        BrowserbaseProvider().create_session()


@responses.activate
def test_browserbase_live_view_and_release(monkeypatch):
    monkeypatch.setenv("BROWSERBASE_API_KEY", "k")
    responses.add(responses.POST, f"{BB}/sessions", json={"id": "s9", "connectUrl": "wss://x"})
    responses.add(responses.GET, f"{BB}/sessions/s9/debug",
                  json={"debuggerFullscreenUrl": "https://live.example/s9", "debuggerUrl": "x"})
    responses.add(responses.POST, f"{BB}/sessions/s9", json={})
    session = BrowserbaseProvider().create_session()
    assert session.live_view_url() == "https://live.example/s9"
    session.release()
    assert json.loads(responses.calls[-1].request.body) == {"status": "REQUEST_RELEASE"}


# -- Steel --------------------------------------------------------------------------


def test_steel_cloud_needs_api_key():
    with pytest.raises(ConfigurationError, match="STEEL_API_KEY"):
        SteelProvider().create_session()


@responses.activate
def test_steel_cloud_session(monkeypatch):
    monkeypatch.setenv("STEEL_API_KEY", "steel_key")
    responses.add(responses.POST, "https://api.steel.dev/v1/sessions", json={
        "id": "abc", "websocketUrl": "wss://connect.steel.dev?sessionId=abc",
        "debugUrl": "https://api.steel.dev/v1/sessions/abc/player"})
    responses.add(responses.POST, "https://api.steel.dev/v1/sessions/abc/release", json={})
    session = SteelProvider().create_session(proxy=Proxy.parse("user:pw@h.example:8000"), timeout=300)
    call = responses.calls[0]
    assert call.request.headers["steel-api-key"] == "steel_key"
    assert json.loads(call.request.body) == {"timeout": 300_000, "proxyUrl": "http://user:pw@h.example:8000"}
    assert session.connect_url == "wss://connect.steel.dev?sessionId=abc&apiKey=steel_key"
    assert session.live_view_url() == (
        "https://api.steel.dev/v1/sessions/abc/player?interactive=true&showControls=true")
    assert "steel_key" not in repr(session)
    session.release()
    assert responses.calls[-1].request.url.endswith("/v1/sessions/abc/release")


@responses.activate
def test_steel_self_hosted_fixes_unroutable_urls(monkeypatch):
    monkeypatch.setenv("STEEL_BASE_URL", "http://steel.lan:3000/")
    responses.add(responses.POST, "http://steel.lan:3000/v1/sessions", json={
        "id": "local1", "websocketUrl": "ws://0.0.0.0:3000/",
        "debugUrl": "http://0.0.0.0:3000/v1/sessions/debug"})
    session = SteelProvider().create_session()
    assert "steel-api-key" not in responses.calls[0].request.headers
    assert session.connect_url == "ws://steel.lan:3000/"
    assert session.live_view_url() == "http://steel.lan:3000/v1/sessions/debug?interactive=true&showControls=true"


@responses.activate
def test_steel_connect_override_and_unreachable(monkeypatch):
    monkeypatch.setenv("STEEL_BASE_URL", "http://steel.lan:3000")
    monkeypatch.setenv("STEEL_CONNECT_URL", "ws://cdp.lan:9222")
    responses.add(responses.POST, "http://steel.lan:3000/v1/sessions", json={"id": "x", "websocketUrl": "ws://0.0.0.0:3000/"})
    assert SteelProvider().create_session().connect_url == "ws://cdp.lan:9222?sessionId=x"
    monkeypatch.setenv("STEEL_BASE_URL", "http://127.0.0.1:9")
    with pytest.raises(RemoteBrowserError, match="could not reach Steel"):
        SteelProvider().create_session()


def test_reachable_helper():
    assert reachable("ws://0.0.0.0:3000/", "https://steel.example") == "wss://steel.example/"
    assert reachable("wss://connect.steel.dev?sessionId=1", "https://api.steel.dev") == "wss://connect.steel.dev?sessionId=1"


# -- CLI ----------------------------------------------------------------------------


def test_cli_browser_flag_and_install_skip(capsys):
    from autotok import cli

    assert cli.main(["--browser", "steel", "install-browser"]) == 0
    assert "Not needed" in capsys.readouterr().out
    assert os.environ["AUTOTOK_BROWSER"] == "steel"


# -- the cloud code path for real, against a local Chromium posing as the cloud -----


class _LocalCdpSession(CloudSession):
    def __init__(self, url, proc, user_dir):
        self.id = "local-cdp"
        self.connect_url = url
        self._proc, self._dir = proc, user_dir
        self.released = False

    def live_view_url(self):
        return "https://live.example/local-cdp"

    def release(self):
        self.released = True
        self._proc.terminate()
        try:
            self._proc.wait(timeout=10)
        except subprocess.TimeoutExpired:  # pragma: no cover
            self._proc.kill()
        shutil.rmtree(self._dir, ignore_errors=True)


class _LocalCdpProvider(CloudProvider):
    """Starts Chromium with --remote-debugging-port, like a cloud service would."""

    label = "LocalCDP"
    sessions = []
    executable = ""

    def create_session(self, *, proxy=None, timeout=None):
        user_dir = tempfile.mkdtemp(prefix="autotok-cdp-")
        proc = subprocess.Popen([self.executable, "--headless=new", "--no-sandbox", "--remote-debugging-port=0",
                                 f"--user-data-dir={user_dir}", "--no-first-run",
                                 "--no-default-browser-check", "about:blank"],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        port_file = Path(user_dir) / "DevToolsActivePort"
        deadline = time.monotonic() + 30
        while not (port_file.exists() and port_file.read_text().strip()):
            if time.monotonic() > deadline or proc.poll() is not None:
                proc.kill()
                pytest.skip("could not start Chromium with remote debugging")
            time.sleep(0.1)
        port = port_file.read_text().splitlines()[0].strip()
        session = _LocalCdpSession(f"http://127.0.0.1:{port}", proc, user_dir)
        self.sessions.append(session)
        return session


@pytest.fixture
def local_cdp(monkeypatch):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        exe = pw.chromium.executable_path
    if not Path(exe).exists():
        pytest.skip("Chromium for Playwright is not installed")
    _LocalCdpProvider.executable = exe
    _LocalCdpProvider.sessions = []
    monkeypatch.setitem(browsers._REGISTRY, "localcdp", _LocalCdpProvider)
    monkeypatch.setenv("AUTOTOK_BROWSER", "localcdp")
    return _LocalCdpProvider


@pytest.mark.browser
def test_signer_over_cdp(local_cdp, monkeypatch):
    from autotok.signer import Signer

    signer = Signer("Mozilla/5.0 Test", proxy="http://u:p@proxy.invalid:8000", timeout=20)
    monkeypatch.setattr(signer._http, "get", lambda *a, **k: (_ for _ in ()).throw(OSError("offline")))
    try:
        sig = signer.sign("https://www.tiktok.com/api/v1/web/project/post/?aid=1988&msToken=abc")
    finally:
        signer.close()
    assert sig.signature.startswith("_02B4Z6wo00f01") and len(sig.x_bogus) == 28
    assert [s.released for s in local_cdp.sessions] == [True]


@pytest.mark.browser
def test_login_over_cdp_reports_live_view(local_cdp, monkeypatch):
    from autotok import auth, settings

    monkeypatch.setattr(settings, "TIKTOK_LOGIN_URL", "data:text/html,<title>login</title>")

    def fake_wait(get_cookies, **kw):
        kw["sleep"](0.05)
        get_cookies()  # the CDP context is reachable
        return [{"name": "sessionid", "value": "s", "domain": ".tiktok.com"},
                {"name": "tt-target-idc", "value": "dc", "domain": ".tiktok.com"}]

    monkeypatch.setattr(auth, "wait_for_session_cookies", fake_wait)
    links = []
    cookies, user_agent = auth.open_login_session(timeout=30, on_live_url=links.append)
    assert links == ["https://live.example/local-cdp"]
    assert {c["name"] for c in cookies} == {"sessionid", "tt-target-idc"}
    assert "Chrome" in user_agent
    assert [s.released for s in local_cdp.sessions] == [True]
