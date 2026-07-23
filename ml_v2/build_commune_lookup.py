#!/usr/bin/env python3
"""Build leakage-safe commune €/m² lookup JSON from DVF CSVs (apartment and/or house)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from repif_ml_v2.config import APARTMENT_CONFIG, HOUSE_CONFIG, PropertyConfig
from repif_ml_v2.data import prepare_training_frame
from repif_ml_v2.market import (
    COMMUNE_MARKET_MIN_PRIOR,
    build_commune_market_lookup,
    save_commune_market_lookup,
)
from repif_ml_v2.paths import DEFAULT_DPE_CSV, DEFAULT_DVF_DIR, DEFAULT_MODELS_DIR


def build_lookup_for_config(
    config: PropertyConfig,
    *,
    dvf_dir: Path,
    dpe_csv: Path,
    models_dir: Path,
) -> Path:
    df, dpe_match_rate = prepare_training_frame(
        config, dvf_dir=dvf_dir, dpe_csv=dpe_csv
    )
    commune_match_rate = float(df["commune_price_m2_median"].notna().mean())
    lookup = build_commune_market_lookup(df)
    out_path = models_dir / config.name / "commune_price_m2_lookup.json"
    save_commune_market_lookup(
        lookup,
        out_path,
        property_type=config.name,
        min_prior=COMMUNE_MARKET_MIN_PRIOR,
    )
    print(
        f"{config.name}: {len(df)} rows | DPE {dpe_match_rate:.1%} "
        f"| market {commune_match_rate:.1%} | {len(lookup)} communes → {out_path}"
    )
    return out_path.resolve()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build commune €/m² lookup JSON for ml_v2 inference."
    )
    parser.add_argument(
        "--property",
        choices=("apartment", "house", "both"),
        default="both",
        help="Which property type to build (default: both).",
    )
    parser.add_argument("--dvf-dir", type=Path, default=DEFAULT_DVF_DIR)
    parser.add_argument("--dpe-csv", type=Path, default=DEFAULT_DPE_CSV)
    parser.add_argument("--models-dir", type=Path, default=DEFAULT_MODELS_DIR)
    args = parser.parse_args()

    configs: list[PropertyConfig] = []
    if args.property in ("apartment", "both"):
        configs.append(APARTMENT_CONFIG)
    if args.property in ("house", "both"):
        configs.append(HOUSE_CONFIG)

    for config in configs:
        build_lookup_for_config(
            config,
            dvf_dir=args.dvf_dir,
            dpe_csv=args.dpe_csv,
            models_dir=args.models_dir,
        )


if __name__ == "__main__":
    main()
