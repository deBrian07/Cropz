#!/usr/bin/env python3
"""
Simple backend smoke test for Cropz.

Endpoints covered:
- GET /health
- POST /rotation (with 5-bin NPK + 3-cat pH)
- POST /rotation/score (no options → backend computes; then with options)
- POST /recommend/auto (5-bin NPK + 3-cat pH; dummy weather)
- POST /recommend (numeric features)

Run:
  python3 test_backend_api.py  # assumes backend at http://localhost:8000
"""

from __future__ import annotations

import json
import sys
from typing import Any, Dict

import requests


BASE_URL = "http://localhost:8000"
TIMEOUT = 10


def _print_header(title: str) -> None:
    print("\n" + title)
    print("=" * len(title))


def _try_post(path: str, payload: Dict[str, Any]) -> dict:
    url = f"{BASE_URL}{path}"
    try:
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the backend running? Try: uvicorn backend.app.main:app --reload")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error calling {path}: {e}")
        sys.exit(1)

    if resp.status_code != 200:
        print(f"❌ {path} -> HTTP {resp.status_code}")
        print(resp.text)
        sys.exit(1)
    try:
        return resp.json()
    except json.JSONDecodeError:
        print(f"❌ {path} returned non-JSON body:")
        print(resp.text)
        sys.exit(1)


def test_health() -> None:
    _print_header("Health")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        print(f"GET /health -> {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ /health failed: {e}")
        sys.exit(1)


def test_rotation() -> dict:
    _print_header("Rotation (categories)")
    payload = {
        "N": "N2",
        "P": "P3",
        "K": "K1",
        "pH_cat": "pH1",
    }
    data = _try_post("/rotation", payload)
    for year in ["Year1_options", "Year2_options", "Year3_options", "Year4_options"]:
        opts = data.get(year, [])
        print(f"{year}: {len(opts)} options → {', '.join(opts[:5])}{' ...' if len(opts) > 5 else ''}")
    return data


def test_rotation_score_no_opts() -> None:
    _print_header("Rotation Score (backend computes options)")
    soil = {
        "soil_type": "loam",
        "ph": 6.8,
        "nitrogen": 3,
        "phosphorus": 3,
        "potassium": 3,
        "has_tractor": False,
        "irrigation": True,
        "easy_maintenance_preference": 3,
    }
    payload = {"soil": soil}
    data = _try_post("/rotation/score", payload)
    for year in ["year1", "year2", "year3", "year4"]:
        items = data.get(year, [])
        top = ", ".join([f"{i['crop']} ({i['match_pct']}%)" for i in items[:5]])
        print(f"{year}: {len(items)} scored → {top}")


def test_rotation_score_with_opts(rot_opts: dict) -> None:
    _print_header("Rotation Score (provided options)")
    soil = {
        "soil_type": "loam",
        "ph": 6.5,
        "nitrogen": 2,
        "phosphorus": 4,
        "potassium": 2,
        "has_tractor": False,
        "irrigation": False,
        "easy_maintenance_preference": 3,
    }
    payload = {"soil": soil, "rotation": rot_opts}
    data = _try_post("/rotation/score", payload)
    for year in ["year1", "year2", "year3", "year4"]:
        items = data.get(year, [])
        top = ", ".join([f"{i['crop']} ({i['match_pct']}%)" for i in items[:5]])
        print(f"{year}: {len(items)} scored → {top}")


def test_recommend_auto() -> None:
    _print_header("Recommend (auto; categories + dummy weather)")
    payload = {
        "N": "N3",
        "P": "P2",
        "K": "K2",
        "pH_cat": "pH1",
    }
    data = _try_post("/recommend/auto", payload)
    recs = data.get("recommendations", [])
    if not recs:
        print("No recommendations (model may be unavailable).")
        return
    for i, r in enumerate(recs[:5], 1):
        print(f"{i}. {r['name']} ({r['percent']:.1f}%)")


def test_recommend_numeric() -> None:
    _print_header("Recommend (numeric features)")
    payload = {
        "N": 80,
        "P": 50,
        "K": 40,
        "temperature": 22.0,
        "humidity": 65.0,
        "ph": 6.7,
        "rainfall": 2.0,
    }
    data = _try_post("/recommend", payload)
    recs = data.get("recommendations", [])
    if not recs:
        print("No recommendations (model may be unavailable).")
        return
    for i, r in enumerate(recs[:5], 1):
        print(f"{i}. {r['name']} ({r['percent']:.1f}%)")


def main() -> None:
    test_health()
    rot = test_rotation()
    test_rotation_score_no_opts()
    test_rotation_score_with_opts(rot)
    test_recommend_auto()
    test_recommend_numeric()
    print("\n🎯 All tests completed.")


if __name__ == "__main__":
    main()


