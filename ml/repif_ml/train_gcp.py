"""CLI entrypoint to train the REPIF models on a remote/cloud machine.

Thin wrapper around :func:`repif_ml.train_models.run_training` with *thorough*
defaults (all rows, wider hyperparameter search) meant for a bigger VM, e.g. a
Compute Engine instance. See ``ml/README_ml.md`` for the full GCE runbook.

Run from anywhere once the package is installed (``pip install -e .``)::

    python -m repif_ml.train_gcp                       # all rows, n_iter=50, cv=5
    python -m repif_ml.train_gcp --models apartment    # single model
    python -m repif_ml.train_gcp --n-iter 30 --n-cv-splits 4

For a quick run with laptop-friendly defaults, use ``train_local`` instead.
"""

from __future__ import annotations

from repif_ml._train_cli import run


def main(argv: list[str] | None = None) -> int:
    return run(
        argv,
        prog="python -m repif_ml.train_gcp",
        description="Train REPIF models with thorough defaults (bigger VM / cloud).",
        default_max_train_rows=0,  # 0 = all rows
        default_n_iter=50,
        default_n_cv_splits=5,
    )


if __name__ == "__main__":
    raise SystemExit(main())
