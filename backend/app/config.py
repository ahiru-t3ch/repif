import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DOCS_URL = "/docs"
REDOC_URL = "/redoc"
OPENAPI_URL = "/openapi.json"

MODEL_DIR = Path(__file__).resolve().parent.parent / "models_back"
DEFAULT_MODEL_APARTMENT = "apartment_dev_20260621_220900.joblib"
DEFAULT_MODEL_HOUSE = "house_dev_20260621_220900.joblib"
DEFAULT_MODEL_METRICS = "metrics_dev.json"


def _env_flag(name: str, *, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_docs_enabled() -> bool:
    """When False, FastAPI does not expose /docs, /redoc, or /openapi.json."""
    return _env_flag("ENABLE_DOCS", default=False)


def jwt_public_paths() -> frozenset[str]:
    paths = {"/"}
    if is_docs_enabled():
        paths |= {DOCS_URL, REDOC_URL, OPENAPI_URL}
    return frozenset(paths)


def model_apartment_filename() -> str:
    value = os.getenv("MODEL_APARTMENT", DEFAULT_MODEL_APARTMENT).strip()
    return value or DEFAULT_MODEL_APARTMENT


def model_house_filename() -> str:
    value = os.getenv("MODEL_HOUSE", DEFAULT_MODEL_HOUSE).strip()
    return value or DEFAULT_MODEL_HOUSE


def model_path_apartment() -> Path:
    return MODEL_DIR / model_apartment_filename()


def model_path_house() -> Path:
    return MODEL_DIR / model_house_filename()


def model_metrics_filename() -> str:
    value = os.getenv("MODEL_METRICS", DEFAULT_MODEL_METRICS).strip()
    return value or DEFAULT_MODEL_METRICS


def model_path_metrics() -> Path:
    return MODEL_DIR / model_metrics_filename()
