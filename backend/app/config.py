import os

from dotenv import load_dotenv

load_dotenv()

DOCS_URL = "/docs"
REDOC_URL = "/redoc"
OPENAPI_URL = "/openapi.json"


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
