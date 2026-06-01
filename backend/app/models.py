from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    postal_code = Column(String, nullable=False)
    room_count = Column(Integer, nullable=False)
    living_area = Column(Float, nullable=False)
    predicted_price = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())