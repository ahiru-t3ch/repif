#!/usr/bin/env python3
"""Refit house model on 100% of rows using a saved dev model."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from repif_ml_v2.config import HOUSE_CONFIG
from repif_ml_v2.paths import DEFAULT_DPE_CSV, DEFAULT_DVF_DIR, DEFAULT_MODELS_DIR
from repif_ml_v2.train import train_final


def main() -> None:
    parser = argparse.ArgumentParser(description="Train house prod model (ml_v2).")
    parser.add_argument(
        "--dev-model",
        type=Path,
        required=True,
        help="Path to house_dev_*.joblib from train_dev.py",
    )
    parser.add_argument("--dvf-dir", type=Path, default=DEFAULT_DVF_DIR)
    parser.add_argument("--dpe-csv", type=Path, default=DEFAULT_DPE_CSV)
    parser.add_argument("--models-dir", type=Path, default=DEFAULT_MODELS_DIR)
    args = parser.parse_args()

    train_final(
        HOUSE_CONFIG,
        args.dev_model,
        dvf_dir=args.dvf_dir,
        dpe_csv=args.dpe_csv,
        models_dir=args.models_dir,
    )


if __name__ == "__main__":
    main()
