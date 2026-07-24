from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


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
    address: str = Field(..., min_length=10, max_length=255)
    dpe_median: int = Field(..., gt=0, lt=8)
    annee_construction: int = Field(..., gt=1500, le=datetime.now().year)
    property_rooms: int = Field(
        ...,
        ge=1,
        le=10,
        description="Room count (T1=1, T2=2, …) — maps to apartement_rooms / home_rooms",
    )
    sterr: float | None = Field(
        None,
        ge=0,
        le=50_000,
        description="Land area m² (required for houses, optional for apartments)",
    )

    @model_validator(mode="after")
    def validate_land_area(self) -> "PredictInput":
        if self.property_type == "HOUSE":
            if self.sterr is None or self.sterr <= 0:
                raise ValueError("sterr is required and must be > 0 for houses")
        if self.property_type == "APARTMENT" and self.sterr is not None:
            if self.sterr > 5_000:
                raise ValueError("sterr must be <= 5000 m² for apartments")
        return self

    def land_area_m2(self) -> float:
        if self.sterr is None:
            return 0.0
        return float(self.sterr)


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


class ShareCreateInput(BaseModel):
    """Opaque scenario snapshot produced by the frontend (versioned)."""

    payload: dict


class ShareCreateOutput(BaseModel):
    code: str
    url_path: str
    expires_at: datetime


class ShareGetOutput(BaseModel):
    code: str
    payload: dict
    expires_at: datetime
