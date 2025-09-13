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


class RecommendRes(BaseModel):
    recommendations: list[CropOut]


# Rotation schemas
class RotationReq(BaseModel):
    # Category-based request matching CSV bands
    N: Literal["N0", "N1", "N2", "N3", "N4"]
    P: Literal["P0", "P1", "P2", "P3", "P4"]
    K: Literal["K0", "K1", "K2", "K3", "K4"]
    pH_cat: Literal["pH0", "pH1", "pH2"]


class RotationYearOptions(BaseModel):
    Year1_options: list[str]
    Year2_options: list[str]
    Year3_options: list[str]
    Year4_options: list[str]


class RotationScoreReq(BaseModel):
    # Soil for scoring context
    soil: SoilInput
    # Preselected rotation options, if client has them; otherwise backend can compute
    rotation: RotationYearOptions | None = None


class RotationScoreRes(BaseModel):
    year1: list[ScoredCrop]
    year2: list[ScoredCrop]
    year3: list[ScoredCrop]
    year4: list[ScoredCrop]


# Auto-recommend (no weather required) schema
class RecommendAutoReq(BaseModel):
    # Frontend sends 5-bin labels and 3 pH categories
    N: Literal["N0", "N1", "N2", "N3", "N4"]
    P: Literal["P0", "P1", "P2", "P3", "P4"]
    K: Literal["K0", "K1", "K2", "K3", "K4"]
    pH_cat: Literal["pH0", "pH1", "pH2"]
    # Optional metadata from frontend
    latitude: float | None = None
    longitude: float | None = None
    soil_type: SoilType | None = None

