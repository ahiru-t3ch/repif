"""Inference for apartment / house XGBoost models (log-price → euros)."""

from __future__ import annotations

import logging
import math
from datetime import datetime
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from xgboost.core import XGBoostError

from app.config import (
    model_path_apartment,
    model_path_commune_lookup_apartment,
    model_path_commune_lookup_house,
    model_path_house,
)

logger = logging.getLogger(__name__)

PropertyKind = Literal["apartment", "house"]

# ml_v2 production feature sets (see ml_v2/repif_ml_v2/config.py).
ML_V2_APARTMENT_FEATURES = (
    "lon",
    "lat",
    "sbati",
    "l_codinsee",
    "apartement_rooms",
    "nblocdep",
    "sterr",
    "dpe_median",
    "annee_construction",
    "commune_price_m2_median",
)

ML_V2_HOUSE_FEATURES = (
    "lon",
    "lat",
    "sbati",
    "l_codinsee",
    "home_rooms",
    "nblocdep",
    "log_sterr",
    "dpe_median",
    "annee_construction",
    "commune_price_m2_median",
)

# Legacy ml/repif_ml full wave (kept for older joblib models).
LEGACY_FULL_FEATURES = [
    "sbati",
    "nblocdep",
    "lat",
    "lon",
    "l_codinsee",
    "dpe_median",
    "annee_construction",
    "sterr",
    "anneemut",
    "moismut",
    "commune_price_m2_median",
]

LEGACY_BASELINE_FEATURES = [
    "sbati",
    "nblocdep",
    "lat",
    "lon",
    "l_codinsee",
    "dpe_median",
    "annee_construction",
]

LOCATION_NOT_COVERED = "LOCATION_NOT_COVERED"


class UnsupportedLocationError(Exception):
    """Raised when l_codinsee was not seen during model training."""


def _load_model(path: Path):
    if not path.is_file():
        raise FileNotFoundError(f"Model file not found: {path}")
    return joblib.load(path)


def _load_commune_lookup(path: Path) -> dict[str, float]:
    if not path.is_file():
        logger.warning("Commune market lookup not found at %s", path)
        return {}
    import json

    payload = json.loads(path.read_text(encoding="utf-8"))
    values = payload.get("values", payload)
    if not isinstance(values, dict):
        logger.warning("Invalid commune market lookup at %s", path)
        return {}
    return {str(k): float(v) for k, v in values.items()}


model_apartment = _load_model(model_path_apartment())
model_house = _load_model(model_path_house())
_commune_price_lookup_apartment = _load_commune_lookup(
    model_path_commune_lookup_apartment()
)
_commune_price_lookup_house = _load_commune_lookup(model_path_commune_lookup_house())


def _model_feature_names(model) -> list[str]:
    names = getattr(model, "feature_names_in_", None)
    if names is not None:
        return list(names)
    booster = getattr(model, "get_booster", lambda: None)()
    if booster is not None and getattr(booster, "feature_names", None):
        return list(booster.feature_names)
    return LEGACY_FULL_FEATURES.copy()


def _build_feature_values(
    *,
    property_kind: PropertyKind,
    commune_lookup: dict[str, float],
    sbati: float,
    nblocdep: int,
    lat: float,
    lon: float,
    l_codinsee: str,
    dpe_median: int,
    annee_construction: int,
    property_rooms: int,
    sterr: float,
) -> dict[str, float | str]:
    now = datetime.now()
    code = str(l_codinsee).strip()
    land = float(sterr)
    log_sterr = math.log(land) if land > 0 else float("nan")

    return {
        "sbati": float(sbati),
        "nblocdep": int(nblocdep),
        "lat": float(lat),
        "lon": float(lon),
        "l_codinsee": code,
        "dpe_median": int(dpe_median),
        "annee_construction": int(annee_construction),
        "sterr": land,
        "log_sterr": log_sterr,
        "apartement_rooms": float(property_rooms),
        "home_rooms": float(property_rooms),
        "anneemut": float(now.year),
        "moismut": float(now.month),
        "commune_price_m2_median": commune_lookup.get(code, float("nan")),
    }


def _predict_price(
    model,
    commune_lookup: dict[str, float],
    property_kind: PropertyKind,
    sbati: float,
    nblocdep: int,
    lat: float,
    lon: float,
    l_codinsee: str,
    dpe_median: int,
    annee_construction: int,
    property_rooms: int,
    sterr: float,
) -> float:
    features = _model_feature_names(model)
    values = _build_feature_values(
        property_kind=property_kind,
        commune_lookup=commune_lookup,
        sbati=sbati,
        nblocdep=nblocdep,
        lat=lat,
        lon=lon,
        l_codinsee=l_codinsee,
        dpe_median=dpe_median,
        annee_construction=annee_construction,
        property_rooms=property_rooms,
        sterr=sterr,
    )
    data_df = pd.DataFrame([{name: values.get(name, np.nan) for name in features}])
    if "l_codinsee" in data_df.columns:
        data_df["l_codinsee"] = data_df["l_codinsee"].astype("category")
    try:
        return float(np.exp(model.predict(data_df[features])[0]))
    except XGBoostError as exc:
        if "category not in the training set" in str(exc):
            raise UnsupportedLocationError(LOCATION_NOT_COVERED) from exc
        raise


def predict_price_apartment(
    sbati: float,
    nblocdep: int,
    lat: float,
    lon: float,
    l_codinsee: str,
    dpe_median: int,
    annee_construction: int,
    *,
    property_rooms: int,
    sterr: float = 0.0,
) -> float:
    """Predict apartment price in euros."""
    return _predict_price(
        model_apartment,
        _commune_price_lookup_apartment,
        "apartment",
        sbati,
        nblocdep,
        lat,
        lon,
        l_codinsee,
        dpe_median,
        annee_construction,
        property_rooms,
        sterr,
    )


def predict_price_house(
    sbati: float,
    nblocdep: int,
    lat: float,
    lon: float,
    l_codinsee: str,
    dpe_median: int,
    annee_construction: int,
    *,
    property_rooms: int,
    sterr: float = 0.0,
) -> float:
    """Predict house price in euros."""
    return _predict_price(
        model_house,
        _commune_price_lookup_house,
        "house",
        sbati,
        nblocdep,
        lat,
        lon,
        l_codinsee,
        dpe_median,
        annee_construction,
        property_rooms,
        sterr,
    )
