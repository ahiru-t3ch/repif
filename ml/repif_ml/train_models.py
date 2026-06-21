import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from scipy.stats import randint, uniform
from sklearn.base import clone
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit
from sklearn.neighbors import BallTree
from xgboost import XGBRegressor

from repif_ml.dpe import aggregate_dpe_buildings, process_dpe_csv
from repif_ml.dvf_plus import process_dvf_plus_csv

logger = logging.getLogger(__name__)
DEFAULT_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
EARTH_RADIUS_M = 6_371_000
DEFAULT_MAX_DIST_M = 30
DPE_FEATURE_COLS = ["dpe_median", "annee_construction"]

DEFAULT_FEATURES = [
    "sbati",
    "nblocdep",
    "lat",
    "lon",
    "l_codinsee",
    "dpe_median",
    "annee_construction",
]

DEFAULT_CATEGORICAL_FEATURES = ["l_codinsee"]

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


def merge_dvf_dpe(
    dvf_df: pd.DataFrame,
    dpe_bat: pd.DataFrame,
    max_dist_m: float = DEFAULT_MAX_DIST_M,
    dpe_cols: list[str] | None = None,
) -> pd.DataFrame:
    """Match each DVF sale to the nearest aggregated DPE building by lat/lon.

    Uses haversine distance via ``BallTree``. Sales without coordinates or
    without a DPE building within ``max_dist_m`` meters keep ``NaN`` DPE features.
    """
    if dpe_cols is None:
        dpe_cols = DPE_FEATURE_COLS

    for col in ("lat", "lon"):
        if col not in dvf_df.columns:
            raise ValueError(f"dvf_df missing column: {col}")
        if col not in dpe_bat.columns:
            raise ValueError(f"dpe_bat missing column: {col}")

    missing_dpe_cols = set(dpe_cols) - set(dpe_bat.columns)
    if missing_dpe_cols:
        raise ValueError(f"dpe_bat missing columns: {sorted(missing_dpe_cols)}")

    result = dvf_df.copy()
    for col in dpe_cols:
        result[col] = np.nan

    valid = result.dropna(subset=["lat", "lon"])
    dpe_ok = dpe_bat.dropna(subset=["lat", "lon"]).reset_index(drop=True)
    logger.info(
        "Merging DVF (%d sales, %d with coordinates) with DPE (%d buildings)",
        len(result),
        len(valid),
        len(dpe_ok),
    )
    if valid.empty or dpe_ok.empty:
        logger.warning("Skipping spatial merge: no valid DVF coordinates or DPE buildings")
        return result

    started = time.perf_counter()
    dvf_rad = np.radians(valid[["lat", "lon"]].to_numpy())
    dpe_rad = np.radians(dpe_ok[["lat", "lon"]].to_numpy())

    logger.info("Building BallTree and matching nearest DPE buildings (max %dm)", max_dist_m)
    tree = BallTree(dpe_rad, metric="haversine")
    dist, idx = tree.query(dvf_rad, k=1)
    dist_m = dist[:, 0] * EARTH_RADIUS_M

    match_positions = idx[:, 0].astype("float64")
    match_positions[dist_m > max_dist_m] = np.nan
    dpe_idx = pd.Series(match_positions, index=valid.index)
    matched_count = int(dpe_idx.notna().sum())
    match_rate = 100.0 * matched_count / len(valid) if len(valid) else 0.0

    for col in dpe_cols:
        matched = pd.to_numeric(dpe_idx.map(dpe_ok[col]), errors="coerce")
        result.loc[valid.index, col] = matched.to_numpy()

    elapsed = time.perf_counter() - started
    logger.info(
        "Spatial merge done in %.1fs: %d/%d sales matched (%.1f%%)",
        elapsed,
        matched_count,
        len(valid),
        match_rate,
    )

    return result


