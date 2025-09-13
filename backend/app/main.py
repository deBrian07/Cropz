from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import SoilInput, ScoredCrop, RecommendReq, CropOut, RecommendRes, RotationReq, RotationYearOptions, RotationScoreReq, RotationScoreRes, RecommendAutoReq
from .scoring import score_crops, score_specific_crops
from .rotation import (
    compute_rotation_options_from_categories,
    five_label_to_lmh,
    ph_cat_to_band,
    representative_value_from_five_label,
    ph_cat_to_value,
)
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


@app.post("/recommend/auto", response_model=RecommendRes)
async def recommend_auto(req: RecommendAutoReq):
    """Like /recommend but uses 5-bin categories for N/P/K and 3-cat pH, with dummy weather."""
    if not ML_AVAILABLE:
        return {"recommendations": []}

    try:
        # Convert 5-bin categories to representative numeric values for trained model
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
                reasons=rec.get("reasons", [])
            ))

        return {"recommendations": cards}
    except Exception as e:
        print(f"Error in ML recommendation auto: {e}")
        return {"recommendations": []}

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
        return options
    except Exception as e:
        print(f"Error in rotation endpoint: {e}")
        return {f"Year{i}_options": [] for i in range(1, 5)}


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

        return {
            "year1": y1,
            "year2": y2,
            "year3": y3,
            "year4": y4,
        }
    except Exception as e:
        print(f"Error in rotation/score endpoint: {e}")
        empty: list[ScoredCrop] = []
        return {"year1": empty, "year2": empty, "year3": empty, "year4": empty}

