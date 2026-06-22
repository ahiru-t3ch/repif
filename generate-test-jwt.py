#!/usr/bin/env python3
"""Print a short-lived JWT for Swagger UI or curl (uses the private key).

Reads BACKEND_JWT_PRIVATE_KEY from the environment, or repif-jwt-private.pem in cwd.
Run from repo root after: bash generate-jwt-keys.sh
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv

ISSUER = os.getenv("BACKEND_JWT_ISSUER", "repif-frontend").strip()
AUDIENCE = os.getenv("BACKEND_JWT_AUDIENCE", "repif-backend").strip()
TTL_SECONDS = int(os.getenv("BACKEND_JWT_TTL_SECONDS", "300"))


def load_private_key() -> str:
    load_dotenv()

    pem = os.getenv("BACKEND_JWT_PRIVATE_KEY", "").replace("\\n", "\n").strip()
    if pem:
        return pem

    pem_path = Path("repif-jwt-private.pem")
    if pem_path.is_file():
        return pem_path.read_text(encoding="utf-8")

    print(
        "Missing private key: set BACKEND_JWT_PRIVATE_KEY or create repif-jwt-private.pem",
        file=sys.stderr,
    )
    sys.exit(1)


def main() -> None:
    private_key = load_private_key()
    now = datetime.now(timezone.utc)

    token = jwt.encode(
        {
            "iss": ISSUER,
            "aud": AUDIENCE,
            "iat": now,
            "exp": now + timedelta(seconds=TTL_SECONDS),
            "jti": str(uuid.uuid4()),
        },
        private_key,
        algorithm="RS256",
    )

    print(token)


if __name__ == "__main__":
    main()
