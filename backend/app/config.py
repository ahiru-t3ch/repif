import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DOCS_URL = "/docs"
REDOC_URL = "/redoc"
OPENAPI_URL = "/openapi.json"

MODEL_DIR = Path(__file__).resolve().parent.parent / "models_back"
DEFAULT_MODEL_APARTMENT = "apartment_prod_20260723_144015.joblib"
DEFAULT_MODEL_HOUSE = "house_prod_20260723_162418.joblib"
DEFAULT_MODEL_METRICS_APARTMENT = "metrics_prod_20260723_144015_apartment.json"
DEFAULT_MODEL_METRICS_HOUSE = "metrics_prod_20260723_162418_house.json"
DEFAULT_COMMUNE_LOOKUP_APARTMENT = "commune_price_m2_lookup_apartment.json"
DEFAULT_COMMUNE_LOOKUP_HOUSE = "commune_price_m2_lookup_house.json"
# Legacy combined metrics file (ml/repif_ml); ignored when per-model metrics are set.
DEFAULT_MODEL_METRICS = "metrics_dev.json"
DEFAULT_COMMUNE_LOOKUP = "commune_price_m2_lookup.json"


def _env_flag(name: str, *, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_docs_enabled() -> bool:
    """When False, FastAPI does not expose /docs, /redoc, or /openapi.json."""
    return _env_flag("ENABLE_DOCS", default=False)


def jwt_public_paths() -> frozenset[str]:
    """Only the health check is reachable without JWT when auth is enabled."""
    return frozenset({"/"})


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


def model_metrics_apartment_filename() -> str:
    value = os.getenv(
        "MODEL_METRICS_APARTMENT", DEFAULT_MODEL_METRICS_APARTMENT
    ).strip()
    return value or DEFAULT_MODEL_METRICS_APARTMENT


def model_metrics_house_filename() -> str:
    value = os.getenv("MODEL_METRICS_HOUSE", DEFAULT_MODEL_METRICS_HOUSE).strip()
    return value or DEFAULT_MODEL_METRICS_HOUSE


def model_path_metrics_apartment() -> Path:
    return MODEL_DIR / model_metrics_apartment_filename()


def model_path_metrics_house() -> Path:
    return MODEL_DIR / model_metrics_house_filename()


def model_metrics_filename() -> str:
    value = os.getenv("MODEL_METRICS", DEFAULT_MODEL_METRICS).strip()
    return value or DEFAULT_MODEL_METRICS


def model_path_metrics() -> Path:
    return MODEL_DIR / model_metrics_filename()


def model_commune_lookup_apartment_filename() -> str:
    value = os.getenv(
        "MODEL_COMMUNE_LOOKUP_APARTMENT", DEFAULT_COMMUNE_LOOKUP_APARTMENT
    ).strip()
    return value or DEFAULT_COMMUNE_LOOKUP_APARTMENT


def model_commune_lookup_house_filename() -> str:
    value = os.getenv(
        "MODEL_COMMUNE_LOOKUP_HOUSE", DEFAULT_COMMUNE_LOOKUP_HOUSE
    ).strip()
    return value or DEFAULT_COMMUNE_LOOKUP_HOUSE


def model_path_commune_lookup_apartment() -> Path:
    return MODEL_DIR / model_commune_lookup_apartment_filename()


def model_path_commune_lookup_house() -> Path:
    return MODEL_DIR / model_commune_lookup_house_filename()


def model_commune_lookup_filename() -> str:
    value = os.getenv("MODEL_COMMUNE_LOOKUP", DEFAULT_COMMUNE_LOOKUP).strip()
    return value or DEFAULT_COMMUNE_LOOKUP


def model_path_commune_lookup() -> Path:
    return MODEL_DIR / model_commune_lookup_filename()
