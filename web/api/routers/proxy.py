"""Proxy diagnostics (which public IP will TikTok see for this proxy/account?)
and the proxy providers the login page suggests."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from api.db import get_session
from api.models import Account
from api.schemas import ProxyProviderRead, ProxyTestRequest, ProxyTestResponse
from api.services import account_store
from autotok.errors import AutotokError
from autotok.proxy import check_proxy, parse_proxy
from autotok.proxy_providers import proxy_providers

router = APIRouter(prefix="/api/proxy", tags=["proxy"])


@router.post("/test", response_model=ProxyTestResponse)
def test_proxy(payload: ProxyTestRequest, session: Session = Depends(get_session)):
    if payload.account_id is not None:
        acct = session.get(Account, payload.account_id)
        if not acct:
            raise HTTPException(status_code=404, detail="account not found")
        proxy = account_store.get_proxy(acct.username)
    else:
        proxy = parse_proxy(payload.proxy)
    masked = proxy.masked() if proxy else None
    try:
        ip = check_proxy(proxy)
    except AutotokError as e:
        return ProxyTestResponse(ok=False, proxy=masked, error=str(e))
    return ProxyTestResponse(ok=True, proxy=masked, ip=ip)


@router.get("/providers", response_model=list[ProxyProviderRead])
def list_providers():
    return [p.to_dict() for p in proxy_providers()]
