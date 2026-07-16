from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal

class PredictionRecord(BaseModel):
    id: int
    property_type: Literal["APARTMENT", "HOUSE"]
    sbati: float
    nblocdep: int
    lat: float
    lon: float
    l_codinsee: str
    address: str
    dpe_median: int
    annee_construction: int
    predicted_price: float
    created_at: datetime

    model_config = {"from_attributes": True}

class PredictInput(BaseModel):
    property_type: Literal["APARTMENT", "HOUSE"]
    sbati: float = Field(..., gt=10)
    nblocdep: int = Field(..., ge=0)
    #lat: float = Field(..., ge=-90, le=90)
    #lon: float = Field(..., ge=-180, le=180)
    #l_codinsee: str = Field(..., min_length=5, max_length=5)
    address: str = Field(..., min_length=10, max_length=255)
    dpe_median: int = Field(..., gt=0, lt=8)
    annee_construction: int = Field(..., gt=1500, le=datetime.now().year)

class PredictOutput(BaseModel):
    price: float
    price_low: float
    price_high: float
    input_address: str
    geocoded_address: str
    geocode_score: float = Field(..., ge=0, le=1)


class AddressSuggestion(BaseModel):
    label: str
    score: float = Field(..., ge=0)
    city: str = ""
    postcode: str = ""


class SuggestOutput(BaseModel):
    suggestions: list[AddressSuggestion]


class ModelHoldoutMetrics(BaseModel):
    r2: float
    mae_eur: float = Field(..., ge=0)
    mape_pct: float = Field(..., ge=0)


class MetricsOutput(BaseModel):
    apartment: ModelHoldoutMetrics
    house: ModelHoldoutMetrics
