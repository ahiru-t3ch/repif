import os

from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from dotenv import load_dotenv

load_dotenv()

RATE_LIMIT_PREDICT = os.getenv("RATE_LIMIT_PREDICT", "10/minute").strip()
RATE_LIMIT_PREDICTIONS = os.getenv("RATE_LIMIT_PREDICTIONS", "60/minute").strip()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = getattr(exc, "retry_after", None)
    headers = {}
    if retry_after is not None:
        headers["Retry-After"] = str(retry_after)

    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Try again later."},
        headers=headers,
    )
