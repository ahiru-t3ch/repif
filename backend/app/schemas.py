from operator import gt
from pydantic import BaseModel, Field
from datetime import datetime

class PredictionRecord(BaseModel):
    id: int
    postal_code: str
    room_count: int
    living_area: float
    predicted_price: float
    created_at: datetime

    model_config = {"from_attributes": True}

class PredictInput(BaseModel):
    postal_code: str = Field(..., min_length=5, max_length=5)
    room_count: int = Field(..., gt=0)
    living_area: float = Field(..., gt=0)

class PredictOutput(BaseModel):
    price: float