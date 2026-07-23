from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.stats import randint, uniform
from sklearn.base import clone
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit
from xgboost import XGBRegressor

from repif_ml_v2.config import PropertyConfig
from repif_ml_v2.data import prepare_training_frame
from repif_ml_v2.market import (
    COMMUNE_MARKET_MIN_PRIOR,
    build_commune_market_lookup,
    save_commune_market_lookup,
)
from repif_ml_v2.paths import (
    DEFAULT_DPE_CSV,
    DEFAULT_DVF_DIR,
    DEFAULT_MODELS_DIR,
    commune_lookup_path,
    metrics_filename,
)

PARAM_DIST = {
    "n_estimators": randint(200, 1200),
    "max_depth": randint(3, 10),
    "learning_rate": uniform(0.01, 0.2),
    "subsample": uniform(0.6, 0.4),
    "colsample_bytree": uniform(0.6, 0.4),
    "min_child_weight": randint(1, 10),
    "gamma": uniform(0, 5),
    "reg_lambda": uniform(0, 5),
}


def _prepare_xy(df: pd.DataFrame, config: PropertyConfig) -> tuple[pd.DataFrame, pd.Series]:
    features = list(config.features)
    prepared = df.sort_values("datemut").copy()
    prepared["l_codinsee"] = prepared["l_codinsee"].astype("category")
    x = prepared[features]
    y = np.log(prepared["valeurfonc"])
    return x, y


def _monotone_tuple(config: PropertyConfig) -> tuple[int, ...]:
    return tuple(config.monotone.get(f, 0) for f in config.features)


def _evaluate(model: XGBRegressor, x_test: pd.DataFrame, y_test: pd.Series) -> dict[str, float]:
    y_pred = np.exp(model.predict(x_test))
    y_true = np.exp(y_test)
    return {
        "r2": float(r2_score(y_true, y_pred)),
        "mae_eur": float(mean_absolute_error(y_true, y_pred)),
        "mape_pct": float(np.mean(np.abs((y_true - y_pred) / y_true)) * 100),
    }


def _save_artifacts(
    *,
    model: XGBRegressor,
    config: PropertyConfig,
    stage: str,
    metrics_payload: dict,
    models_dir: Path,
) -> tuple[Path, Path]:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_dir = models_dir / config.name
    model_dir.mkdir(parents=True, exist_ok=True)

    model_path = model_dir / f"{config.name}_{stage}_{timestamp}.joblib"
    metrics_path = model_dir / metrics_filename(stage, timestamp, config.name)

    joblib.dump(model, model_path)
    metrics_payload["model_path"] = str(model_path.resolve())
    metrics_path.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")

    return model_path, metrics_path


def _save_commune_lookup(
    df: pd.DataFrame,
    config: PropertyConfig,
    models_dir: Path,
) -> Path:
    lookup = build_commune_market_lookup(df)
    path = commune_lookup_path(config.name, models_dir)
    save_commune_market_lookup(
        lookup,
        path,
        property_type=config.name,
        min_prior=COMMUNE_MARKET_MIN_PRIOR,
    )
    print(f"Saved commune lookup: {path} ({len(lookup)} communes)")
    return path


def _dev_metrics_path(dev_model_path: Path, config: PropertyConfig) -> Path | None:
    prefix = f"{config.name}_dev_"
    stem = dev_model_path.stem
    if not stem.startswith(prefix):
        return None
    timestamp = stem[len(prefix) :]
    model_dir = dev_model_path.parent
    candidates = (
        model_dir / metrics_filename("dev", timestamp, config.name),
        model_dir / f"metrics_dev_{timestamp}.json",
    )
    for path in candidates:
        if path.is_file():
            return path
    return None


def _holdout_from_dev_metrics(dev_model_path: Path, config: PropertyConfig) -> dict | None:
    metrics_path = _dev_metrics_path(dev_model_path, config)
    if metrics_path is None:
        return None
    payload = json.loads(metrics_path.read_text(encoding="utf-8"))
    holdout = payload.get("holdout")
    if isinstance(holdout, dict):
        return holdout
    return None


