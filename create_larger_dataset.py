#!/usr/bin/env python3
"""
Create a larger, more realistic crop recommendation dataset
based on the Kaggle dataset structure.
"""

import pandas as pd
import numpy as np
from pathlib import Path

def create_larger_dataset():
    """Create a larger dataset with more realistic data."""
    
    # Crop types from the original Kaggle dataset
    crops = [
        'rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas',
        'mothbeans', 'mungbean', 'blackgram', 'lentil', 'pomegranate',
        'banana', 'mango', 'grapes', 'watermelon', 'muskmelon',
        'apple', 'orange', 'papaya', 'coconut', 'cotton', 'jute', 'coffee'
    ]
    
    # Realistic ranges for each crop (based on agricultural knowledge)
    crop_ranges = {
        'rice': {'N': (70, 120), 'P': (30, 60), 'K': (30, 60), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (5.5, 7.5), 'rainfall': (150, 300)},
        'maize': {'N': (80, 120), 'P': (40, 70), 'K': (40, 70), 'temp': (18, 30), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'wheat': {'N': (60, 100), 'P': (30, 60), 'K': (30, 60), 'temp': (10, 25), 'humidity': (50, 70), 'ph': (6.0, 8.0), 'rainfall': (50, 150)},
        'cotton': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 8.0), 'rainfall': (100, 200)},
        'sugarcane': {'N': (80, 120), 'P': (40, 70), 'K': (50, 80), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (6.0, 7.5), 'rainfall': (150, 300)},
        'potato': {'N': (60, 100), 'P': (40, 70), 'K': (50, 80), 'temp': (10, 25), 'humidity': (60, 80), 'ph': (5.0, 7.0), 'rainfall': (100, 200)},
        'tomato': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (15, 30), 'humidity': (60, 80), 'ph': (6.0, 7.0), 'rainfall': (100, 250)},
        'onion': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (10, 25), 'humidity': (50, 70), 'ph': (6.0, 7.5), 'rainfall': (50, 150)},
        'chili': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'brinjal': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'cabbage': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (10, 25), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'cauliflower': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (10, 25), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'okra': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'cucumber': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (6.0, 7.0), 'rainfall': (100, 250)},
        'pumpkin': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'carrot': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (10, 25), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'radish': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (10, 25), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'spinach': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (10, 25), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'lettuce': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (10, 25), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'beans': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (15, 30), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'peas': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (10, 25), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'lentil': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (15, 30), 'humidity': (50, 70), 'ph': (6.0, 7.5), 'rainfall': (50, 150)},
        'chickpea': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (15, 30), 'humidity': (50, 70), 'ph': (6.0, 7.5), 'rainfall': (50, 150)},
        'mungbean': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'blackgram': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'pigeonpeas': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'kidneybeans': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (15, 30), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'mothbeans': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (20, 35), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'jute': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (6.0, 7.5), 'rainfall': (150, 300)},
        'coffee': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (15, 30), 'humidity': (70, 90), 'ph': (5.5, 7.0), 'rainfall': (150, 300)},
        'coconut': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (5.5, 7.5), 'rainfall': (150, 300)},
        'papaya': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (6.0, 7.5), 'rainfall': (150, 300)},
        'orange': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (15, 30), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'apple': {'N': (60, 100), 'P': (30, 60), 'K': (40, 70), 'temp': (5, 20), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 200)},
        'grapes': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (15, 30), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'mango': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (6.0, 7.5), 'rainfall': (150, 300)},
        'banana': {'N': (70, 110), 'P': (40, 70), 'K': (50, 80), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (6.0, 7.5), 'rainfall': (150, 300)},
        'pomegranate': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (15, 30), 'humidity': (60, 80), 'ph': (6.0, 7.5), 'rainfall': (100, 250)},
        'watermelon': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (6.0, 7.5), 'rainfall': (150, 300)},
        'muskmelon': {'N': (70, 110), 'P': (40, 70), 'K': (40, 70), 'temp': (20, 35), 'humidity': (70, 90), 'ph': (6.0, 7.5), 'rainfall': (150, 300)}
    ]
    
    # Generate data
    data = []
    np.random.seed(42)  # For reproducibility
    
    # Generate 100 samples per crop
    samples_per_crop = 100
    
    for crop in crops:
        if crop in crop_ranges:
            ranges = crop_ranges[crop]
            for _ in range(samples_per_crop):
                # Generate data within realistic ranges for each crop
                N = np.random.uniform(ranges['N'][0], ranges['N'][1])
                P = np.random.uniform(ranges['P'][0], ranges['P'][1])
                K = np.random.uniform(ranges['K'][0], ranges['K'][1])
                temperature = np.random.uniform(ranges['temp'][0], ranges['temp'][1])
                humidity = np.random.uniform(ranges['humidity'][0], ranges['humidity'][1])
                ph = np.random.uniform(ranges['ph'][0], ranges['ph'][1])
                rainfall = np.random.uniform(ranges['rainfall'][0], ranges['rainfall'][1])
                
                data.append({
                    'N': round(N, 1),
                    'P': round(P, 1),
                    'K': round(K, 1),
                    'temperature': round(temperature, 1),
                    'humidity': round(humidity, 1),
                    'ph': round(ph, 2),
                    'rainfall': round(rainfall, 1),
                    'label': crop
                })
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Shuffle the data
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Save to CSV
    output_path = Path("data/Crop_recommendation.csv")
    df.to_csv(output_path, index=False)
    
    print(f"✅ Created larger dataset with {len(df)} samples")
    print(f"📁 Saved to: {output_path}")
    print(f"🌱 Crops included: {len(df['label'].unique())}")
    print(f"📊 Samples per crop: {samples_per_crop}")
    
    return df

if __name__ == "__main__":
    create_larger_dataset()
