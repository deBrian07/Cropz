from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import SoilInput, ScoredCrop, RecommendReq, CropOut, RecommendRes, RotationReq, RotationYearOptions
from .scoring import score_crops
from .rotation import compute_rotation_options
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


@app.post("/rotation", response_model=RotationYearOptions)
async def rotation(req: RotationReq):
    """Return 4-year crop rotation options derived from N/P/K and pH."""
    try:
        options = compute_rotation_options(N=req.N, P=req.P, K=req.K, ph=req.ph)
        return options
    except Exception as e:
        print(f"Error in rotation endpoint: {e}")
        return {f"Year{i}_options": [] for i in range(1, 5)}

