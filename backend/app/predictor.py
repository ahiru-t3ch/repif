from pathlib import Path
import joblib
import pandas as pd
import numpy as np

MODEL_DIR = Path(__file__).resolve().parent.parent / "models_back"

MODEL_PATH_APARTMENT = MODEL_DIR / "apartment_dev_20260621_220900.joblib"
MODEL_PATH_HOUSE = MODEL_DIR / "house_dev_20260621_220900.joblib"

model_apartment = joblib.load(MODEL_PATH_APARTMENT)
model_house = joblib.load(MODEL_PATH_HOUSE)

# Update default features as needed
# Check ml/repif_ml/train_models.py for more details
DEFAULT_FEATURES = [
    "sbati",
    "nblocdep",
    "lat",
    "lon",
    "l_codinsee",
    "dpe_median",
    "annee_construction",
]

# Apartment prediction
def predict_price_apartment(
    sbati: float,
    nblocdep: int,
    lat: float,
    lon: float,
    l_codinsee: str,
    dpe_median: int,
    annee_construction: int
) -> float:
    """
    Predict the price of an apartment
    Args:
        sbati: float, living area m²
        nblocdep: int, nb of dependencies
        lat: float, latitude
        lon: float, longitude
        l_codinsee: str, code INSEE
        dpe_median: int, DPE 1–7 "A": 1,"B": 2,"C": 3,"D": 4,"E": 5,"F": 6,"G": 7,
        annee_construction: int, year of construction
    Returns:
        float, price in euros
    """
    data_dict = {
        'sbati': [sbati],
        'nblocdep': [nblocdep],
        'lat': [lat],
        'lon': [lon],
        'l_codinsee': [l_codinsee],
        'dpe_median': [dpe_median],
        'annee_construction': [annee_construction]
    }
    data_df = pd.DataFrame(data_dict)
    data_df["l_codinsee"] = data_df["l_codinsee"].astype("category")
    return float(np.exp(model_apartment.predict(data_df[DEFAULT_FEATURES])[0]))

# House prediction
def predict_price_house(
    sbati: float,
    nblocdep: int,
    lat: float,
    lon: float,
    l_codinsee: str,
    dpe_median: int,
    annee_construction: int
) -> float:
    """
    Predict the price of a house
    Args:
        sbati: float, living area m²
        nblocdep: int, nb of dependencies
        lat: float, latitude
        lon: float, longitude
        l_codinsee: str, code INSEE
        dpe_median: int, DPE 1–7 "A": 1,"B": 2,"C": 3,"D": 4,"E": 5,"F": 6,"G": 7,
        annee_construction: int, year of construction
    Returns:
        float, price in euros
    """
    data_dict = {
        'sbati': [sbati],
        'nblocdep': [nblocdep],
        'lat': [lat],
        'lon': [lon],
        'l_codinsee': [l_codinsee],
        'dpe_median': [dpe_median],
        'annee_construction': [annee_construction]
    }
    data_df = pd.DataFrame(data_dict)
    data_df["l_codinsee"] = data_df["l_codinsee"].astype("category")
    return float(np.exp(model_house.predict(data_df[DEFAULT_FEATURES])[0]))