def get_data_for_training(
    dvf_plus_csv_dir_path: str,
    dpe_csv_path: str,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load cleaned DVF+ sales merged with aggregated DPE building features."""
    logger.info("Starting training data pipeline")
    started = time.perf_counter()

    logger.info("Step 1/4: loading DVF+ CSVs")
    df_house, df_apartment = process_dvf_plus_csv(dvf_plus_csv_dir_path)

    logger.info("Step 2/4: loading DPE CSV")
    dpe_df = process_dpe_csv(dpe_csv_path)

    logger.info("Step 3/4: aggregating DPE buildings")
    dpe_bat = aggregate_dpe_buildings(dpe_df)

    logger.info("Step 4/4: merging DPE features onto house sales")
    df_house = merge_dvf_dpe(df_house, dpe_bat)
    logger.info("Step 4/4: merging DPE features onto apartment sales")
    df_apartment = merge_dvf_dpe(df_apartment, dpe_bat)

    elapsed = time.perf_counter() - started
    logger.info(
        "Training data ready in %.1fs: %d houses, %d apartments",
        elapsed,
        len(df_house),
        len(df_apartment),
    )

    return df_house, df_apartment


def _cast_feature_dtypes(
    df: pd.DataFrame,
    features: list[str],
    categorical_features: list[str],
) -> pd.DataFrame:
    """Ensure XGBoost-compatible dtypes: float for numeric, category for categorical."""
    prepared = df.copy()
    numeric_features = [col for col in features if col not in categorical_features]

    for col in numeric_features:
        prepared[col] = pd.to_numeric(prepared[col], errors="coerce")

    for col in categorical_features:
        if col not in features:
            continue
        prepared[col] = (
            prepared[col]
            .astype("string")
            .str.strip()
            .astype("category")
        )

    return prepared


def _prepare_training_frame(
    df: pd.DataFrame,
    target_col: str,
    date_col: str,
    features: list[str],
    categorical_features: list[str],
) -> pd.DataFrame:
    missing = {target_col, date_col, *features} - set(df.columns)
    if missing:
        raise ValueError(f"df missing columns: {sorted(missing)}")

    prepared = df.copy()
    prepared[date_col] = pd.to_datetime(prepared[date_col], errors="coerce")
    prepared[target_col] = pd.to_numeric(prepared[target_col], errors="coerce")
    prepared = prepared.dropna(subset=[date_col, target_col])
    prepared = prepared[prepared[target_col] > 0]
    prepared = prepared.sort_values(date_col).reset_index(drop=True)
    prepared = _cast_feature_dtypes(prepared, features, categorical_features)

    if prepared.empty:
        raise ValueError("No rows available for training after preparation")

    return prepared


def train_model_dev(
    df: pd.DataFrame,
    *,
    target_col: str = "valeurfonc",
    date_col: str = "datemut",
    features: list[str] | None = None,
    categorical_features: list[str] | None = None,
    train_ratio: float = 0.8,
    max_train_rows: int | None = None,
    n_iter: int = 50,
    n_cv_splits: int = 5,
    random_state: int = 42,
    verbose: int = 0,
) -> XGBRegressor:
    """Train an XGBoost price model on a prepared DVF (+ DPE) dataframe.

    Generic training pipeline inspired by the REPIF apartment notebook:
    - target = ``log(target_col)``
    - chronological train/test split on ``date_col``
    - ``RandomizedSearchCV`` with ``TimeSeriesSplit``

    Args:
        max_train_rows: If set, keep only the most recent training rows before
            the hyperparameter search. Useful for faster notebook iterations.
        n_cv_splits: Number of time-series CV folds. Lower values train faster.

    Returns:
        Fitted ``XGBRegressor`` (best estimator from hyperparameter search).
        Use ``train_final_model`` to refit on all rows for production.
    """
    if features is None:
        features = DEFAULT_FEATURES.copy()
    if categorical_features is None:
        categorical_features = [
            col for col in DEFAULT_CATEGORICAL_FEATURES if col in features
        ]

    prepared = _prepare_training_frame(
        df,
        target_col=target_col,
        date_col=date_col,
        features=features,
        categorical_features=categorical_features,
    )

    cutoff = int(len(prepared) * train_ratio)
    if cutoff == 0 or cutoff == len(prepared):
        raise ValueError("train_ratio must leave rows in both train and test splits")

    train = prepared.iloc[:cutoff]
    if max_train_rows is not None and len(train) > max_train_rows:
        train = train.iloc[-max_train_rows:]
        logger.info(
            "Limited training set to the most recent %d rows (max_train_rows)",
            len(train),
        )

    test = prepared.iloc[cutoff:]
    x_train = train[features]
    y_train = np.log(train[target_col])

    total_fits = n_iter * n_cv_splits
    logger.info(
        "Training model on %d rows (%d train / %d hold-out), dates %s -> %s",
        len(prepared),
        len(train),
        len(test),
        train[date_col].min().date(),
        train[date_col].max().date(),
    )
    logger.info(
        "Hyperparameter search: %d fits (%d iterations x %d CV folds), features=%s",
        total_fits,
        n_iter,
        n_cv_splits,
        features,
    )

    started = time.perf_counter()
    search = RandomizedSearchCV(
        XGBRegressor(
            random_state=random_state,
            n_jobs=-1,
            enable_categorical=True,
        ),
        param_distributions=PARAM_DIST,
        n_iter=n_iter,
        cv=TimeSeriesSplit(n_splits=n_cv_splits),
        scoring="neg_mean_absolute_error",
        random_state=random_state,
        n_jobs=-1,
        verbose=verbose,
    )
    search.fit(x_train, y_train)

    elapsed = time.perf_counter() - started
    logger.info("Hyperparameter search finished in %.1fs", elapsed)
    logger.info("Best CV score (neg MAE on log price): %.4f", search.best_score_)
    logger.info("Best params: %s", search.best_params_)

    return search.best_estimator_


def train_final_model(
    model_dev: XGBRegressor,
    df: pd.DataFrame,
    *,
    target_col: str = "valeurfonc",
    date_col: str = "datemut",
    features: list[str] | None = None,
    categorical_features: list[str] | None = None,
) -> XGBRegressor:
    """Refit a dev model on all prepared rows using the same hyperparameters.

    Use this after ``train_model`` + ``evaluate_model`` when you are happy with
    hold-out metrics: the dev model keeps the best params found by search, and
    this step retrains on 100% of the data for production.

    Args:
        model_dev: Fitted model returned by ``train_model``.
        df: Same raw dataframe used for dev training.

    Returns:
        New ``XGBRegressor`` fitted on all rows (train + hold-out).
    """
    if features is None:
        features = DEFAULT_FEATURES.copy()
    if categorical_features is None:
        categorical_features = [
            col for col in DEFAULT_CATEGORICAL_FEATURES if col in features
        ]

    prepared = _prepare_training_frame(
        df,
        target_col=target_col,
        date_col=date_col,
        features=features,
        categorical_features=categorical_features,
    )

    x = prepared[features]
    y = np.log(prepared[target_col])

    logger.info(
        "Refitting final model on all %d rows, dates %s -> %s",
        len(prepared),
        prepared[date_col].min().date(),
        prepared[date_col].max().date(),
    )
    tuned_params = {
        key: value
        for key, value in model_dev.get_params().items()
        if key in PARAM_DIST
    }
    logger.info("Reusing dev hyperparameters: %s", tuned_params)

    started = time.perf_counter()
    model_final = clone(model_dev)
    model_final.fit(x, y)
    elapsed = time.perf_counter() - started
    logger.info("Final model trained in %.1fs", elapsed)

    return model_final


def save_model(
    model: XGBRegressor,
    *,
    name: str,
    stage: Literal["dev", "prod"],
    models_dir: str | Path | None = None,
) -> Path:
    """Save a fitted XGBoost model under ``ml/models/``.

    Example output: ``ml/models/apartment_dev_20250620_153045.joblib``
    """
    if stage not in ("dev", "prod"):
        raise ValueError("stage must be 'dev' or 'prod'")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{name}_{stage}_{timestamp}.joblib"
    output_dir = Path(models_dir) if models_dir is not None else DEFAULT_MODELS_DIR
    output_path = output_dir / filename
    output_path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, output_path)
    logger.info("Saved %s model to %s", stage, output_path.resolve())
    return output_path.resolve()


def load_model(path: str | Path) -> XGBRegressor:
    """Load a model saved with ``save_model``."""
    model_path = Path(path)
    if not model_path.is_file():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    model = joblib.load(model_path)
    logger.info("Loaded model from %s", model_path.resolve())
    return model


def evaluate_model_dev(
    model_dev: XGBRegressor,
    df: pd.DataFrame,
    *,
    target_col: str = "valeurfonc",
    date_col: str = "datemut",
    features: list[str] | None = None,
    categorical_features: list[str] | None = None,
    train_ratio: float = 0.8,
) -> dict[str, float]:
    """Evaluate a fitted model on the chronological hold-out split.

    Predictions are back-transformed with ``exp()`` to euros before metrics.
    """
    if features is None:
        features = DEFAULT_FEATURES.copy()
    if categorical_features is None:
        categorical_features = [
            col for col in DEFAULT_CATEGORICAL_FEATURES if col in features
        ]

    prepared = _prepare_training_frame(
        df,
        target_col=target_col,
        date_col=date_col,
        features=features,
        categorical_features=categorical_features,
    )

    cutoff = int(len(prepared) * train_ratio)
    test = prepared.iloc[cutoff:]

    if test.empty:
        raise ValueError("Test split is empty; provide more rows or lower train_ratio")

    logger.info("Evaluating model on %d hold-out rows", len(test))

    y_test = test[target_col].to_numpy()
    pred = np.exp(model_dev.predict(test[features]))

    metrics = {
        "r2": float(r2_score(y_test, pred)),
        "mae_eur": float(mean_absolute_error(y_test, pred)),
        "mape_pct": float((np.abs(y_test - pred) / y_test).mean() * 100),
    }
    logger.info(
        "Evaluation metrics: R2=%.3f, MAE=%.0f EUR, MAPE=%.1f%%",
        metrics["r2"],
        metrics["mae_eur"],
        metrics["mape_pct"],
    )

    return metrics


if __name__ == "__main__":
    from repif_ml.log import configure_logging

    configure_logging()

    df_house, df_apartment = get_data_for_training(
        "../csv_data/dvf_plus",
        "../csv_data/dpe/dpe-france.csv",
    )
    
    model_apartment_dev = train_model_dev(df_apartment, verbose=1)
    metrics_apartment_dev = evaluate_model_dev(model_apartment_dev, df_apartment)
    print(metrics_apartment_dev)
    save_model(model_apartment_dev, name="apartment", stage="dev")
    
    model_house_dev = train_model_dev(df_house, verbose=1)
    metrics_house_dev = evaluate_model_dev(model_house_dev, df_house)
    print(metrics_house_dev)
    save_model(model_house_dev, name="house", stage="dev")
