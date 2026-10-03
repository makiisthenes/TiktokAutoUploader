"""Proxy providers that ``autotok setup`` and the web app suggest.

The list starts empty, so setup only asks for the user's own proxy. To feature a
provider, add a :class:`ProxyProvider` to ``PROVIDERS``. ``autotok setup`` then
offers it to anyone without a proxy (opening its sign-up page), and the web
app's login page shows it next to the proxy field. Nothing else needs to change::

    PROVIDERS = (
        ProxyProvider(
            key="acme",
            name="Acme Proxies",
            tagline="Residential proxies with sticky sessions, free trial",
            signup_url="https://acme.example/?ref=autotok",
            steps=("Create an account and add residential traffic.",
                   "Create a sticky-session endpoint (same IP for 30+ minutes).",
                   "Copy it in host:port:user:pass format."),
            sponsor=True,
        ),
    )
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProxyProvider:
    key: str  # stable id used by the web API, e.g. "acme"
    name: str  # shown to users
    tagline: str  # one line on what they offer
    signup_url: str  # opened when someone picks this provider; put referral parameters here
    proxy_format: str = "host:port:user:pass"  # what the proxy copied from their dashboard looks like
    steps: tuple[str, ...] = ()  # how to get a proxy in their dashboard, one short line each
    sponsor: bool = False  # listed first and marked as a sponsor

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "name": self.name,
            "tagline": self.tagline,
            "signup_url": self.signup_url,
            "proxy_format": self.proxy_format,
            "steps": list(self.steps),
            "sponsor": self.sponsor,
        }


PROVIDERS: tuple[ProxyProvider, ...] = ()


def proxy_providers() -> list[ProxyProvider]:
    """The providers to suggest, sponsors first."""
    return sorted(PROVIDERS, key=lambda p: not p.sponsor)

