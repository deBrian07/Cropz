from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    SoilInput,
    ScoredCrop,
    RecommendReq,
    CropOut,
    RecommendRes,
    WeatherRequest,
    WeatherResponse,
    WeatherRecommendRequest,
    RotationReq,
    RotationYearOptions,
    RotationScoreReq,
    RotationScoreRes,
    RecommendAutoReq,
)
from .scoring import score_crops, score_specific_crops
from .rotation import (
    compute_rotation_options_from_categories,
    five_label_to_lmh,
    ph_cat_to_band,
    representative_value_from_five_label,
    ph_cat_to_value,
)
from .weather import get_weather_data_for_city_free
from .weather_scoring import WeatherScorer
import sys
from pathlib import Path

# Add the project root to Python path for ML imports
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

try:
    from ml.inference import get_crop_recommendations_with_reasons
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("Warning: ML model not available. Install required packages and train model.")

app = FastAPI(title="Cropz Backend", version="0.1.0")

# Allow local dev from Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/score", response_model=list[ScoredCrop])
async def score_endpoint(payload: SoilInput) -> list[ScoredCrop]:
    """Placeholder scoring endpoint.
    Returns a list of crops with mock percentage matches based on simple heuristics.
    """
    return score_crops(payload)


@app.post("/recommend", response_model=RecommendRes)
async def recommend(req: RecommendReq):
    """ML-powered crop recommendation endpoint."""
    if not ML_AVAILABLE:
        return {"recommendations": []}
    
    try:
        # Convert request to payload format
        payload = {
            "N": req.N,
            "P": req.P, 
            "K": req.K,
            "temperature": req.temperature,
            "humidity": req.humidity,
            "ph": req.ph,
            "rainfall": req.rainfall
        }
        
        # Get ML recommendations
        recommendations = get_crop_recommendations_with_reasons(payload, k=5)
        
        # Convert to response format
        cards = []
        for rec in recommendations:
            cards.append(CropOut(
                name=rec["crop"],
                ml_prob=rec["prob"],
                percent=rec["percent"],
                reasons=rec.get("reasons", [])
            ))
        
        return {"recommendations": cards}
        
    except Exception as e:
        print(f"Error in ML recommendation: {e}")
        return {"recommendations": []}


