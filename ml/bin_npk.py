#!/usr/bin/env python3
"""
Create categorical versions of N, P, and K from data/Crop_recommendation.csv.

Adds three new columns: N_cat, P_cat, K_cat with labels N0..N4, P0..P4, K0..K4
using quantile-based binning (equal-frequency). Falls back to equal-width bins
if quantiles collapse due to duplicate values.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Tuple

import numpy as np
import pandas as pd


def bin_into_k(series: pd.Series, k: int, prefix: str) -> Tuple[pd.Series, np.ndarray]:
    """Bin a numeric series into k categories with labels like f"{prefix}0"..f"{prefix}{k-1}".

    Uses quantile-based bins first. If fewer than k unique bins are produced
    (e.g., many duplicate values), falls back to equal-width bins.
    Returns the labeled categorical series (as strings) and the bin edges used.
    """
    s = pd.to_numeric(series, errors="coerce")
    s = s.fillna(s.median())

    # Try quantile bins
    try:
        _, q_edges = pd.qcut(s, q=k, retbins=True, duplicates="drop")
        num_bins = len(q_edges) - 1
    except ValueError:
        # Happens if k > number of unique values
        q_edges = None
        num_bins = 0

    if num_bins < k:
        # Fallback to equal-width bins
        edges = np.linspace(float(s.min()), float(s.max()), k + 1)
    else:
        edges = q_edges

    labels = [f"{prefix}{i}" for i in range(len(edges) - 1)]
    cat = pd.cut(s, bins=edges, labels=labels, include_lowest=True)
    return cat.astype(str), np.asarray(edges)


def main():
    parser = argparse.ArgumentParser(description="Bin N, P, K into 5 categories.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/Crop_recommendation.csv"),
        help="Path to input CSV",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/Crop_recommendation_binned.csv"),
        help="Path to output CSV (augmented with *_cat columns)",
    )
    parser.add_argument(
        "--bins",
        type=int,
        default=5,
        help="Number of categories per feature",
    )
    args = parser.parse_args()

    if not args.input.exists():
        raise FileNotFoundError(f"Input CSV not found: {args.input}")

    df = pd.read_csv(args.input)

    for col, prefix in [("N", "N"), ("P", "P"), ("K", "K")]:
        if col not in df.columns:
            raise KeyError(f"Column '{col}' not found in {args.input}")
        cat, edges = bin_into_k(df[col], args.bins, prefix)
        df[f"{col}_cat"] = cat
        print(f"{col} bin edges ({len(edges)-1} bins): {np.round(edges, 3)}")

    # Ensure output directory exists
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)
    print(f"\n✅ Wrote augmented dataset with categorical columns to: {args.output}")


if __name__ == "__main__":
    main()


