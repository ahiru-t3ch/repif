import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    """Enable repif_ml progress logs (call once at the start of a notebook or script)."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
