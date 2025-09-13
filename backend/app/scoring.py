from .schemas import SoilInput, ScoredCrop


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


def score_crops(payload: SoilInput) -> list[ScoredCrop]:
    results: list[ScoredCrop] = []
    for group, crops in ROTATION_GROUPS.items():
        group_score = _heuristic_match_score(payload, group)
        for crop in crops:
            results.append(
                ScoredCrop(crop=crop.title(), match_pct=group_score, rotation_group=group)
            )
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
    results: list[ScoredCrop] = []
    for crop in crops:
        group = infer_rotation_group(crop)
        s = _heuristic_match_score(payload, group)
        results.append(
            ScoredCrop(crop=crop.title(), match_pct=s, rotation_group=group)
        )
    results.sort(key=lambda c: c.match_pct, reverse=True)
    return results


