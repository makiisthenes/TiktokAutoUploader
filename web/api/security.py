"""Which host names the API answers to (see the Host check in api.main)."""
from __future__ import annotations

import os
import re

# A web page can rebind its own domain to 127.0.0.1 (DNS rebinding). The browser then treats it
# as the same origin as this API, so the CSRF header alone doesn't stop it, but its requests
# still name the attacker's domain in the Host header. Only names this machine is reached by
# are accepted ("api" is the compose service name the other containers use). Add more, e.g.
# for your own reverse proxy, with AUTOTOK_ALLOWED_HOSTS=name1,name2.
DEFAULT_ALLOWED_HOSTS = ("localhost", "127.0.0.1", "::1", "api")


def allowed_hosts() -> set[str]:
    extra = os.getenv("AUTOTOK_ALLOWED_HOSTS", "")
    return set(DEFAULT_ALLOWED_HOSTS) | {h.strip().lower() for h in extra.split(",") if h.strip()}


def hostname(host_header: str) -> str:
    """The host name in a Host header or Origin authority, without the port."""
    value = host_header.strip().lower()
    if value.startswith("["):  # [::1]:8000
        host, _, rest = value[1:].partition("]")
        # Only ":port" may follow the brackets; anything else is malformed and matches nothing.
        return host if re.fullmatch(r"(:\d+)?", rest) else value
    return value.rsplit(":", 1)[0] if value.count(":") == 1 else value
