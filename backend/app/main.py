import logging

from fastapi import FastAPI, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.auth import JwtAuthMiddleware, is_auth_enabled
from app.config import DOCS_URL, OPENAPI_URL, REDOC_URL, is_docs_enabled
from app.rate_limit import (
    RATE_LIMIT_METRICS,
    RATE_LIMIT_PREDICT,
    RATE_LIMIT_PREDICTIONS,
    RATE_LIMIT_SHARE_CREATE,
    RATE_LIMIT_SHARE_GET,
    RATE_LIMIT_SUGGEST,
    limiter,
    rate_limit_exceeded_handler,
)
from app.schemas import (
    AddressSuggestion,
    MetricsOutput,
    PredictInput,
    PredictOutput,
    PredictionRecord,
    ShareCreateInput,
    ShareCreateOutput,
    ShareGetOutput,
    SuggestOutput,
)
from app.predictor import (  # loads models within API startup on first import
    LOCATION_NOT_COVERED,
    UnsupportedLocationError,
    predict_price_apartment,
    predict_price_house,
)
from app.geocoding import GeocodingError, geocode_address, suggest_addresses
from app.metrics import get_holdout_metrics, price_bounds
from app.database import Base, engine, get_db
from app import models
from app.shares import create_shared_scenario, get_shared_scenario
from fastapi import HTTPException
from slowapi.errors import RateLimitExceeded

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
    description="Real Estate Prices In France — apartment and house price estimation API.",
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


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


@app.get("/geocode/suggest", response_model=SuggestOutput)
@limiter.limit(RATE_LIMIT_SUGGEST)
def suggest_geocode(
    request: Request,
    q: str = Query(default="", max_length=255),
    limit: int = Query(default=5, ge=1, le=10),
):
    """Return address autocomplete suggestions from Géoplateforme BAN."""
    suggestions = suggest_addresses(q, limit=limit)
    return SuggestOutput(
        suggestions=[
            AddressSuggestion(
                label=item.label,
                score=item.score,
                city=item.city,
                postcode=item.postcode,
            )
            for item in suggestions
        ]
    )


@app.get("/metrics", response_model=MetricsOutput)
@limiter.limit(RATE_LIMIT_METRICS)
def model_metrics(request: Request):
    """Return hold-out metrics (R², MAE, MAPE) for apartment and house models."""
    return MetricsOutput(**get_holdout_metrics())


@app.get("/predictions", response_model=List[PredictionRecord])
@limiter.limit(RATE_LIMIT_PREDICTIONS)
def list_predictions(request: Request, db: Session = Depends(get_db)):
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

    try:
        price = float(
            predict_fn(
                input.sbati,
                input.nblocdep,
                geocoded.lat,
                geocoded.lon,
                geocoded.l_codinsee,
                input.dpe_median,
                input.annee_construction,
                property_rooms=input.property_rooms,
                sterr=input.land_area_m2(),
            )
        )
    except UnsupportedLocationError as exc:
        raise HTTPException(status_code=400, detail=LOCATION_NOT_COVERED) from exc

    price_low, price_high = price_bounds(price, input.property_type)

    prediction = models.Prediction(
        property_type=input.property_type,
        sbati=input.sbati,
        nblocdep=input.nblocdep,
        lat=geocoded.lat,
        lon=geocoded.lon,
        l_codinsee=geocoded.l_codinsee,
        address=geocoded.label.strip(),
        dpe_median=input.dpe_median,
        annee_construction=input.annee_construction,
        predicted_price=price,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return PredictOutput(
        price=price,
        price_low=price_low,
        price_high=price_high,
        input_address=input.address.strip(),
        geocoded_address=geocoded.label.strip(),
        geocode_score=geocoded.score,
    )


# Apartment prediction
@app.post("/predict/apartment", response_model=PredictOutput)
@limiter.limit(RATE_LIMIT_PREDICT)
def predict_apartment(request: Request, input: PredictInput, db: Session = Depends(get_db)):
    if input.property_type != "APARTMENT":
        raise HTTPException(status_code=400, detail="Invalid property type")

    return _predict_and_save(input, db, predict_price_apartment)


# House prediction
@app.post("/predict/house", response_model=PredictOutput)
@limiter.limit(RATE_LIMIT_PREDICT)
def predict_house(request: Request, input: PredictInput, db: Session = Depends(get_db)):
    if input.property_type != "HOUSE":
        raise HTTPException(status_code=400, detail="Invalid property type")

    return _predict_and_save(input, db, predict_price_house)


@app.post("/shares", response_model=ShareCreateOutput)
@limiter.limit(RATE_LIMIT_SHARE_CREATE)
def create_share(
    request: Request,
    body: ShareCreateInput,
    db: Session = Depends(get_db),
):
    row = create_shared_scenario(db, body.payload)
    return ShareCreateOutput(
        code=row.code,
        url_path=f"/r/{row.code}",
        expires_at=row.expires_at,
    )


@app.get("/shares/{code}", response_model=ShareGetOutput)
@limiter.limit(RATE_LIMIT_SHARE_GET)
def read_share(request: Request, code: str, db: Session = Depends(get_db)):
    row = get_shared_scenario(db, code)
    return ShareGetOutput(
        code=row.code,
        payload=row.payload,
        expires_at=row.expires_at,
    )
