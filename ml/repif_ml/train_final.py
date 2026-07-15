"""CLI entrypoint for stage B: refit saved ``_dev`` models on 100% of rows.

Once the dev models (trained with a train/hold-out split by ``train_gcp`` /
``train_local``) show satisfactory hold-out metrics, this refits them on **all**
rows with the same tuned hyperparameters and saves them as ``_prod`` models.

Run from anywhere once the package is installed (``pip install -e .``)::

    python -m repif_ml.train_final \\
        --apartment-dev models/apartment_dev_20260715_150000.joblib \\
        --house-dev     models/house_dev_20260715_151000.joblib

Provide only the model(s) you want to finalize (``--apartment-dev`` and/or
``--house-dev``).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from repif_ml._train_cli import DEFAULT_DPE_CSV, DEFAULT_DVF_DIR, DEFAULT_MODELS_DIR


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m repif_ml.train_final",
        description="Refit saved _dev models on 100% of rows -> _prod models.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--apartment-dev",
        type=Path,
        help="Path to the saved apartment _dev .joblib to finalize.",
    )
    parser.add_argument(
        "--house-dev",
        type=Path,
        help="Path to the saved house _dev .joblib to finalize.",
    )
    parser.add_argument("--dvf-dir", type=Path, default=DEFAULT_DVF_DIR)
    parser.add_argument("--dpe-csv", type=Path, default=DEFAULT_DPE_CSV)
    parser.add_argument("--models-dir", type=Path, default=DEFAULT_MODELS_DIR)
    args = parser.parse_args(argv)

    dev_models: dict[str, Path] = {}
    if args.apartment_dev is not None:
        dev_models["apartment"] = args.apartment_dev
    if args.house_dev is not None:
        dev_models["house"] = args.house_dev
    if not dev_models:
        parser.error("provide --apartment-dev and/or --house-dev")

    from repif_ml import configure_logging
    from repif_ml.train_models import finalize_training

    log_path = configure_logging()
    print(f"Logging to {log_path}", flush=True)

    for name, path in dev_models.items():
        if not path.is_file():
            print(f"ERROR: {name} dev model not found: {path}", file=sys.stderr)
            return 2
    if not args.dvf_dir.is_dir():
        print(f"ERROR: DVF+ directory not found: {args.dvf_dir}", file=sys.stderr)
        return 2
    if not args.dpe_csv.is_file():
        print(f"ERROR: DPE CSV not found: {args.dpe_csv}", file=sys.stderr)
        return 2

    summary = finalize_training(
        dvf_dir=args.dvf_dir,
        dpe_csv=args.dpe_csv,
        dev_models=dev_models,
        models_dir=args.models_dir,
    )

    for name, path in summary["models"].items():
        print(f"[{name}] prod model -> {path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
