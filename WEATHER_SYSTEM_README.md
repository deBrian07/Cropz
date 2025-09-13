# Weather-Based Crop Recommendation System

This system allows users to input their city location and get crop recommendations based on historical weather data (temperature, humidity, rainfall) for the growing season (March-May).

## Features

- **Location Input**: Users can enter any city name
- **Weather Data Collection**: Automatically fetches historical weather data for March-May period
- **Soil Data Integration**: Combines weather data with soil conditions (N, P, K, pH)
- **AI-Powered Recommendations**: Uses machine learning to suggest optimal crops
- **Free API**: Uses Open-Meteo API (no API key required)

## Backend API Endpoints

### 1. Get Weather Data
```
POST /weather
{
  "city": "New York",
  "year": 2024
}
```

**Response:**
```json
{
  "temperature": 12.5,
  "humidity": 65.2,
  "rainfall": 245.8,
  "location": "New York",
  "period": "March-May 2024"
}
```

### 2. Get Crop Recommendations with Weather
```
POST /recommend-with-weather
{
  "city": "New York",
  "year": 2024,
  "N": 2.5,
  "P": 3.0,
  "K": 2.8,
  "ph": 6.5
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "name": "tomato",
      "ml_prob": 0.85,
      "percent": 85.0,
      "reasons": ["Optimal temperature range", "Good rainfall for growth"]
    }
  ]
}
```

## Frontend Components

### WeatherCropRecommendation Component
- Location input with city name and year selection
- Soil data input (N, P, K, pH levels)
- Weather data display
- Crop recommendations with explanations
- Error handling and loading states

### New Page: `/weather-recommendations`
- Complete user interface for weather-based recommendations
- Step-by-step process explanation
- Responsive design with Tailwind CSS

## Setup Instructions

### Backend Setup
1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Start the FastAPI server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Visit `http://localhost:3000/weather-recommendations`

## Testing

Run the weather API test:
```bash
cd backend
python test_weather.py
```

This will test the weather data collection for multiple cities.

## Weather Data Sources

The system uses **Open-Meteo API** which provides:
- Free access (no API key required)
- Historical weather data
- Global coverage
- Daily aggregated data for temperature, humidity, and precipitation

## Data Processing

1. **Location Resolution**: City name → coordinates using geocoding
2. **Date Range**: March 1 to May 31 (growing season)
3. **Data Aggregation**: 
   - Average temperature and humidity
   - Total rainfall accumulation
4. **ML Integration**: Weather data combined with soil parameters for crop recommendations

## Error Handling

- Invalid city names
- Network connectivity issues
- Missing weather data
- API rate limits
- Malformed responses

## Future Enhancements

- Support for different growing seasons by region
- Weather forecast integration
- Historical trend analysis
- Multiple weather data sources
- Crop-specific weather requirements
- Seasonal planting calendars
