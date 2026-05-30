from fastapi import FastAPI

from app.schemas import PredictInput, PredictOutput
from app.predictor import predict_price

app = FastAPI(
    title="Flat Price Prediction API in Haute Garonne, France.",
    description="API for predicting flat prices in Haute Garonne, France."
)

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.post("/predict", response_model=PredictOutput)
def predict(input: PredictInput):
    price = predict_price(input.postal_code, input.room_count, input.living_area)
    return PredictOutput(price=price)