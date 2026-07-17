"""Short-link shared estimate scenarios."""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models

SHARE_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"
SHARE_CODE_LENGTH = 8
SHARE_TTL_DAYS = 30
SHARE_MAX_PAYLOAD_BYTES = 48_000
SHARE_CREATE_MAX_ATTEMPTS = 8


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_share_code(length: int = SHARE_CODE_LENGTH) -> str:
    return "".join(secrets.choice(SHARE_CODE_ALPHABET) for _ in range(length))


def validate_payload_size(payload: dict) -> None:
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if len(encoded.encode("utf-8")) > SHARE_MAX_PAYLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Share payload is too large.")


def create_shared_scenario(db: Session, payload: dict) -> models.SharedScenario:
    if not isinstance(payload, dict) or not payload:
        raise HTTPException(status_code=400, detail="Share payload is required.")
    if payload.get("v") != 1:
        raise HTTPException(status_code=400, detail="Unsupported share payload version.")
    if payload.get("result") is None:
        raise HTTPException(status_code=400, detail="Share payload must include a result.")

    validate_payload_size(payload)
    expires_at = _utc_now() + timedelta(days=SHARE_TTL_DAYS)

    for _ in range(SHARE_CREATE_MAX_ATTEMPTS):
        code = generate_share_code()
        row = models.SharedScenario(
            code=code,
            payload=payload,
            expires_at=expires_at,
        )
        db.add(row)
        try:
            db.commit()
            db.refresh(row)
            return row
        except IntegrityError:
            db.rollback()

    raise HTTPException(
        status_code=503,
        detail="Could not allocate a share code. Try again.",
    )


def get_shared_scenario(db: Session, code: str) -> models.SharedScenario:
    normalized = (code or "").strip().lower()
    if len(normalized) < 4 or len(normalized) > 16:
        raise HTTPException(status_code=404, detail="Shared scenario not found.")
    if any(ch not in SHARE_CODE_ALPHABET for ch in normalized):
        raise HTTPException(status_code=404, detail="Shared scenario not found.")

    row = db.query(models.SharedScenario).filter(models.SharedScenario.code == normalized).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Shared scenario not found.")

    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= _utc_now():
        raise HTTPException(status_code=410, detail="This shared scenario has expired.")

    return row
