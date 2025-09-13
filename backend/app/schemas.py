from pydantic import BaseModel, Field
from typing import Literal, Optional


SoilType = Literal[
    "sandy",
    "clay",
    "silt",
    "peat",
    "chalk",
    "loam",
]


class SoilInput(BaseModel):
    # From location
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Soil identification
    soil_type: SoilType | None = None

    # Soil test kit values
    ph: float = Field(..., ge=0, le=14)
    nitrogen: int = Field(..., ge=0, le=5, description="Relative scale 0-5")
    phosphorus: int = Field(..., ge=0, le=5, description="Relative scale 0-5")
    potassium: int = Field(..., ge=0, le=5, description="Relative scale 0-5")

    # Tools available
    has_tractor: bool = False
    irrigation: bool = False

    # Farm preferences
    easy_maintenance_preference: int = Field(3, ge=1, le=5)


class ScoredCrop(BaseModel):
    crop: str
    match_pct: int = Field(..., ge=0, le=100)
    rotation_group: Literal["legumes", "root_veggies", "greens_brassicas", "fruiting"]


