from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from typing import List

from app.schemas import PredictInput, PredictOutput, PredictionRecord
from app.predictor import predict_price
from app.database import Base, engine, get_db
from app import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Flat Price Prediction API in Haute Garonne, France.",
    description="API for predicting flat prices in Haute Garonne, France."
)

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.get("/predictions", response_model=List[PredictionRecord])
def list_predictions(db: Session = Depends(get_db)):
    return (
        db.query(models.Prediction)
        .order_by(models.Prediction.created_at.desc())
        .all()
    )

@app.post("/predict", response_model=PredictOutput)
def predict(input: PredictInput, db: Session = Depends(get_db)):
    price = predict_price(input.postal_code, input.room_count, input.living_area)

    prediction = models.Prediction(
        postal_code=input.postal_code,
        room_count=input.room_count,
        living_area=input.living_area,
        predicted_price=price,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return PredictOutput(price=price)