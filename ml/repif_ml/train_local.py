"""CLI entrypoint to train the REPIF models locally.

Thin wrapper around :func:`repif_ml.train_models.run_training` with *fast* beta
defaults (100k most recent rows, small hyperparameter search) for quick
iteration on a laptop — mirrors the local training notebook.

Run from anywhere once the package is installed (``pip install -e .``)::

    python -m repif_ml.train_local                     # 100k rows, n_iter=10, cv=3
    python -m repif_ml.train_local --models apartment  # single model
    python -m repif_ml.train_local --max-train-rows 50000

For a heavier run on a bigger VM (all rows, wider search), use ``train_gcp``.
"""

from __future__ import annotations

from repif_ml._train_cli import run


def main(argv: list[str] | None = None) -> int:
    return run(
        argv,
        prog="python -m repif_ml.train_local",
        description="Train REPIF models with fast beta defaults (local iteration).",
        default_max_train_rows=100_000,
        default_n_iter=10,
        default_n_cv_splits=3,
    )


if __name__ == "__main__":
    raise SystemExit(main())
