from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd


ROTATION_CSV = Path("data/crop_rotation.csv")


@dataclass(frozen=True)
class RotationBands:
    nitrogen: str
    phosphorus: str
    potassium: str
    ph_band: str


def _read_rotation_table() -> pd.DataFrame:
    if not ROTATION_CSV.exists():
        raise FileNotFoundError(f"Rotation CSV not found at {ROTATION_CSV}")
    df = pd.read_csv(ROTATION_CSV)
    # Normalize column names just in case
    expected_cols = [
        "N",
        "P",
        "K",
        "pH_band",
        "Year1_options",
        "Year2_options",
        "Year3_options",
        "Year4_options",
    ]
    missing = [c for c in expected_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in rotation CSV: {missing}")
    return df


def _bin_numeric_to_5(value: float, edges: Tuple[float, float, float, float, float, float]) -> int:
    a, b, c, d, e, f = edges
    # Include right edge on last bin
    if value < b:
        return 0
    if value < c:
        return 1
    if value < d:
        return 2
    if value < e:
        return 3
    return 4


def _five_bin_to_lmh(bin_idx: int) -> str:
    # Map 0..4 to Low/Medium/High buckets: 0-1 Low, 2 Medium, 3-4 High
    if bin_idx <= 1:
        return "Low"
    if bin_idx == 2:
        return "Medium"
    return "High"


def _ph_to_band(ph: float) -> str:
    # Follows the CSV bands
    if 5.0 <= ph <= 5.9:
        return "Acidic (5.0–5.9)"
    if 6.0 <= ph <= 7.3:
        return "Neutral (6.0–7.3)"
    if 7.4 <= ph <= 8.5:
        return "Alkaline (7.4–8.5)"
    # Fall back to nearest named band
    if ph < 5.0:
        return "Acidic (5.0–5.9)"
    return "Alkaline (7.4–8.5)"


def _get_default_edges(df_source: pd.DataFrame, col: str) -> Tuple[float, float, float, float, float, float]:
    # Compute quantile edges from the original recommendation dataset if available
    try:
        cr_path = Path("data/Crop_recommendation.csv")
        if cr_path.exists():
            raw = pd.read_csv(cr_path)
            s = pd.to_numeric(raw[col], errors="coerce").dropna()
            q = s.quantile([0, 0.2, 0.4, 0.6, 0.8, 1.0]).values
            return tuple(float(x) for x in q)  # type: ignore
    except Exception:
        pass

    # Fallback: equal width from observed min/max in rotation space if present
    # rotation CSV stores categorical L/M/H, so we approximate typical agronomic ranges
    # Choose wide defaults compatible with Kaggle dataset ranges
    if col == "N":
        return (0.0, 20.0, 40.0, 60.0, 90.0, 150.0)
    if col == "P":
        return (0.0, 20.0, 35.0, 50.0, 70.0, 150.0)
    if col == "K":
        return (0.0, 15.0, 25.0, 40.0, 55.0, 210.0)
    return (0.0, 1.0, 2.0, 3.0, 4.0, 5.0)


def compute_rotation_options(
    N: float,
    P: float,
    K: float,
    ph: float,
) -> Dict[str, List[str]]:
    """
    Map numeric N/P/K to 5-bin categories, compress to Low/Medium/High, combine with pH band,
    and look up corresponding rotation options for 4 years.
    """
    df = _read_rotation_table()

    n_edges = _get_default_edges(df, "N")
    p_edges = _get_default_edges(df, "P")
    k_edges = _get_default_edges(df, "K")

    n_bin = _bin_numeric_to_5(N, n_edges)
    p_bin = _bin_numeric_to_5(P, p_edges)
    k_bin = _bin_numeric_to_5(K, k_edges)

    n_band = _five_bin_to_lmh(n_bin)
    p_band = _five_bin_to_lmh(p_bin)
    k_band = _five_bin_to_lmh(k_bin)
    ph_band = _ph_to_band(ph)

    row = df[(df["N"] == n_band) & (df["P"] == p_band) & (df["K"] == k_band) & (df["pH_band"] == ph_band)]
    if row.empty:
        # If no exact match, try relaxing pH_band first, then others if needed
        row = df[(df["N"] == n_band) & (df["P"] == p_band) & (df["K"] == k_band)]
        if row.empty:
            # As a last resort, return empty lists
            return {f"Year{i}_options": [] for i in range(1, 5)}

    # Take the first matching row
    r = row.iloc[0]
    def split_options(val: str) -> List[str]:
        if not isinstance(val, str):
            return []
        return [x.strip() for x in val.split("|")]

    return {
        "Year1_options": split_options(r["Year1_options"]),
        "Year2_options": split_options(r["Year2_options"]),
        "Year3_options": split_options(r["Year3_options"]),
        "Year4_options": split_options(r["Year4_options"]),
    }


def compute_rotation_options_from_categories(
    N_band: str,
    P_band: str,
    K_band: str,
    ph_band: str,
) -> Dict[str, List[str]]:
    """Directly lookup rotation options using categorical bands matching the CSV."""
    df = _read_rotation_table()
    row = df[(df["N"] == N_band) & (df["P"] == P_band) & (df["K"] == K_band) & (df["pH_band"] == ph_band)]
    if row.empty:
        return {f"Year{i}_options": [] for i in range(1, 5)}

    r = row.iloc[0]

    def split_options(val: str) -> List[str]:
        if not isinstance(val, str):
            return []
        return [x.strip() for x in val.split("|")]

    return {
        "Year1_options": split_options(r["Year1_options"]),
        "Year2_options": split_options(r["Year2_options"]),
        "Year3_options": split_options(r["Year3_options"]),
        "Year4_options": split_options(r["Year4_options"]),
    }


def category_to_level(cat: str) -> int:
    """Map Low/Medium/High to 0-5 relative scale used by SoilInput."""
    c = (cat or "").strip().lower()
    if c == "low":
        return 1
    if c == "medium":
        return 3
    if c == "high":
        return 5
    return 3


def ph_band_to_value(ph_band: str) -> float:
    """Return a representative numeric pH for a band label from the CSV."""
    s = (ph_band or "").strip().lower()
    if s.startswith("acidic"):
        return 5.5
    if s.startswith("neutral"):
        return 6.7
    if s.startswith("alkaline"):
        return 7.8
    return 6.7

# --- New helpers for 5-bin labels and pH 3-cat labels ---

def _label_to_index(label: str) -> int:
    try:
        idx = int(str(label).strip()[-1])
    except Exception:
        idx = 2
    if idx < 0:
        idx = 0
    if idx > 4:
        idx = 4
    return idx


def five_label_to_lmh(label: str) -> str:
    return _five_bin_to_lmh(_label_to_index(label))


def representative_value_from_five_label(col: str, label: str) -> float:
    df = _read_rotation_table()
    edges = _get_default_edges(df, col)
    i = _label_to_index(label)
    i = max(0, min(4, i))
    left = float(edges[i])
    right = float(edges[i + 1])
    return (left + right) / 2.0


def ph_cat_to_band(cat: str) -> str:
    i = _label_to_index(cat)
    if i <= 0:
        return "Acidic (5.0–5.9)"
    if i == 1:
        return "Neutral (6.0–7.3)"
    return "Alkaline (7.4–8.5)"


def ph_cat_to_value(cat: str) -> float:
    band = ph_cat_to_band(cat)
    return ph_band_to_value(band)


