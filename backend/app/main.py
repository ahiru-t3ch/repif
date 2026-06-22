from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.schemas import PredictInput, PredictOutput, PredictionRecord
from app.predictor import predict_price_apartment, predict_price_house # loads models within API startup on first import
from app.geocoding import GeocodingError, geocode_address
from app.database import Base, engine, get_db
from app import models
from fastapi import HTTPException

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="REPIF API",
    description="Real Estate Prices In France — apartment and house price estimation API (beta).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    #allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


def _predict_and_save(
    input: PredictInput,
    db: Session,
    predict_fn,
) -> PredictOutput:
    try:
        geocoded = geocode_address(input.address)
    except GeocodingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    price = float(
        predict_fn(
            input.sbati,
            input.nblocdep,
            geocoded.lat,
            geocoded.lon,
            geocoded.l_codinsee,
            input.dpe_median,
            input.annee_construction,
        )
    )

    prediction = models.Prediction(
        property_type=input.property_type,
        sbati=input.sbati,
        nblocdep=input.nblocdep,
        lat=geocoded.lat,
        lon=geocoded.lon,
        l_codinsee=geocoded.l_codinsee,
        address=input.address.strip(),
        dpe_median=input.dpe_median,
        annee_construction=input.annee_construction,
        predicted_price=price,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return PredictOutput(price=price)


# Apartment prediction
@app.post("/predict/apartment", response_model=PredictOutput)
def predict_apartment(input: PredictInput, db: Session = Depends(get_db)):
    if input.property_type != "APARTMENT":
        raise HTTPException(status_code=400, detail="Invalid property type")

    return _predict_and_save(input, db, predict_price_apartment)


# House prediction
@app.post("/predict/house", response_model=PredictOutput)
def predict_house(input: PredictInput, db: Session = Depends(get_db)):
    if input.property_type != "HOUSE":
        raise HTTPException(status_code=400, detail="Invalid property type")

    return _predict_and_save(input, db, predict_price_house)