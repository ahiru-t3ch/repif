import logging
import os
import time

import pandas as pd

logger = logging.getLogger(__name__)
READ_COLS = [
    "numero_dpe",
    "date_etablissement_dpe",
    "classe_consommation_energie",
    "annee_construction",
    "latitude",
    "longitude",
    "surface_thermique_lot",
    "code_insee_commune_actualise",
]

WORK_COLS = [
    "tr001_modele_dpe_type_libelle",
]

USECOLS = READ_COLS + WORK_COLS

OUTPUT_COLS = [
    "numero_dpe",
    "date_etablissement_dpe",
    "dpe_num",
    "annee_construction",
    "surface_thermique_lot",
    "code_insee_commune_actualise",
    "lat",
    "lon",
]

TR001_TYPES = ["Vente", "Location", "Neuf", "Copropriété"]

DTYPES = {
    "numero_dpe": str,
    "date_etablissement_dpe": str,
    "classe_consommation_energie": str,
    "annee_construction": "Int64",
    "latitude": "float64",
    "longitude": "float64",
    "surface_thermique_lot": "float32",
    "code_insee_commune_actualise": str,
    "tr001_modele_dpe_type_libelle": str,
}

DPE_LABEL_TO_SCORE = {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 6,
    "G": 7,
}

STRING_COLS = [
    "numero_dpe",
    "classe_consommation_energie",
    "code_insee_commune_actualise",
]


def _resolve_csv_paths(csv_path: str) -> list[str]:
    if os.path.isfile(csv_path):
        return [csv_path]
    if os.path.isdir(csv_path):
        csv_files = sorted(
            os.path.join(csv_path, name)
            for name in os.listdir(csv_path)
            if name.endswith(".csv")
        )
        if not csv_files:
            raise FileNotFoundError(f"No CSV files in {csv_path}")
        return csv_files
    raise FileNotFoundError(f"Path not found: {csv_path}")


def _clean_dpe(df: pd.DataFrame) -> pd.DataFrame:
    today = pd.Timestamp.today().normalize()
    current_year = today.year

    df = df.copy()
    df["date_etablissement_dpe"] = pd.to_datetime(
        df["date_etablissement_dpe"], errors="coerce"
    )
    df = df[df["date_etablissement_dpe"] <= today]

    df = df[
        df["annee_construction"].between(1850, current_year)
        & (df["annee_construction"] != 1900)
    ]

    df["dpe_num"] = (
        df["classe_consommation_energie"]
        .astype("string")
        .str.strip()
        .str.upper()
        .map(DPE_LABEL_TO_SCORE)
    )

    df = df.rename(columns={"latitude": "lat", "longitude": "lon"})

    for col in STRING_COLS:
        df[col] = df[col].astype("string").str.strip()

    df = df.dropna(
        subset=[
            "date_etablissement_dpe",
            "dpe_num",
            "annee_construction",
            "lat",
            "lon",
        ]
    )
    df = df.drop_duplicates(subset=["numero_dpe"], keep="first")

    return df.loc[:, OUTPUT_COLS]


def process_dpe_csv(csv_path: str) -> pd.DataFrame:
    """Load and clean ADEME DPE CSV data for spatial join with DVF sales.

    Accepts a CSV file path or a directory containing ``*.csv`` files.
    Keeps valid DPE model types (``TR001_TYPES``), valid energy labels, plausible
    construction years, and WGS84 coordinates without rounding.

    Args:
        csv_path: Path to a DPE CSV file or directory of CSV files.

    Returns:
        Cleaned DataFrame with columns from ``OUTPUT_COLS``.

    Raises:
        FileNotFoundError: If the path does not exist or contains no CSV files.
        RuntimeError: If a CSV file cannot be read or filtered.
        ValueError: If a file or the full dataset yields no rows after cleaning.
    """
    csv_files = _resolve_csv_paths(csv_path)
    logger.info("Loading DPE from %s (%d CSV files)", csv_path, len(csv_files))
    started = time.perf_counter()
    chunks: list[pd.DataFrame] = []

    for index, path in enumerate(csv_files, start=1):
        file_name = os.path.basename(path)
        logger.info("[%d/%d] Reading %s", index, len(csv_files), file_name)
        try:
            chunk = pd.read_csv(
                path,
                sep=",",
                usecols=USECOLS,
                dtype=DTYPES,
                low_memory=False,
            )
            chunk = chunk[chunk["tr001_modele_dpe_type_libelle"].isin(TR001_TYPES)]
        except Exception as e:
            raise RuntimeError(f"Failed to process {path}") from e

        if chunk.empty:
            raise ValueError(f"{path}: 0 rows after filters")

        logger.info("[%d/%d] %s -> %d rows after filters", index, len(csv_files), file_name, len(chunk))
        chunks.append(chunk)

    df = pd.concat(chunks, ignore_index=True)
    if df.empty:
        raise ValueError(f"No rows loaded from {csv_path}")

    logger.info("Concatenated DPE rows: %d", len(df))
    logger.info("Cleaning DPE rows")
    df = _clean_dpe(df)
    if df.empty:
        raise ValueError(f"No rows remaining after cleaning for {csv_path}")

    elapsed = time.perf_counter() - started
    logger.info("DPE ready in %.1fs: %d rows", elapsed, len(df))

    return df


def aggregate_dpe_buildings(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate cleaned DPE rows by exact coordinates (one row per building).

    Uses full-precision ``lat``/``lon`` for grouping. Computes the median
    energy score and keeps the first construction year per building.
    """
    required_cols = {"lat", "lon", "dpe_num", "annee_construction"}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise ValueError(f"Missing columns for aggregation: {sorted(missing_cols)}")

    logger.info("Aggregating DPE buildings from %d rows", len(df))
    started = time.perf_counter()

    dpe_bat = (
        df.groupby(["lat", "lon"], as_index=False)
        .agg(
            dpe_median=("dpe_num", "median"),
            annee_construction=("annee_construction", "first"),
        )
    )
    dpe_bat["dpe_median"] = dpe_bat["dpe_median"].round().astype(int)

    elapsed = time.perf_counter() - started
    logger.info(
        "DPE aggregation done in %.1fs: %d buildings",
        elapsed,
        len(dpe_bat),
    )

    return dpe_bat
