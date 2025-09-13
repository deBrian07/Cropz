#!/usr/bin/env python3
"""
Test script for the ML crop recommendation API.
This tests the actual ML system running on the backend.
"""

import requests
import json

def test_ml_api():
    """Test the ML recommendation API."""
    print("🧪 Testing ML Crop Recommendation API")
    print("=" * 40)
    
    # API endpoint
    url = "http://localhost:8000/recommend"
    
    # Test data - different soil and climate conditions
    test_cases = [
        {
            "name": "Rice-friendly conditions",
            "data": {
                "N": 90, "P": 42, "K": 43,
                "temperature": 20.8, "humidity": 82.0, "ph": 6.5, "rainfall": 202.9
            }
        },
        {
            "name": "Wheat-friendly conditions", 
            "data": {
                "N": 80, "P": 50, "K": 40,
                "temperature": 15.0, "humidity": 70.0, "ph": 7.0, "rainfall": 150.0
            }
        },
        {
            "name": "Tropical conditions",
            "data": {
                "N": 100, "P": 60, "K": 50,
                "temperature": 28.0, "humidity": 85.0, "ph": 6.0, "rainfall": 300.0
            }
        },
        {
            "name": "jute type",
            "data": {
                "N": 90, "P": 55, "K": 41,
                "temperature": 25.0, "humidity": 80.0, "ph": 7.0, "rainfall": 180.0
            }
        },
        {
            "name": "cottontype",
            "data": {
                "N": 120, "P": 42, "K": 20,
                "temperature": 24.0, "humidity": 80.0, "ph": 7.0, "rainfall": 85.0
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🔍 Test {i}: {test_case['name']}")
        print("-" * 30)
        
        try:
            # Send request to API
            response = requests.post(url, json=test_case['data'], timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                recommendations = result.get('recommendations', [])
                
                if recommendations:
                    print(f"✅ Success! Got {len(recommendations)} recommendations:")
                    for j, rec in enumerate(recommendations[:3], 1):  # Show top 3
                        print(f"  {j}. {rec['name']} ({rec['percent']:.1f}%)")
                        if rec.get('reasons'):
                            print(f"     Reasons: {', '.join(rec['reasons'])}")
                else:
                    print("❌ No recommendations returned")
            else:
                print(f"❌ API Error: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ Connection Error: Backend not running")
            print("   Make sure to start: uvicorn backend.app.main:app --reload")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n🎯 Test completed!")

if __name__ == "__main__":
    test_ml_api()
