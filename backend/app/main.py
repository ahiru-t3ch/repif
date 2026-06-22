import logging

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.auth import JwtAuthMiddleware, is_auth_enabled
from app.config import DOCS_URL, OPENAPI_URL, REDOC_URL, is_docs_enabled
from app.schemas import PredictInput, PredictOutput, PredictionRecord
from app.predictor import predict_price_apartment, predict_price_house # loads models within API startup on first import
from app.geocoding import GeocodingError, geocode_address
from app.database import Base, engine, get_db
from app import models
from fastapi import HTTPException

Base.metadata.create_all(bind=engine)

logger = logging.getLogger(__name__)
if not is_auth_enabled():
    logger.warning(
        "BACKEND_JWT_PUBLIC_KEY is not set — API routes are open. "
        "Set JWT keys on the backend and frontend for production."
    )

docs_enabled = is_docs_enabled()
if not docs_enabled:
    logger.info("ENABLE_DOCS is off — Swagger UI and OpenAPI schema are disabled.")

app = FastAPI(
    title="REPIF API",
    description="Real Estate Prices In France — apartment and house price estimation API (beta).",
    docs_url=DOCS_URL if docs_enabled else None,
    redoc_url=REDOC_URL if docs_enabled else None,
    openapi_url=OPENAPI_URL if docs_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    #allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(JwtAuthMiddleware)


def _configure_openapi_security() -> None:
    if not is_auth_enabled() or not docs_enabled:
        return

    doc_paths = {"/", DOCS_URL, REDOC_URL, OPENAPI_URL}

    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema

        from fastapi.openapi.utils import get_openapi

        schema = get_openapi(
            title=app.title,
            version=getattr(app, "version", "0.1.0"),
            description=app.description,
            routes=app.routes,
        )
        schema.setdefault("components", {})["securitySchemes"] = {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        }
        for path, path_item in schema.get("paths", {}).items():
            if path in doc_paths:
                continue
            for method, operation in path_item.items():
                if isinstance(operation, dict):
                    operation["security"] = [{"BearerAuth": []}]

        app.openapi_schema = schema
        return app.openapi_schema

    app.openapi = custom_openapi


_configure_openapi_security()


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
