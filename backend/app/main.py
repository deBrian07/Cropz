from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    SoilInput, ScoredCrop, RecommendReq, CropOut, RecommendRes,
    WeatherRequest, WeatherResponse, WeatherRecommendRequest
)
from .scoring import score_crops
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


