"""Runs TikTok's signing scripts in a real headless Chromium (offline).

Skipped when no Chromium is available; CI installs one with
``python -m playwright install chromium``.
"""
import pytest

from autotok.errors import BrowserNotInstalledError
from autotok.signer import Signer

pytestmark = pytest.mark.browser

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
URL = ("https://www.tiktok.com/api/v1/web/project/post/?app_name=tiktok_web&channel=tiktok_web"
       "&device_platform=web&aid=1988&msToken=abc")


@pytest.fixture
def offline_signer(monkeypatch):
    signer = Signer(UA, proxy="http://u:p@proxy.invalid:8000", timeout=20)

    def no_network(*a, **k):
        raise OSError("offline test")

    monkeypatch.setattr(signer._http, "get", no_network)
    try:
        signer.start()
    except BrowserNotInstalledError:
        pytest.skip("Chromium for Playwright is not installed")
    yield signer
    signer.close()


def test_signatures_have_tiktok_format(offline_signer):
    sig = offline_signer.sign(URL)
    assert sig.signature.startswith("_02B4Z6wo00f01")
    assert len(sig.x_bogus) == 28
    assert sig.signed_url.startswith(URL + "&verifyFp=")
    assert sig.signed_url.endswith("&X-Bogus=" + sig.x_bogus)


def test_signer_is_reusable(offline_signer):
    a = offline_signer.sign(URL)
    b = offline_signer.sign(URL + "x")
    assert a.x_bogus and b.x_bogus


def test_signer_uses_proxy_for_its_page_fetch():
    signer = Signer(UA, proxy="socks5://u:p@proxy.invalid:1080")
    assert signer._http.proxies["https"] == "socks5h://u:p@proxy.invalid:1080"
    signer.close()
