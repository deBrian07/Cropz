# 🌱 Cropz ML System Setup

This guide will help you set up the complete ML-powered crop recommendation system.

## Prerequisites

1. **Python 3.8+** installed and working
2. **Node.js** installed (for the frontend)
3. **pip** package manager

## Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
python setup_ml.py
```

### Option 2: Manual Setup

1. **Install Python dependencies:**
   ```bash
   pip install pandas scikit-learn joblib numpy fastapi uvicorn python-dotenv
   ```

2. **Train the ML model:**
   ```bash
   python ml/train_crop_model.py
   ```

3. **Test the ML system:**
   ```bash
   python -c "
   from ml.inference import get_crop_recommendations_with_reasons
   test_data = {'N': 90, 'P': 42, 'K': 43, 'temperature': 20.8, 'humidity': 82.0, 'ph': 6.5, 'rainfall': 202.9}
   results = get_crop_recommendations_with_reasons(test_data, k=3)
   print('Top recommendation:', results[0]['crop'], results[0]['percent'], '%')
   "
   ```

## Running the Complete System

### 1. Start the Backend (ML API)

```bash
cd backend
uvicorn app.main:app --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive docs**: http://localhost:8000/docs

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:
- **Website**: http://localhost:3000

## Testing the ML System

### Test the ML API directly:

```bash
curl -X POST "http://localhost:8000/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "N": 90,
    "P": 42,
    "K": 43,
    "temperature": 20.8,
    "humidity": 82.0,
    "ph": 6.5,
    "rainfall": 202.9
  }'
```

### Expected Response:

```json
{
  "recommendations": [
    {
      "name": "rice",
      "ml_prob": 0.85,
      "percent": 45.2,
      "reasons": [
        "pH 6.5 near typical 6.5",
        "Soil N adequate",
        "Rainfall close to crop norm"
      ]
    }
  ]
}
```

## What the ML System Does

1. **Trains a Random Forest model** on crop recommendation data
2. **Provides top-K crop recommendations** with probabilities
3. **Generates human-readable explanations** for why crops fit
4. **Integrates with your FastAPI backend** via `/recommend` endpoint

## File Structure

```
Cropz/
├── ml/
│   ├── train_crop_model.py    # Model training script
│   └── inference.py           # ML inference functions
├── models/
│   └── crop_rf.joblib         # Trained model (created after training)
├── data/
│   └── Crop_recommendation.csv # Training dataset
├── backend/ls

│   └── app/
│       ├── main.py            # FastAPI app with ML integration
│       └── schemas.py         # Pydantic models
└── frontend/                  # Next.js frontend
```

## Troubleshooting

### Python not found
- Install Python from https://python.org
- Make sure to check "Add to PATH" during installation
- Restart your terminal after installation

### pip not found
- Try: `python -m pip install ...`
- Or: `py -m pip install ...`

### ML model fails to load
- Make sure you've run `python ml/train_crop_model.py` first
- Check that `models/crop_rf.joblib` exists

### Import errors
- Make sure you're in the project root directory
- Install all dependencies: `pip install -r backend/requirements.txt`

## Next Steps

1. **Replace sample data** with the real Kaggle dataset
2. **Add more features** like profit calculations
3. **Improve the UI** to display ML recommendations
4. **Add model retraining** capabilities
5. **Deploy to production** (AWS, Heroku, etc.)

## API Endpoints

- `GET /health` - Health check
- `POST /score` - Original scoring system
- `POST /recommend` - **NEW** ML-powered recommendations

The `/recommend` endpoint accepts:
- `N`, `P`, `K` (soil nutrients)
- `temperature`, `humidity`, `ph`, `rainfall` (climate data)

And returns crop recommendations with probabilities and explanations!

