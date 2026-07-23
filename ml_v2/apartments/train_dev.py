#!/usr/bin/env python3
"""Train apartment dev model (80/20 hold-out + RandomizedSearchCV)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from repif_ml_v2.config import APARTMENT_CONFIG
from repif_ml_v2.paths import DEFAULT_DPE_CSV, DEFAULT_DVF_DIR, DEFAULT_MODELS_DIR
from repif_ml_v2.train import train_dev


def main() -> None:
    parser = argparse.ArgumentParser(description="Train apartment dev model (ml_v2).")
    parser.add_argument("--dvf-dir", type=Path, default=DEFAULT_DVF_DIR)
    parser.add_argument("--dpe-csv", type=Path, default=DEFAULT_DPE_CSV)
    parser.add_argument("--models-dir", type=Path, default=DEFAULT_MODELS_DIR)
    parser.add_argument("--n-iter", type=int, default=APARTMENT_CONFIG.n_iter)
    parser.add_argument("--n-cv-splits", type=int, default=APARTMENT_CONFIG.n_cv_splits)
    parser.add_argument("--max-train-rows", type=int, default=None)
    parser.add_argument("--train-ratio", type=float, default=APARTMENT_CONFIG.train_ratio)
    args = parser.parse_args()

    train_dev(
        APARTMENT_CONFIG,
        dvf_dir=args.dvf_dir,
        dpe_csv=args.dpe_csv,
        models_dir=args.models_dir,
        max_train_rows=args.max_train_rows,
        n_iter=args.n_iter,
        n_cv_splits=args.n_cv_splits,
        train_ratio=args.train_ratio,
    )


if __name__ == "__main__":
    main()