def train_dev(
    config: PropertyConfig,
    *,
    dvf_dir=DEFAULT_DVF_DIR,
    dpe_csv=DEFAULT_DPE_CSV,
    models_dir=DEFAULT_MODELS_DIR,
    max_train_rows: int | None = None,
    n_iter: int | None = None,
    n_cv_splits: int | None = None,
    train_ratio: float | None = None,
    random_state: int = 42,
) -> dict:
    n_iter = n_iter if n_iter is not None else config.n_iter
    n_cv_splits = n_cv_splits if n_cv_splits is not None else config.n_cv_splits
    train_ratio = train_ratio if train_ratio is not None else config.train_ratio

    df, dpe_match_rate = prepare_training_frame(
        config, dvf_dir=dvf_dir, dpe_csv=dpe_csv
    )
    commune_match_rate = float(df["commune_price_m2_median"].notna().mean())
    print(
        f"Prepared rows: {len(df)} | DPE match: {dpe_match_rate:.1%} "
        f"| Commune market: {commune_match_rate:.1%}"
    )

    x, y = _prepare_xy(df, config)
    cutoff = int(len(x) * train_ratio)
    x_train, x_test = x.iloc[:cutoff], x.iloc[cutoff:]
    y_train, y_test = y.iloc[:cutoff], y.iloc[cutoff:]

    if max_train_rows is not None and len(x_train) > max_train_rows:
        x_train = x_train.iloc[-max_train_rows:]
        y_train = y_train.iloc[-max_train_rows:]
        print(f"Limited train to last {max_train_rows} rows")

    monotone_constraints = _monotone_tuple(config)
    print("Monotone constraints:", dict(zip(config.features, monotone_constraints)))

    search = RandomizedSearchCV(
        estimator=XGBRegressor(
            random_state=random_state,
            n_jobs=-1,
            enable_categorical=True,
            monotone_constraints=monotone_constraints,
        ),
        param_distributions=PARAM_DIST,
        n_iter=n_iter,
        cv=TimeSeriesSplit(n_splits=n_cv_splits),
        scoring="neg_mean_absolute_error",
        random_state=random_state,
        n_jobs=1,
        verbose=2,
    )
    search.fit(x_train, y_train)

    model = search.best_estimator_
    holdout = _evaluate(model, x_test, y_test)

    print("Best params:", search.best_params_)
    print("Best CV score (neg MAE log):", search.best_score_)
    print(
        f"Hold-out: R²={holdout['r2']:.4f} "
        f"MAE={holdout['mae_eur']:.0f} MAPE={holdout['mape_pct']:.1f}%"
    )

    payload = {
        "model": config.name,
        "stage": "dev",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "features": list(config.features),
        "best_params": search.best_params_,
        "best_cv_score_neg_mae_log": float(search.best_score_),
        "holdout": holdout,
        "dpe_match_rate": dpe_match_rate,
        "commune_market_match_rate": commune_match_rate,
        "n_rows": len(df),
        "n_train": len(x_train),
        "n_test": len(x_test),
        "max_dist_m": config.max_dist_m,
    }

    lookup_path = _save_commune_lookup(df, config, Path(models_dir))
    payload["commune_lookup_path"] = str(lookup_path)

    model_path, metrics_path = _save_artifacts(
        model=model,
        config=config,
        stage="dev",
        metrics_payload=payload,
        models_dir=Path(models_dir),
    )
    print(f"Saved model: {model_path}")
    print(f"Saved metrics: {metrics_path}")

    payload["metrics_path"] = str(metrics_path.resolve())
    return payload


def train_final(
    config: PropertyConfig,
    dev_model_path: str | Path,
    *,
    dvf_dir=DEFAULT_DVF_DIR,
    dpe_csv=DEFAULT_DPE_CSV,
    models_dir=DEFAULT_MODELS_DIR,
) -> dict:
    dev_model_path = Path(dev_model_path)
    if not dev_model_path.is_file():
        raise FileNotFoundError(f"Dev model not found: {dev_model_path}")

    model_dev: XGBRegressor = joblib.load(dev_model_path)
    df, dpe_match_rate = prepare_training_frame(
        config, dvf_dir=dvf_dir, dpe_csv=dpe_csv
    )
    commune_match_rate = float(df["commune_price_m2_median"].notna().mean())
    print(
        f"Prepared rows: {len(df)} | DPE match: {dpe_match_rate:.1%} "
        f"| Commune market: {commune_match_rate:.1%}"
    )

    x, y = _prepare_xy(df, config)
    print(f"Refitting on all {len(x)} rows")

    model_final = clone(model_dev)
    model_final.fit(x, y)

    payload = {
        "model": config.name,
        "stage": "prod",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "features": list(config.features),
        "best_params": {
            key: value
            for key, value in model_dev.get_params().items()
            if key in PARAM_DIST
        },
        "dev_model_path": str(dev_model_path.resolve()),
        "dpe_match_rate": dpe_match_rate,
        "commune_market_match_rate": commune_match_rate,
        "n_rows": len(df),
        "max_dist_m": config.max_dist_m,
    }
    holdout = _holdout_from_dev_metrics(dev_model_path, config)
    if holdout is not None:
        payload["holdout"] = holdout
        dev_metrics_path = _dev_metrics_path(dev_model_path, config)
        if dev_metrics_path is not None:
            payload["dev_metrics_path"] = str(dev_metrics_path.resolve())

    lookup_path = _save_commune_lookup(df, config, Path(models_dir))
    payload["commune_lookup_path"] = str(lookup_path)

    model_path, metrics_path = _save_artifacts(
        model=model_final,
        config=config,
        stage="prod",
        metrics_payload=payload,
        models_dir=Path(models_dir),
    )
    print(f"Saved model: {model_path}")
    print(f"Saved metrics: {metrics_path}")

    payload["metrics_path"] = str(metrics_path.resolve())
    return payload
