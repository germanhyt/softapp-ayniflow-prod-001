from collections import defaultdict
from dataclasses import dataclass
from time import time

from fastapi import Request, status
from starlette.responses import JSONResponse

from app.core.config import settings


@dataclass(frozen=True)
class RateLimitRule:
    path: str
    method: str
    limit: int
    window_seconds: int


DEFAULT_RULES = (
    RateLimitRule("/auth/login", "POST", 10, 60),
    RateLimitRule("/finance/webhook", "POST", 30, 60),
)


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time()
        window_start = now - window_seconds
        self._hits[key] = [hit for hit in self._hits[key] if hit > window_start]
        if len(self._hits[key]) >= limit:
            return False
        self._hits[key].append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


rate_limiter = InMemoryRateLimiter()


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _resolve_rule(path: str, method: str) -> RateLimitRule | None:
    for rule in DEFAULT_RULES:
        if path == rule.path and method.upper() == rule.method:
            return rule
    return None


def build_rate_limit_response(request: Request) -> JSONResponse | None:
    if not settings.rate_limit_enabled:
        return None

    rule = _resolve_rule(request.url.path, request.method)
    if rule is None:
        return None

    key = f"{rule.path}:{rule.method}:{_client_key(request)}"
    if rate_limiter.is_allowed(key, rule.limit, rule.window_seconds):
        return None

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "success": False,
            "message": "Demasiadas solicitudes. Intenta nuevamente en un momento.",
        },
    )