@app.post("/weather", response_model=WeatherResponse)
async def get_weather_data(req: WeatherRequest):
    """Get weather data for a city during the growing season (March-May)."""
    try:
        weather_data = get_weather_data_for_city_free(req.city, req.year)
        return WeatherResponse(
            temperature=weather_data.temperature,
            humidity=weather_data.humidity,
            rainfall=weather_data.rainfall,
            location=weather_data.location,
            period=weather_data.period
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/rotation", response_model=RotationYearOptions)
async def rotation(req: RotationReq):
    """Return 4-year crop rotation options from 5-bin categories and pH cat."""
    try:
        options = compute_rotation_options_from_categories(
            N_band=five_label_to_lmh(req.N),
            P_band=five_label_to_lmh(req.P),
            K_band=five_label_to_lmh(req.K),
            ph_band=ph_cat_to_band(req.pH_cat),
        )
        return options  # type: ignore[return-value]
    except Exception as e:
        print(f"Error in rotation endpoint: {e}")
        return RotationYearOptions(Year1_options=[], Year2_options=[], Year3_options=[], Year4_options=[])


@app.post("/rotation/score", response_model=RotationScoreRes)
async def rotation_score(req: RotationScoreReq):
    """Score rotation crops per year based on SoilInput and optional rotation options.

    If rotation options are not provided, they are computed from N/P/K and pH.
    """
    try:
        rot = req.rotation
        if rot is None:
            # Derive bands from SoilInput 0-5 levels
            n_band = "High" if req.soil.nitrogen >= 4 else ("Medium" if req.soil.nitrogen >= 2 else "Low")
            p_band = "High" if req.soil.phosphorus >= 4 else ("Medium" if req.soil.phosphorus >= 2 else "Low")
            k_band = "High" if req.soil.potassium >= 4 else ("Medium" if req.soil.potassium >= 2 else "Low")
            ph_band = "Acidic (5.0–5.9)" if req.soil.ph < 6.0 else ("Neutral (6.0–7.3)" if req.soil.ph <= 7.3 else "Alkaline (7.4–8.5)")
            rot_opts = compute_rotation_options_from_categories(n_band, p_band, k_band, ph_band)
        else:
            rot_opts = {
                "Year1_options": rot.Year1_options,
                "Year2_options": rot.Year2_options,
                "Year3_options": rot.Year3_options,
                "Year4_options": rot.Year4_options,
            }

        y1 = score_specific_crops(req.soil, rot_opts.get("Year1_options", []))
        y2 = score_specific_crops(req.soil, rot_opts.get("Year2_options", []))
        y3 = score_specific_crops(req.soil, rot_opts.get("Year3_options", []))
        y4 = score_specific_crops(req.soil, rot_opts.get("Year4_options", []))

        return RotationScoreRes(year1=y1, year2=y2, year3=y3, year4=y4)
    except Exception as e:
        print(f"Error in rotation/score endpoint: {e}")
        empty: list[ScoredCrop] = []
        return RotationScoreRes(year1=empty, year2=empty, year3=empty, year4=empty)


@app.post("/recommend/auto", response_model=RecommendRes)
async def recommend_auto(req: RecommendAutoReq):
    """Like /recommend but uses 5-bin categories for N/P/K and 3-cat pH, with dummy weather."""
    if not ML_AVAILABLE:
        return {"recommendations": []}

    try:
        payload = {
            "N": representative_value_from_five_label("N", req.N),
            "P": representative_value_from_five_label("P", req.P),
            "K": representative_value_from_five_label("K", req.K),
            "temperature": 22.0,
            "humidity": 65.0,
            "ph": ph_cat_to_value(req.pH_cat),
            "rainfall": 2.0,
        }

        recommendations = get_crop_recommendations_with_reasons(payload, k=5)

        cards = []
        for rec in recommendations:
            cards.append(CropOut(
                name=rec["crop"],
                ml_prob=rec["prob"],
                percent=rec["percent"],
                reasons=rec.get("reasons", []),
            ))

        return {"recommendations": cards}
    except Exception as e:
        print(f"Error in ML recommendation auto: {e}")
        return {"recommendations": []}
@app.post("/recommend-with-weather", response_model=RecommendRes)
async def recommend_with_weather(req: WeatherRecommendRequest):
    """Get crop recommendations using weather data from a city location."""
    if not ML_AVAILABLE:
        return {"recommendations": []}
    
    try:
        # Get weather data for the city
        weather_data = get_weather_data_for_city_free(req.city, req.year)
        
        # Convert request to payload format with weather data
        payload = {
            "N": req.N,
            "P": req.P, 
            "K": req.K,
            "temperature": weather_data.temperature,
            "humidity": weather_data.humidity,
            "ph": req.ph,
            "rainfall": weather_data.rainfall
        }
        
        # Get ML recommendations
        recommendations = get_crop_recommendations_with_reasons(payload, k=5)
        
        # Initialize weather scorer
        weather_scorer = WeatherScorer()
        
        # Convert to response format with weather scores
        cards = []
        for rec in recommendations:
            # Calculate weather score for this crop
            weather_score_data = weather_scorer.calculate_weather_score(
                rec["crop"], 
                weather_data.temperature, 
                weather_data.humidity, 
                weather_data.rainfall
            )
            
            cards.append(CropOut(
                name=rec["crop"],
                ml_prob=rec["prob"],
                percent=rec["percent"],
                reasons=rec.get("reasons", []),
                weather_score=weather_score_data["score"],
                weather_breakdown=weather_score_data["breakdown"],
                weather_reasons=weather_score_data["reasons"]
            ))
        
        return {"recommendations": cards}
        
    except Exception as e:
        print(f"Error in weather-based recommendation: {e}")
        raise HTTPException(status_code=400, detail=str(e))


