from __future__ import annotations

import numpy as np
import pandas as pd
from pyproj import Transformer
from sklearn.neighbors import BallTree

from repif_ml_v2.config import DVF_BASE_COLS, PropertyConfig
from repif_ml_v2.paths import DEFAULT_DPE_CSV, DEFAULT_DVF_DIR

EARTH_RADIUS_M = 6_371_000
DPE_LABEL_TO_SCORE = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7}

DPE_READ_COLS = [
    "numero_dpe",
    "date_etablissement_dpe",
    "classe_consommation_energie",
    "annee_construction",
    "latitude",
    "longitude",
    "tr001_modele_dpe_type_libelle",
    "tr002_type_batiment_description",
]


def load_dvf(dvf_dir=DEFAULT_DVF_DIR, config: PropertyConfig | None = None) -> pd.DataFrame:
    usecols = list(DVF_BASE_COLS)
    if config is not None:
        usecols = list(dict.fromkeys([*usecols, *config.rooms_source_cols]))

    paths = sorted(dvf_dir.glob("*.csv"))
    if not paths:
        raise FileNotFoundError(f"No DVF CSV files in {dvf_dir}")

    chunks = [
        pd.read_csv(path, sep="|", usecols=usecols, low_memory=False)
        for path in paths
    ]
    return pd.concat(chunks, ignore_index=True)


def add_lon_lat(df: pd.DataFrame) -> pd.DataFrame:
    transformer = Transformer.from_crs("EPSG:2154", "EPSG:4326", always_xy=True)
    out = df.copy()
    out["lon"], out["lat"] = transformer.transform(
        out["geompar_x"].to_numpy(),
        out["geompar_y"].to_numpy(),
    )
    return out


def filter_dvf(df: pd.DataFrame, config: PropertyConfig) -> pd.DataFrame:
    sterr_ok = df["sterr"] <= config.sterr_max
    if config.sterr_strictly_positive:
        sterr_ok &= df["sterr"] > config.sterr_min
    else:
        sterr_ok &= df["sterr"] >= config.sterr_min

    filtered = df[
        (df["idnatmut"] == 1)
        & (df["codtypbien"] == config.codtypbien)
        & (df["anneemut"] >= 2023)
        & (df["valeurfonc"] > 10_000)
        & (df["sbati"] > 10)
        & (df["lon"] >= -5.5)
        & (df["lon"] <= 10)
        & (df["lat"] >= 41)
        & (df["lat"] <= 51.5)
        & ((df["valeurfonc"] / df["sbati"]).between(500, 15_000))
        & sterr_ok
    ].copy()

    return filtered.drop(columns=["geompar_x", "geompar_y"], errors="ignore")


def add_rooms(df: pd.DataFrame, config: PropertyConfig) -> pd.DataFrame:
    out = df.copy()
    c1, c2, c3, c4, c5 = config.rooms_source_cols
    out[config.rooms_feature] = (
        1 * out[c1]
        + 2 * out[c2]
        + 3 * out[c3]
        + 4 * out[c4]
        + 5 * out[c5]
    )
    out = out.drop(columns=list(config.rooms_source_cols))

    if config.name == "house":
        out["log_sterr"] = np.log(out["sterr"])

    return out


def load_dpe_buildings(
    dpe_csv=DEFAULT_DPE_CSV,
    building_types: str = "apartment",
) -> pd.DataFrame:
    df_dpe = pd.read_csv(dpe_csv, usecols=DPE_READ_COLS, low_memory=False)
    df_dpe = df_dpe[
        df_dpe["tr001_modele_dpe_type_libelle"].isin(
            ["Vente", "Location", "Neuf", "Copropriété"]
        )
    ]

    df_dpe["date_etablissement_dpe"] = pd.to_datetime(
        df_dpe["date_etablissement_dpe"], errors="coerce"
    )
    today = pd.Timestamp.today().normalize()
    current_year = today.year

    df_dpe = df_dpe[df_dpe["date_etablissement_dpe"] <= today]
    df_dpe = df_dpe[df_dpe["annee_construction"].between(1850, current_year)]

    df_dpe["dpe_median"] = (
        df_dpe["classe_consommation_energie"]
        .astype(str)
        .str.strip()
        .str.upper()
        .map(DPE_LABEL_TO_SCORE)
    )

    df_dpe = df_dpe.rename(columns={"latitude": "lat", "longitude": "lon"})
    df_dpe = df_dpe.dropna(subset=["dpe_median", "annee_construction", "lat", "lon"])
    df_dpe = df_dpe.drop_duplicates(subset=["numero_dpe"], keep="first")

    building_type = df_dpe["tr002_type_batiment_description"].astype(str)
    if building_types == "apartment":
        df_dpe = df_dpe[
            building_type.str.contains("collectif", case=False, na=False)
            | (building_type == "Logement")
        ]
    else:
        df_dpe = df_dpe[
            building_type.str.contains("Maison", case=False, na=False)
            | (
                (building_type == "Logement")
                & ~building_type.str.contains("collectif", case=False, na=False)
            )
        ]

    dpe_bat = (
        df_dpe.groupby(["lat", "lon"], as_index=False)
        .agg(
            dpe_median=("dpe_median", "median"),
            annee_construction=("annee_construction", "first"),
        )
    )
    dpe_bat["dpe_median"] = dpe_bat["dpe_median"].round().astype(int)
    return dpe_bat


def merge_dpe_on_dvf(
    dvf_df: pd.DataFrame,
    dpe_bat: pd.DataFrame,
    max_dist_m: float,
) -> tuple[pd.DataFrame, float]:
    result = dvf_df.copy()
    result["dpe_median"] = np.nan
    result["annee_construction"] = np.nan

    valid = result.dropna(subset=["lat", "lon"])
    dpe_ok = dpe_bat.dropna(subset=["lat", "lon"]).reset_index(drop=True)
    if valid.empty or dpe_ok.empty:
        return result, 0.0

    dvf_rad = np.radians(valid[["lat", "lon"]].to_numpy())
    dpe_rad = np.radians(dpe_ok[["lat", "lon"]].to_numpy())

    tree = BallTree(dpe_rad, metric="haversine")
    dist, idx = tree.query(dvf_rad, k=1)

    dist_m = dist[:, 0] * EARTH_RADIUS_M
    match_idx = idx[:, 0].astype(float)
    match_idx[dist_m > max_dist_m] = np.nan

    dpe_idx = pd.Series(match_idx, index=valid.index)
    result.loc[valid.index, "dpe_median"] = dpe_idx.map(dpe_ok["dpe_median"])
    result.loc[valid.index, "annee_construction"] = dpe_idx.map(
        dpe_ok["annee_construction"]
    )

    match_rate = float(dpe_idx.notna().mean())
    return result, match_rate


def prepare_training_frame(
    config: PropertyConfig,
    *,
    dvf_dir=DEFAULT_DVF_DIR,
    dpe_csv=DEFAULT_DPE_CSV,
) -> tuple[pd.DataFrame, float]:
    df = load_dvf(dvf_dir, config)
    df = add_lon_lat(df)
    df = filter_dvf(df, config)
    df = add_rooms(df, config)

    dpe_bat = load_dpe_buildings(dpe_csv, building_types=config.dpe_building_types)
    df, match_rate = merge_dpe_on_dvf(df, dpe_bat, config.max_dist_m)

    keep_cols = ["datemut", *config.features, "valeurfonc"]
    out = df[keep_cols].copy()

    required = [c for c in out.columns if c not in ("dpe_median", "annee_construction")]
    out = out.dropna(subset=required)
    out = out.drop_duplicates()
    return out, match_rate
