from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import SoilInput, ScoredCrop
from .scoring import score_crops

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


