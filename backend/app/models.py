from typing import Any


from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    property_type = Column(String, nullable=False)
    sbati = Column[Any](Float, nullable=False)
    nblocdep = Column[Any](Integer, nullable=False)
    lat = Column[Any](Float, nullable=False)
    lon = Column[Any](Float, nullable=False)
    l_codinsee = Column[Any](String, nullable=False)
    dpe_median = Column[Any](Integer, nullable=False)
    annee_construction = Column[Any](Integer, nullable=False)
    predicted_price = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())