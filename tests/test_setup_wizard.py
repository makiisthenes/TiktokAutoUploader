import pytest
from prompt_toolkit.application import create_app_session
from prompt_toolkit.input import create_pipe_input
from prompt_toolkit.output import DummyOutput

from autotok import AccountStore, proxy_providers
from autotok.errors import AutotokError
from autotok.proxy_providers import ProxyProvider
from autotok.setup_wizard import TerminalUI, run_setup

ACME = ProxyProvider(key="acme", name="Acme", tagline="Residential proxies", sponsor=True,
                     signup_url="https://acme.example/?ref=autotok", steps=("Sign up.", "Copy the proxy."))
OTHER = ProxyProvider(key="other", name="Other", tagline="Datacenter proxies", signup_url="https://other.example")


class ScriptedUI:
    """Answers the wizard's questions in order. A menu answer picks the option whose label starts with it."""

    def __init__(self, *answers):
        self.answers = list(answers)
        self.lines = []
        self.menus = []

    def say(self, text=""):
        self.lines.append(text)

    heading = say

    def choose(self, question, options, default=None):
        self.menus.append((question, [label for _, label in options]))
        answer = self.answers.pop(0)
        for value, label in options:
            if label.startswith(answer):
                return value
        raise AssertionError(f"no option starting with {answer!r} in {[label for _, label in options]}")

    def ask(self, question):
        return self.answers.pop(0)

    @property
    def text(self):
        return "\n".join(self.lines)


@pytest.fixture
def wizard(monkeypatch):
    """Chromium installed, every proxy works, and logins are recorded instead of opening a browser."""
    logins = []
    monkeypatch.setattr("autotok.setup_wizard._chromium_installed", lambda: True)
    monkeypatch.setattr("autotok.setup_wizard.check_proxy", lambda proxy: "203.0.113.7")
    monkeypatch.setattr("autotok.auth.login_interactive", lambda name, **kw: logins.append((name, kw)))
    return logins


def test_own_proxy_then_login(wizard):
    ui = ScriptedUI("bob", "I have a proxy", "h.example:8000:u:p", "Yes")
    assert run_setup(AccountStore(), ui) == 0
    name, kw = wizard[0]
    assert name == "bob" and kw["proxy"].masked() == "http://u:****@h.example:8000"
    assert ui.menus[0][1] == ["I have a proxy, paste it", "No proxy, connect directly"]
    assert "TikTok will see IP 203.0.113.7" in ui.text
    assert "autotok upload -u bob" in ui.text


def test_sponsor_is_offered_and_opens_signup(wizard, monkeypatch):
    monkeypatch.setattr(proxy_providers, "PROVIDERS", (OTHER, ACME))
    opened = []
    ui = ScriptedUI("bob", "Get a proxy from Acme", "h.example:8000:u:p", "Later")
    assert run_setup(AccountStore(), ui, open_url=opened.append) == 0
    assert ui.menus[0][1] == [
        "I have a proxy, paste it",
        "Get a proxy from Acme (sponsor): Residential proxies",
        "Get a proxy from Other: Datacenter proxies",
        "No proxy, connect directly",
    ]
    assert opened == ["https://acme.example/?ref=autotok"]
    assert "  1. Sign up." in ui.lines and "  2. Copy the proxy." in ui.lines
    assert not wizard  # "Later": no login, and nothing saved for a new account
    assert not AccountStore().exists("bob")
    assert "autotok login -n bob -p <your proxy>" in ui.text


def test_existing_account_keeps_its_proxy(wizard, saved_account):
    ui = ScriptedUI("alice", "Yes", "Keep the current proxy", "Later")
    assert run_setup(AccountStore(), ui) == 0
    assert ui.menus[1][1][0] == "Keep the current proxy (http://bob:****@proxy.example:8000)"
    assert AccountStore().load("alice").proxy == "http://bob:secret@proxy.example:8000"
    assert "autotok login -n alice --force" in ui.text


def test_existing_account_switched_to_no_proxy(wizard, saved_account):
    ui = ScriptedUI("alice", "Yes", "No proxy", "Later")
    assert run_setup(AccountStore(), ui) == 0
    assert AccountStore().load("alice").proxy is None


def test_existing_name_can_be_changed(wizard, saved_account):
    ui = ScriptedUI("alice", "No, pick another", "carol", "No proxy", "Yes")
    assert run_setup(AccountStore(), ui) == 0
    assert [name for name, _ in wizard] == ["carol"] and wizard[0][1]["proxy"] is None


def test_bad_input_is_asked_again(wizard):
    ui = ScriptedUI("bad name!", "carol",
                    "I have a proxy", "socks5://u:p@h.example:1080", "",  # SOCKS with a password, then back
                    "No proxy", "Later")
    assert run_setup(AccountStore(), ui) == 0
    assert "invalid account name" in ui.text.lower()
    assert "cannot use SOCKS proxies" in ui.text
    assert len(ui.menus) == 3  # the proxy menu came back after the empty answer


def test_failing_proxy_can_be_used_anyway(wizard, monkeypatch):
    def fail(proxy):
        raise AutotokError("proxy check failed")

    monkeypatch.setattr("autotok.setup_wizard.check_proxy", fail)
    ui = ScriptedUI("bob", "I have a proxy", "h.example:1", "Use it anyway", "Yes")
    assert run_setup(AccountStore(), ui) == 0
    assert wizard[0][1]["proxy"].url == "http://h.example:1"


def test_missing_chromium_can_be_installed_or_declined(wizard, monkeypatch):
    monkeypatch.setattr("autotok.setup_wizard._chromium_installed", lambda: False)
    installs = []
    monkeypatch.setattr("autotok.browsers.install_browser", lambda: installs.append(1) or 0)

    assert run_setup(AccountStore(), ScriptedUI("No, stop setup")) == 1
    assert not installs

    assert run_setup(AccountStore(), ScriptedUI("Yes, download", "bob", "No proxy", "Later")) == 0
    assert installs == [1]


def test_terminal_ui_menu_uses_arrow_keys():
    with create_pipe_input() as inp:
        inp.send_text("\x1b[B\r")  # down arrow, Enter
        with create_app_session(input=inp, output=DummyOutput()):
            picked = TerminalUI().choose("Proxy?", [("own", "Mine"), ("none", "None")], default="own")
    assert picked == "none"
