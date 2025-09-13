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


# ML Recommendation schemas
class RecommendReq(BaseModel):
    N: float = Field(..., description="Nitrogen content in soil")
    P: float = Field(..., description="Phosphorus content in soil") 
    K: float = Field(..., description="Potassium content in soil")
    ph: float = Field(..., ge=0, le=14, description="Soil pH")
    temperature: float = Field(..., description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    rainfall: float = Field(..., ge=0, description="Rainfall in mm")


class CropOut(BaseModel):
    name: str
    ml_prob: float = Field(..., description="Raw ML probability")
    percent: float = Field(..., description="Normalized percentage")
    reasons: list[str] = Field(default_factory=list, description="Explanation reasons")
    weather_score: float = Field(0.0, description="Weather compatibility score (0-100)")
    weather_breakdown: dict = Field(default_factory=dict, description="Weather score breakdown by variable")
    weather_reasons: list[str] = Field(default_factory=list, description="Weather-specific reasons")


class RecommendRes(BaseModel):
    recommendations: list[CropOut]


