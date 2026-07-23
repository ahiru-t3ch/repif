"""Leakage-safe commune €/m² median feature and inference lookup."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

COMMUNE_MARKET_MIN_PRIOR = 5
COMMUNE_LOOKUP_FILENAME = "commune_price_m2_lookup.json"


def add_commune_price_m2_median(
    df: pd.DataFrame,
    *,
    min_prior: int = COMMUNE_MARKET_MIN_PRIOR,
) -> pd.DataFrame:
    """Add commune €/m² median from past sales only (no leakage).

    For each sale, the value is the expanding median of ``valeurfonc / sbati``
    for the same ``l_codinsee``, using only rows with an earlier ``datemut``.
    """
    required = {"datemut", "valeurfonc", "sbati", "l_codinsee"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"df missing columns for market feature: {sorted(missing)}")

    out = df.copy()
    out["datemut"] = pd.to_datetime(out["datemut"], errors="coerce")
    out = out.sort_values("datemut", kind="mergesort").reset_index(drop=True)
    price_m2 = pd.to_numeric(out["valeurfonc"], errors="coerce") / pd.to_numeric(
        out["sbati"], errors="coerce"
    )
    out["_price_m2"] = price_m2.replace([np.inf, -np.inf], np.nan)

    out["commune_price_m2_median"] = (
        out.groupby("l_codinsee", sort=False)["_price_m2"]
        .transform(lambda s: s.shift(1).expanding(min_periods=min_prior).median())
        .astype("float64")
    )
    return out.drop(columns=["_price_m2"])


def build_commune_market_lookup(df: pd.DataFrame) -> dict[str, float]:
    """Last known leakage-safe commune median per INSEE code (for inference)."""
    if "commune_price_m2_median" not in df.columns:
        raise ValueError(
            "commune_price_m2_median missing; call add_commune_price_m2_median first"
        )
    prepared = df.dropna(subset=["l_codinsee", "commune_price_m2_median"]).copy()
    if prepared.empty:
        return {}
    prepared["datemut"] = pd.to_datetime(prepared["datemut"], errors="coerce")
    prepared = prepared.sort_values("datemut")
    series = prepared.groupby("l_codinsee", sort=False)["commune_price_m2_median"].last()
    return {str(k): float(v) for k, v in series.items() if pd.notna(v)}


def save_commune_market_lookup(
    lookup: dict[str, float],
    path: str | Path,
    *,
    property_type: str,
    min_prior: int = COMMUNE_MARKET_MIN_PRIOR,
) -> Path:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "feature": "commune_price_m2_median",
        "property_type": property_type,
        "min_prior": min_prior,
        "n_communes": len(lookup),
        "values": lookup,
    }
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output.resolve()


def load_commune_market_lookup(path: str | Path) -> dict[str, float]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    values = payload.get("values", payload)
    if not isinstance(values, dict):
        raise ValueError(f"Invalid commune market lookup: {path}")
    return {str(k): float(v) for k, v in values.items()}
