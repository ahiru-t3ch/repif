"""Hold-out metrics used for indicative price ranges and the About page."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Literal, TypedDict

from app.config import (
    model_path_metrics,
    model_path_metrics_apartment,
    model_path_metrics_house,
)

logger = logging.getLogger(__name__)

PropertyKind = Literal["APARTMENT", "HOUSE"]

_METRICS_KEY_BY_PROPERTY: dict[PropertyKind, str] = {
    "APARTMENT": "apartment",
    "HOUSE": "house",
}


class ModelHoldoutMetrics(TypedDict):
    r2: float
    mae_eur: float
    mape_pct: float


def _parse_holdout(entry: object, *, model_name: str) -> ModelHoldoutMetrics:
    if not isinstance(entry, dict):
        raise ValueError(f"Invalid metrics file ({model_name} holdout must be an object)")

    required = ("r2", "mae_eur", "mape_pct")
    missing = [key for key in required if key not in entry]
    if missing:
        raise ValueError(
            f"Invalid metrics file (missing {model_name} holdout.{missing[0]})"
        )

    parsed: ModelHoldoutMetrics = {
        "r2": float(entry["r2"]),
        "mae_eur": float(entry["mae_eur"]),
        "mape_pct": float(entry["mape_pct"]),
    }
    if parsed["mape_pct"] < 0:
        raise ValueError(
            f"mape_pct for {model_name} must be >= 0, got {parsed['mape_pct']}"
        )
    return parsed


def _load_single_model_metrics(path: Path, *, model_name: str) -> ModelHoldoutMetrics:
    if not path.is_file():
        raise FileNotFoundError(f"Model metrics file not found: {path}")

    payload = json.loads(path.read_text(encoding="utf-8"))

    if isinstance(payload.get("holdout"), dict):
        return _parse_holdout(payload["holdout"], model_name=model_name)

    metrics = payload.get("metrics")
    if isinstance(metrics, dict) and isinstance(metrics.get(model_name), dict):
        return _parse_holdout(metrics[model_name], model_name=model_name)

    raise ValueError(
        f"Invalid metrics file (expected top-level 'holdout' or "
        f"'metrics.{model_name}'): {path}"
    )


def _load_combined_metrics(path: Path) -> dict[str, ModelHoldoutMetrics]:
    if not path.is_file():
        raise FileNotFoundError(f"Model metrics file not found: {path}")

    payload = json.loads(path.read_text(encoding="utf-8"))
    metrics = payload.get("metrics")
    if not isinstance(metrics, dict):
        raise ValueError(f"Invalid metrics file (missing 'metrics' object): {path}")

    by_model: dict[str, ModelHoldoutMetrics] = {}
    for model_name in ("apartment", "house"):
        by_model[model_name] = _parse_holdout(
            metrics.get(model_name),
            model_name=model_name,
        )
    return by_model


def _load_metrics_by_model() -> dict[str, ModelHoldoutMetrics]:
    apt_path = model_path_metrics_apartment()
    house_path = model_path_metrics_house()

    if apt_path.is_file() and house_path.is_file():
        by_model = {
            "apartment": _load_single_model_metrics(apt_path, model_name="apartment"),
            "house": _load_single_model_metrics(house_path, model_name="house"),
        }
        logger.info(
            "Loaded model metrics: apartment mape=%.1f%% (%s), house mape=%.1f%% (%s)",
            by_model["apartment"]["mape_pct"],
            apt_path.name,
            by_model["house"]["mape_pct"],
            house_path.name,
        )
        return by_model

    combined_path = model_path_metrics()
    by_model = _load_combined_metrics(combined_path)
    logger.info(
        "Loaded model metrics from %s: apartment mape=%.1f%%, house mape=%.1f%%",
        combined_path,
        by_model["apartment"]["mape_pct"],
        by_model["house"]["mape_pct"],
    )
    return by_model


_metrics_by_model = _load_metrics_by_model()


def get_holdout_metrics() -> dict[str, ModelHoldoutMetrics]:
    """Return hold-out metrics for apartment and house models."""
    return {
        "apartment": dict(_metrics_by_model["apartment"]),
        "house": dict(_metrics_by_model["house"]),
    }


def mape_pct_for(property_type: PropertyKind) -> float:
    key = _METRICS_KEY_BY_PROPERTY[property_type]
    return _metrics_by_model[key]["mape_pct"]


def price_bounds(price: float, property_type: PropertyKind) -> tuple[float, float]:
    """Return (price_low, price_high) using hold-out MAPE for the property type."""
    factor = mape_pct_for(property_type) / 100.0
    return price * (1.0 - factor), price * (1.0 + factor)
