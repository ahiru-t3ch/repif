import logging
import os

import jwt
from dotenv import load_dotenv
from jwt.exceptions import InvalidTokenError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

load_dotenv()

logger = logging.getLogger(__name__)

JWT_PUBLIC_KEY = os.getenv("BACKEND_JWT_PUBLIC_KEY", "").replace("\\n", "\n").strip()
JWT_ISSUER = os.getenv("BACKEND_JWT_ISSUER", "repif-frontend").strip()
JWT_AUDIENCE = os.getenv("BACKEND_JWT_AUDIENCE", "repif-backend").strip()
JWT_LEEWAY_SECONDS = int(os.getenv("BACKEND_JWT_LEEWAY_SECONDS", "30"))

from app.config import jwt_public_paths


def is_auth_enabled() -> bool:
    return bool(JWT_PUBLIC_KEY)


def verify_backend_jwt(token: str) -> None:
    jwt.decode(
        token,
        JWT_PUBLIC_KEY,
        algorithms=["RS256"],
        issuer=JWT_ISSUER,
        audience=JWT_AUDIENCE,
        leeway=JWT_LEEWAY_SECONDS,
        options={"require": ["exp", "iat", "iss", "aud"]},
    )


class JwtAuthMiddleware(BaseHTTPMiddleware):
    """Require Authorization: Bearer <JWT> when BACKEND_JWT_PUBLIC_KEY is set."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if not is_auth_enabled():
            return await call_next(request)

        if request.url.path in jwt_public_paths() or request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization header"},
            )

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            verify_backend_jwt(token)
        except InvalidTokenError:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired JWT"})

        return await call_next(request)
