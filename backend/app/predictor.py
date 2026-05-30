from pathlib import Path
import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent.parent / "model.pkl"

model = joblib.load(MODEL_PATH)


numeric_features = ['room_count', 'living_area']
categorical_features = ['postal_code']

def predict_price(postal_code: str, room_count: int, living_area: int) -> float:
    data_dict = {
        'postal_code': [postal_code],
        'room_count': [room_count],
        'living_area': [living_area]
    }
    data_df = pd.DataFrame(data_dict)
    return float(model.predict(data_df)[0])