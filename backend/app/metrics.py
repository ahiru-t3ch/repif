"""Hold-out metrics used for indicative price ranges (MAPE)."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Literal

from app.config import model_path_metrics

logger = logging.getLogger(__name__)

PropertyKind = Literal["APARTMENT", "HOUSE"]

_METRICS_KEY_BY_PROPERTY: dict[PropertyKind, str] = {
    "APARTMENT": "apartment",
    "HOUSE": "house",
}


def _load_mape_pct_by_model(path: Path) -> dict[str, float]:
    if not path.is_file():
        raise FileNotFoundError(f"Model metrics file not found: {path}")

    payload = json.loads(path.read_text(encoding="utf-8"))
    metrics = payload.get("metrics")
    if not isinstance(metrics, dict):
        raise ValueError(f"Invalid metrics file (missing 'metrics' object): {path}")

    mape_by_model: dict[str, float] = {}
    for model_name in ("apartment", "house"):
        entry = metrics.get(model_name)
        if not isinstance(entry, dict) or "mape_pct" not in entry:
            raise ValueError(
                f"Invalid metrics file (missing metrics.{model_name}.mape_pct): {path}"
            )
        mape = float(entry["mape_pct"])
        if mape < 0:
            raise ValueError(f"mape_pct for {model_name} must be >= 0, got {mape}")
        mape_by_model[model_name] = mape

    logger.info(
        "Loaded model MAPE from %s: apartment=%.1f%%, house=%.1f%%",
        path,
        mape_by_model["apartment"],
        mape_by_model["house"],
    )
    return mape_by_model


_mape_pct_by_model = _load_mape_pct_by_model(model_path_metrics())


def mape_pct_for(property_type: PropertyKind) -> float:
    key = _METRICS_KEY_BY_PROPERTY[property_type]
    return _mape_pct_by_model[key]


def price_bounds(price: float, property_type: PropertyKind) -> tuple[float, float]:
    """Return (price_low, price_high) using hold-out MAPE for the property type."""
    factor = mape_pct_for(property_type) / 100.0
    return price * (1.0 - factor), price * (1.0 + factor)
