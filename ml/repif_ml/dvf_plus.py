import logging
import os
import time

import pandas as pd

from repif_ml.geo import add_lat_lon

logger = logging.getLogger(__name__)

READ_COLS = [
    "idmutation",
    "datemut",
    "anneemut",
    "moismut",
    "valeurfonc",
    "sbati",
    "nblocdep",
    "l_codinsee",
]

OUTPUT_COLS = READ_COLS + ["lon", "lat",]

WORK_COLS = [
    "idnatmut", "codtypbien",
    "nblocapt", "nblocmai", "nblocact",
    "coddep", "geompar_x", "geompar_y",
]

USECOLS = READ_COLS + WORK_COLS

COMMON_QUERY = (
    "idnatmut == 1 "
    "and codtypbien in [111, 121] "
    "and anneemut >= 2023 "
    "and valeurfonc > 10000 "
    "and sbati > 10 "
    "and 500 <= valeurfonc / sbati <= 15000 "
    "and nblocact == 0 "
    "and ("
    "(codtypbien == 111 and nblocmai == 1 and nblocapt == 0) "
    "or "
    "(codtypbien == 121 and nblocapt == 1 and nblocmai == 0)"
    ")"
)

DTYPES = {
    "idmutation": "int32",
    "datemut": str,
    "anneemut": "int16",
    "moismut": "int8",
    "valeurfonc": "float32",
    "sbati": "float32",
    "nblocdep": "int8",
    "l_codinsee": str,
    "coddep": str,
    "geompar_x": "float64",
    "geompar_y": "float64",
    "idnatmut": "int8",
    "codtypbien": "int16",
    "nblocapt": "int8",
    "nblocmai": "int8",
    "nblocact": "int8",
}

STRING_COLS = ["datemut", "l_codinsee", "coddep"]

def process_dvf_plus_csv(csv_dir_path: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load and filter DVF+ mutation CSV files, then split by property type.

    Reads every ``*.csv`` file in ``csv_dir_path`` (pipe-separated), applies
    ``COMMON_QUERY`` filters, converts parcel geometry to WGS84 coordinates,
    and returns separate DataFrames for houses and apartments.

    Filters applied (see ``COMMON_QUERY``):
        - Sales only (``idnatmut == 1``)
        - Property types 111 (house) or 121 (apartment)
        - Year ``anneemut >= 2023``
        - Price and surface thresholds, including price per m² bounds
        - Single-lot sales with no commercial lots (``nblocact == 0``)

    Args:
        csv_dir_path: Directory containing DVF+ department CSV files.

    Returns:
        A tuple ``(df_house, df_apartment)`` with columns from ``OUTPUT_COLS``
        (including computed ``lon`` and ``lat``).

    Raises:
        FileNotFoundError: If the directory contains no ``*.csv`` files.
        RuntimeError: If a CSV file cannot be read or filtered.
        ValueError: If a file or the full dataset yields no rows after filters,
            or if neither houses nor apartments remain after the split.
    """
    csv_files = sorted(
        f for f in os.listdir(csv_dir_path) if f.endswith(".csv")
    )
    if not csv_files:
        raise FileNotFoundError(f"No CSV files in {csv_dir_path}")

    logger.info("Loading DVF+ from %s (%d CSV files)", csv_dir_path, len(csv_files))
    started = time.perf_counter()

    chunks: list[pd.DataFrame] = []
    for index, csv_file in enumerate(csv_files, start=1):
        path = os.path.join(csv_dir_path, csv_file)
        logger.info("[%d/%d] Reading %s", index, len(csv_files), csv_file)
        try:
            chunk = (
                pd.read_csv(
                    path,
                    sep="|",
                    usecols=USECOLS,
                    dtype=DTYPES,
                    low_memory=False,
                )
                .query(COMMON_QUERY, engine="python")
            )
        except Exception as e:
            raise RuntimeError(f"Failed to process {csv_file}") from e

        if chunk.empty:
            raise ValueError(f"{csv_file}: 0 rows after filters")

        logger.info("[%d/%d] %s -> %d rows after filters", index, len(csv_files), csv_file, len(chunk))
        chunks.append(chunk)

    df = pd.concat(chunks, ignore_index=True)
    if df.empty:
        raise ValueError(f"No rows loaded from {csv_dir_path}")

    logger.info("Concatenated DVF+ rows: %d", len(df))

    logger.info("Converting parcel coordinates to WGS84 lat/lon")
    df = add_lat_lon(df, "geompar_x", "geompar_y")

    for col in STRING_COLS:
        df[col] = df[col].astype("string").str.strip()

    before_clean = len(df)
    df.dropna(subset=["valeurfonc", "sbati", "lat", "lon"])

    df.drop_duplicates(subset=["idmutation"])

    df_house = df.loc[df["codtypbien"] == 111, OUTPUT_COLS]
    df_apartment = df.loc[df["codtypbien"] == 121, OUTPUT_COLS]

    if df_house.empty and df_apartment.empty:
        raise ValueError("No house or apartment rows after split")

    elapsed = time.perf_counter() - started
    logger.info(
        "DVF+ ready in %.1fs: %d houses, %d apartments (from %d rows before split)",
        elapsed,
        len(df_house),
        len(df_apartment),
        before_clean,
    )

    return df_house, df_apartment