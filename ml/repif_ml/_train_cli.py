"""Shared command-line plumbing for the ``train_local`` / ``train_gcp`` runners.

Both entrypoints are thin wrappers around :func:`repif_ml.train_models.run_training`.
They differ only in their default hyperparameters (see ``train_local`` /
``train_gcp``); every value is overridable on the command line.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# ml/ directory (this file lives in ml/repif_ml/).
ML_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DVF_DIR = ML_DIR / "csv_data" / "dvf_plus"
DEFAULT_DPE_CSV = ML_DIR / "csv_data" / "dpe" / "dpe-france.csv"
DEFAULT_MODELS_DIR = ML_DIR / "models"


def build_parser(
    prog: str,
    description: str,
    *,
    default_max_train_rows: int,
    default_n_iter: int,
    default_n_cv_splits: int,
) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog=prog,
        description=description,
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--dvf-dir",
        type=Path,
        default=DEFAULT_DVF_DIR,
        help="Directory containing the DVF+ department CSVs.",
    )
    parser.add_argument(
        "--dpe-csv",
        type=Path,
        default=DEFAULT_DPE_CSV,
        help="Path to the ADEME national DPE CSV.",
    )
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=DEFAULT_MODELS_DIR,
        help="Directory where .joblib models and metrics are written.",
    )
    parser.add_argument(
        "--models",
        nargs="+",
        choices=["apartment", "house"],
        default=["apartment", "house"],
        help="Which models to train.",
    )
    parser.add_argument(
        "--max-train-rows",
        type=int,
        default=default_max_train_rows,
        help="Keep only the most recent N training rows (0 or negative = all rows).",
    )
    parser.add_argument(
        "--n-iter",
        type=int,
        default=default_n_iter,
        help="RandomizedSearchCV iterations (hyperparameter samples).",
    )
    parser.add_argument(
        "--n-cv-splits",
        type=int,
        default=default_n_cv_splits,
        help="Number of TimeSeriesSplit CV folds.",
    )
    parser.add_argument(
        "--stage",
        choices=["dev", "prod"],
        default="dev",
        help="Filename stage tag for saved models.",
    )
    return parser


def run(
    argv: list[str] | None,
    *,
    prog: str,
    description: str,
    default_max_train_rows: int,
    default_n_iter: int,
    default_n_cv_splits: int,
) -> int:
    args = build_parser(
        prog,
        description,
        default_max_train_rows=default_max_train_rows,
        default_n_iter=default_n_iter,
        default_n_cv_splits=default_n_cv_splits,
    ).parse_args(argv)

    # Imported here so ``--help`` works even before the package is installed.
    from repif_ml import configure_logging
    from repif_ml.train_models import run_training

    log_path = configure_logging()
    print(f"Logging to {log_path}", flush=True)

    if not args.dvf_dir.is_dir():
        print(f"ERROR: DVF+ directory not found: {args.dvf_dir}", file=sys.stderr)
        return 2
    if not args.dpe_csv.is_file():
        print(f"ERROR: DPE CSV not found: {args.dpe_csv}", file=sys.stderr)
        return 2

    max_train_rows = (
        args.max_train_rows if args.max_train_rows and args.max_train_rows > 0 else None
    )

    summary = run_training(
        dvf_dir=args.dvf_dir,
        dpe_csv=args.dpe_csv,
        models_dir=args.models_dir,
        models=args.models,
        max_train_rows=max_train_rows,
        n_iter=args.n_iter,
        n_cv_splits=args.n_cv_splits,
        stage=args.stage,
    )

    for name, path in summary["models"].items():
        print(f"[{name}] {summary['metrics'][name]} -> {path}", flush=True)
    print(f"Metrics written to {summary['metrics_path']}", flush=True)
    return 0
