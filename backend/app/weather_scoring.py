"""
Weather scoring system for crop recommendations
Calculates how well each crop matches the weather conditions for a location
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import statistics


class WeatherScorer:
    """Calculates weather compatibility scores for crops"""
    
    def __init__(self):
        self.crop_preferences = self._load_crop_preferences()
    
    def _load_crop_preferences(self) -> Dict:
        """Load crop weather preferences from the dataset"""
        data_path = Path(__file__).parent.parent.parent / "data" / "Crop_recommendation.csv"
        df = pd.read_csv(data_path)
        
        crop_preferences = {}
        
        for crop in df['label'].unique():
            crop_data = df[df['label'] == crop]
            
            # Calculate statistics for each weather variable
            temp_stats = {
                'min': crop_data['temperature'].min(),
                'max': crop_data['temperature'].max(),
                'mean': crop_data['temperature'].mean(),
                'std': crop_data['temperature'].std()
            }
            
            humidity_stats = {
                'min': crop_data['humidity'].min(),
                'max': crop_data['humidity'].max(),
                'mean': crop_data['humidity'].mean(),
                'std': crop_data['humidity'].std()
            }
            
            rainfall_stats = {
                'min': crop_data['rainfall'].min(),
                'max': crop_data['rainfall'].max(),
                'mean': crop_data['rainfall'].mean(),
                'std': crop_data['rainfall'].std()
            }
            
            crop_preferences[crop] = {
                'temperature': temp_stats,
                'humidity': humidity_stats,
                'rainfall': rainfall_stats
            }
        
        return crop_preferences
    
    def calculate_weather_score(self, crop: str, temperature: float, humidity: float, rainfall: float) -> Dict:
        """
        Calculate weather compatibility score for a crop
        
        Returns:
            Dict with score (0-100), breakdown, and reasons
        """
        if crop not in self.crop_preferences:
            return {
                'score': 0,
                'breakdown': {'temperature': 0, 'humidity': 0, 'rainfall': 0},
                'reasons': ['Unknown crop type']
            }
        
        crop_prefs = self.crop_preferences[crop]
        
        # Calculate individual scores for each weather variable
        temp_score = self._calculate_variable_score(
            temperature, 
            crop_prefs['temperature']
        )
        
        humidity_score = self._calculate_variable_score(
            humidity, 
            crop_prefs['humidity']
        )
        
        rainfall_score = self._calculate_variable_score(
            rainfall, 
            crop_prefs['rainfall']
        )
        
        # Calculate overall score (weighted average)
        overall_score = (temp_score['score'] * 0.4 + 
                        humidity_score['score'] * 0.3 + 
                        rainfall_score['score'] * 0.3)
        
        # Generate reasons
        reasons = []
        if temp_score['score'] >= 80:
            reasons.append(f"Temperature is ideal for {crop} ({temperature:.1f}°C)")
        elif temp_score['score'] >= 60:
            reasons.append(f"Temperature is good for {crop} ({temperature:.1f}°C)")
        elif temp_score['score'] >= 40:
            reasons.append(f"Temperature is acceptable for {crop} ({temperature:.1f}°C)")
        else:
            reasons.append(f"Temperature may be challenging for {crop} ({temperature:.1f}°C)")
        
        if humidity_score['score'] >= 80:
            reasons.append(f"Humidity is ideal for {crop} ({humidity:.1f}%)")
        elif humidity_score['score'] >= 60:
            reasons.append(f"Humidity is good for {crop} ({humidity:.1f}%)")
        elif humidity_score['score'] >= 40:
            reasons.append(f"Humidity is acceptable for {crop} ({humidity:.1f}%)")
        else:
            reasons.append(f"Humidity may be challenging for {crop} ({humidity:.1f}%)")
        
        if rainfall_score['score'] >= 80:
            reasons.append(f"Rainfall is ideal for {crop} ({rainfall:.1f}mm)")
        elif rainfall_score['score'] >= 60:
            reasons.append(f"Rainfall is good for {crop} ({rainfall:.1f}mm)")
        elif rainfall_score['score'] >= 40:
            reasons.append(f"Rainfall is acceptable for {crop} ({rainfall:.1f}mm)")
        else:
            reasons.append(f"Rainfall may be challenging for {crop} ({rainfall:.1f}mm)")
        
        return {
            'score': round(overall_score, 1),
            'breakdown': {
                'temperature': round(temp_score['score'], 1),
                'humidity': round(humidity_score['score'], 1),
                'rainfall': round(rainfall_score['score'], 1)
            },
            'reasons': reasons
        }
    
    def _calculate_variable_score(self, value: float, preferences: Dict) -> Dict:
        """
        Calculate score for a single weather variable
        
        Scoring system:
        - Optimal range (mean ± 1 std): 100 points
        - Acceptable range (min-max): 50-100 points (linear interpolation)
        - Outside acceptable range: 0-50 points (exponential decay)
        """
        mean = preferences['mean']
        std = preferences['std']
        min_val = preferences['min']
        max_val = preferences['max']
        
        # Define ranges
        optimal_min = mean - std
        optimal_max = mean + std
        
        # Calculate score
        if optimal_min <= value <= optimal_max:
            # In optimal range - perfect score
            score = 100
        elif min_val <= value <= max_val:
            # In acceptable range - interpolate between 50-100
            if value < optimal_min:
                # Between min and optimal_min
                ratio = (value - min_val) / (optimal_min - min_val)
                score = 50 + (ratio * 50)
            else:
                # Between optimal_max and max
                ratio = (value - optimal_max) / (max_val - optimal_max)
                score = 100 - (ratio * 50)
        else:
            # Outside acceptable range - exponential decay
            if value < min_val:
                distance = min_val - value
                range_size = max_val - min_val
                normalized_distance = distance / range_size
                score = 50 * np.exp(-normalized_distance * 3)  # Exponential decay
            else:
                distance = value - max_val
                range_size = max_val - min_val
                normalized_distance = distance / range_size
                score = 50 * np.exp(-normalized_distance * 3)  # Exponential decay
        
        return {'score': max(0, min(100, score))}
    
    def get_all_crop_scores(self, temperature: float, humidity: float, rainfall: float) -> List[Dict]:
        """
        Get weather scores for all crops
        
        Returns:
            List of dicts with crop name, score, and reasons, sorted by score
        """
        scores = []
        
        for crop in self.crop_preferences.keys():
            score_data = self.calculate_weather_score(crop, temperature, humidity, rainfall)
            scores.append({
                'crop': crop,
                'weather_score': score_data['score'],
                'breakdown': score_data['breakdown'],
                'reasons': score_data['reasons']
            })
        
        # Sort by weather score (descending)
        scores.sort(key=lambda x: x['weather_score'], reverse=True)
        
        return scores


def get_weather_scores_for_crops(temperature: float, humidity: float, rainfall: float) -> List[Dict]:
    """
    Convenience function to get weather scores for all crops
    """
    scorer = WeatherScorer()
    return scorer.get_all_crop_scores(temperature, humidity, rainfall)
