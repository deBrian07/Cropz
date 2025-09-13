import numpy as np
import joblib
from pathlib import Path
from math import isfinite

# Load model artifacts
def _load_model():
    """Load the ML model artifacts."""
    # Try different possible paths
    possible_paths = [
        Path("models/crop_rf.joblib"),  # From project root
        Path("../models/crop_rf.joblib"),  # From backend directory
        Path("../../models/crop_rf.joblib"),  # From deeper nested dirs
    ]
    
    for path in possible_paths:
        if path.exists():
            return joblib.load(path)
    
    raise FileNotFoundError("Could not find crop_rf.joblib model file. Please train the model first.")

# Load model artifacts
ART = _load_model()
MODEL, LE, FEATS, MEANS = ART["model"], ART["label_encoder"], ART["features"], ART["means"]

def topk_crops(payload: dict, k: int = 5):
    """
    Get top-K crop recommendations with probabilities.
    
    Args:
        payload: Dictionary with soil/climate data
        k: Number of top recommendations to return
        
    Returns:
        List of dictionaries with crop name, probability, and percentage
    """
    # Convert payload to feature array
    x = np.array([[payload[f] for f in FEATS]], dtype=float)
    
    # Get prediction probabilities
    p = MODEL.predict_proba(x)[0]
    
    # Get top-K indices
    idx = np.argsort(p)[::-1][:k]
    
    # Build results
    out = []
    for i in idx:
        out.append({
            "crop": LE.inverse_transform([i])[0],
            "prob": float(p[i])
        })
    
    # Normalize to 100% for pretty UI
    s = sum(o["prob"] for o in out) or 1.0
    for o in out:
        o["percent"] = round(100 * o["prob"] / s, 1)
    
    return out

def reasons_for(crop: str, payload: dict) -> list[str]:
    """
    Generate human-readable explanations for why a crop fits.
    
    Args:
        crop: Crop name
        payload: Soil/climate data
        
    Returns:
        List of explanation strings
    """
    m = MEANS.get(crop, {})
    bullets = []
    
    def near(x, mu, tol): 
        return isfinite(mu) and abs(x - mu) <= tol
    
    # pH check
    if near(payload["ph"], m.get("ph", 7.0), 0.4):
        bullets.append(f"pH {payload['ph']:.1f} near typical {m['ph']:.1f}")
    
    # Nitrogen check
    if payload["N"] >= m.get("N", 0):
        bullets.append("Soil N adequate")
    
    # Rainfall check
    if payload["rainfall"] >= m.get("rainfall", 0) * 0.9:
        bullets.append("Rainfall close to crop norm")
    
    # Temperature check
    if near(payload["temperature"], m.get("temperature", 20), 3):
        bullets.append(f"Temperature {payload['temperature']:.1f}°C suitable")
    
    # Humidity check
    if near(payload["humidity"], m.get("humidity", 50), 10):
        bullets.append(f"Humidity {payload['humidity']:.1f}% appropriate")
    
    return bullets[:3]  # Return top 3 reasons

def get_crop_recommendations_with_reasons(payload: dict, k: int = 5):
    """
    Get crop recommendations with explanations.
    
    Args:
        payload: Soil/climate data
        k: Number of recommendations
        
    Returns:
        List of dictionaries with crop data and reasons
    """
    recommendations = topk_crops(payload, k)
    
    # Add reasons for each recommendation
    for rec in recommendations:
        rec["reasons"] = reasons_for(rec["crop"], payload)
    
    return recommendations

