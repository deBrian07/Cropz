from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode
from urllib.request import urlopen


OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"


@dataclass
class WeatherFeatures:
    temperature: float
    humidity: float
    rainfall: float


def _safe_get(dct: dict, *keys, default=None):
    cur = dct
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur


def get_weather_features(latitude: float, longitude: float, timeout: int = 6) -> WeatherFeatures:
    """Fetch temperature (C), relative humidity (%), and recent rainfall (mm) for a location.

    Uses Open-Meteo public API (no API key). Rainfall is taken from the most recent
    available daily precipitation_sum; falls back to current precipitation if needed.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation",
        "daily": "precipitation_sum",
        "past_days": 1,
        "forecast_days": 1,
    }
    url = f"{OPEN_METEO_BASE}?{urlencode(params)}"

    try:
        with urlopen(url, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        # Conservative defaults if API fails
        return WeatherFeatures(temperature=20.0, humidity=60.0, rainfall=0.0)

    current = data.get("current", {})
    daily_vals = _safe_get(data, "daily", "precipitation_sum", default=[]) or []

    temperature = float(_safe_get(current, "temperature_2m", default=20.0))
    humidity = float(
        _safe_get(current, "relative_humidity_2m", default=_safe_get(current, "relativehumidity_2m", default=60.0))
    )
    rainfall: float
    if isinstance(daily_vals, list) and len(daily_vals) > 0:
        try:
            rainfall = float(daily_vals[-1])
        except Exception:
            rainfall = 0.0
    else:
        rainfall = float(_safe_get(current, "precipitation", default=0.0))

    return WeatherFeatures(temperature=temperature, humidity=humidity, rainfall=rainfall)


