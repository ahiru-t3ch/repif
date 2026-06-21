import pandas as pd
from pyproj import Transformer
from functools import lru_cache

DOM_EPSG = {
    "971": "EPSG:5490",
    "972": "EPSG:5490",
    "973": "EPSG:2972",
    "974": "EPSG:2975",
}

def _get_source_epsg(coddep: str) -> str:
    if coddep in DOM_EPSG:
        return DOM_EPSG[coddep]
    if coddep in ("2A", "2B") or (coddep.isdigit() and len(coddep) == 2):
        return "EPSG:2154"
    raise ValueError(f"Unknown coddep for CRS mapping: {coddep!r}")

@lru_cache
def _get_transformer(source_epsg: str) -> Transformer:
    return Transformer.from_crs(source_epsg, "EPSG:4326", always_xy=True)

def add_lat_lon(df: pd.DataFrame, geo_x_col_name: str , geo_y_col_name: str) -> pd.DataFrame:
    df = df.copy()
    lon = pd.Series(index=df.index, dtype="float64")
    lat = pd.Series(index=df.index, dtype="float64")
    for coddep, group in df.groupby("coddep", sort=False):
        transformer = _get_transformer(_get_source_epsg(coddep))
        group_lon, group_lat = transformer.transform(
            group[geo_x_col_name].to_numpy(),
            group[geo_y_col_name].to_numpy(),
        )
        lon.loc[group.index] = group_lon
        lat.loc[group.index] = group_lat
    df["lon"] = lon
    df["lat"] = lat
    return df