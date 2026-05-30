from operator import gt
from pydantic import BaseModel, Field

class PredictInput(BaseModel):
    postal_code: str = Field(..., min_length=5, max_length=5)
    room_count: int = Field(..., gt=0)
    living_area: float = Field(..., gt=0)

class PredictOutput(BaseModel):
    price: float