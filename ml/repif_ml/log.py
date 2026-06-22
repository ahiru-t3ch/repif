import logging
import sys
from datetime import datetime
from pathlib import Path

DEFAULT_LOG_DIR = Path(__file__).resolve().parent.parent / "models"

_LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
_LOG_DATE_FORMAT = "%H:%M:%S"


def configure_logging(
    level: int = logging.INFO,
    log_file: str | Path | None = None,
) -> Path:
    """Enable repif_ml logs on stdout and in ``ml/models/*.log``.

    Call once at the start of a notebook or script. Returns the log file path.
    """
    log_dir = DEFAULT_LOG_DIR
    log_dir.mkdir(parents=True, exist_ok=True)

    if log_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_path = log_dir / f"repif_ml_{timestamp}.log"
    else:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_LOG_DATE_FORMAT)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    root.addHandler(stdout_handler)

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    resolved = log_path.resolve()
    logging.getLogger(__name__).info("Logging to %s", resolved)
    return resolved
