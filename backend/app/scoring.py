from .schemas import SoilInput, ScoredCrop
from .weather import get_weather_features, WeatherFeatures


ROTATION_GROUPS: dict[str, list[str]] = {
    "legumes": [
        "green beans",
        "soy beans",
        "fava beans",
        "chickpeas",
        "peas",
        "lupin",
        "alfalfa",
        "peanuts",
    ],
    "root_veggies": [
        "carrot",
        "radish",
        "onion",
        "garlic",
        "leeks",
        "parsnip",
        "turnip",
        "beet",
    ],
    "greens_brassicas": [
        "lettuce",
        "spinach",
        "cabbage",
        "brussels sprouts",
        "bok choy",
        "kale",
        "broccoli",
        "cauliflower",
        "herbs",
        "collards",
    ],
    "fruiting": [
        "tomato",
        "squash",
        "melons",
        "peppers",
        "corn",
        "eggplant",
        "cucumber",
        "potatoes",
    ],
}


def _heuristic_match_score(payload: SoilInput, rotation_group: str) -> int:
    score = 50

    # Nitrogen hungry crops: greens/brassicas benefit from higher nitrogen
    if rotation_group == "greens_brassicas":
        score += (payload.nitrogen - 2) * 8

    # Root veggies like lower nitrogen
    if rotation_group == "root_veggies":
        score += (2 - payload.nitrogen) * 6

    # Fruiting need phosphorus and some nitrogen
    if rotation_group == "fruiting":
        score += (payload.phosphorus - 2) * 7 + (payload.nitrogen - 2) * 4

    # Legumes add nitrogen; prefer low nitrogen soils
    if rotation_group == "legumes":
        score += (2 - payload.nitrogen) * 5

    # pH mid-range is generally best
    score -= int(abs(payload.ph - 6.5) * 4)

    # Maintenance preference
    score += (payload.easy_maintenance_preference - 3) * 3

    return max(0, min(100, score))


def _weather_adjustment(features: WeatherFeatures, rotation_group: str) -> int:
    """Small bounded adjustment (-10..+10) based on simple climate fit by group.

    Light-touch so soil heuristics remain primary.
    """
    temp = features.temperature
    humidity = features.humidity
    rainfall = features.rainfall

    # Ideal temperature ranges by group (C)
    temp_ranges: dict[str, tuple[float, float]] = {
        "greens_brassicas": (10.0, 20.0),
        "root_veggies": (10.0, 22.0),
        "fruiting": (20.0, 30.0),
        "legumes": (15.0, 28.0),
    }
    lo, hi = temp_ranges.get(rotation_group, (12.0, 26.0))

    adj = 0
    # Temperature fit: within range +3, mild penalty outside, capped
    if temp < lo:
        adj -= min(6, int((lo - temp) * 0.5))
    elif temp > hi:
        adj -= min(6, int((temp - hi) * 0.5))
    else:
        adj += 3

    # Humidity comfort (broad window 40-80%)
    if 40.0 <= humidity <= 80.0:
        adj += 2
    else:
        adj -= 2

    # Rainfall: fruiting prefers some rain; roots dislike heavy waterlogging
    if rotation_group == "fruiting":
        if rainfall < 1.0:
            adj -= 2
        elif rainfall > 15.0:
            adj -= 2
        else:
            adj += 2
    elif rotation_group == "root_veggies":
        if rainfall > 15.0:
            adj -= 3
        elif rainfall < 1.0:
            adj -= 1
        else:
            adj += 1
    else:
        # Greens/legumes: slight bonus for moderate rainfall
        if 1.0 <= rainfall <= 15.0:
            adj += 1

    return max(-10, min(10, adj))


def _score_with_optional_weather(payload: SoilInput, rotation_group: str, features: WeatherFeatures | None) -> int:
    base = _heuristic_match_score(payload, rotation_group)
    if features is None:
        return base
    return max(0, min(100, base + _weather_adjustment(features, rotation_group)))


def score_crops(payload: SoilInput) -> list[ScoredCrop]:
    # Fetch weather once per request if coordinates provided; otherwise none
    features: WeatherFeatures | None = None
    try:
        if payload.latitude is not None and payload.longitude is not None:
            features = get_weather_features(payload.latitude, payload.longitude)
    except Exception:
        features = None

    results: list[ScoredCrop] = []
    for group, crops in ROTATION_GROUPS.items():
        group_score = _score_with_optional_weather(payload, group, features)
        for crop in crops:
            results.append(ScoredCrop(crop=crop.title(), match_pct=group_score, rotation_group=group))
    # highest first
    results.sort(key=lambda c: c.match_pct, reverse=True)
    return results


# --- Rotation crop mapping and targeted scoring ---

_LEGUMES = {
    "chickpea",
    "chickpeas",
    "kidneybeans",
    "pigeonpeas",
    "mothbeans",
    "mungbean",
    "blackgram",
    "lentil",
    "peas",
    "green beans",
    "soy beans",
    "fava beans",
    "lupin",
    "alfalfa",
    "peanuts",
}

_ROOT_VEG = {
    "carrot",
    "radish",
    "onion",
    "garlic",
    "leeks",
    "parsnip",
    "turnip",
    "beet",
}

_GREENS = {
    "lettuce",
    "spinach",
    "cabbage",
    "brussels sprouts",
    "bok choy",
    "kale",
    "broccoli",
    "cauliflower",
    "herbs",
    "collards",
}

_FRUITING = {
    "tomato",
    "squash",
    "melons",
    "peppers",
    "corn",
    "eggplant",
    "cucumber",
    "potatoes",
    # Common in rotation CSV
    "maize",
    "rice",
    "banana",
    "coconut",
    "grapes",
    "mango",
    "papaya",
    "orange",
    "apple",
    "pomegranate",
    "watermelon",
    "muskmelon",
    "cotton",
    "jute",
    "coffee",
}

def infer_rotation_group(crop: str) -> str:
    c = crop.strip().lower()
    if c in _LEGUMES:
        return "legumes"
    if c in _ROOT_VEG:
        return "root_veggies"
    if c in _GREENS:
        return "greens_brassicas"
    return "fruiting"


def score_specific_crops(payload: SoilInput, crops: list[str]) -> list[ScoredCrop]:
    # Same weather treatment for rotation scoring
    features: WeatherFeatures | None = None
    try:
        if payload.latitude is not None and payload.longitude is not None:
            features = get_weather_features(payload.latitude, payload.longitude)
    except Exception:
        features = None

    results: list[ScoredCrop] = []
    for crop in crops:
        group = infer_rotation_group(crop)
        s = _score_with_optional_weather(payload, group, features)
        results.append(ScoredCrop(crop=crop.title(), match_pct=s, rotation_group=group))
    results.sort(key=lambda c: c.match_pct, reverse=True)
    return results

