#!/usr/bin/env python3
"""
Enhanced Interactive Weather API Test
Handles city disambiguation and current dates
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from app.weather import get_weather_data_from_coordinates
import requests


def get_year_input() -> int:
    """Get year input from user with smart defaults"""
    current_year = datetime.now().year
    # Use 2024 as default since that's the latest available data
    default_year = 2024
    
    year_input = input(f"Enter year (2020-2024, default {default_year}): ").strip()
    
    if not year_input:
        return default_year
    
    try:
        year = int(year_input)
        if year < 2020 or year > 2024:
            print(f"⚠️  Year must be between 2020-2024, using {default_year} instead.")
            return default_year
        return year
    except ValueError:
        print(f"⚠️  Invalid year, using {default_year} instead.")
        return default_year

def interactive_weather_test():
    """Enhanced interactive weather testing with latitude/longitude input"""
    current_year = datetime.now().year
    
    print("🌤️  Enhanced Interactive Weather API Test")
    print("=" * 60)
    print("This will test the weather data collection using coordinates.")
    print(f"The system fetches temperature, humidity, and rainfall for March-May.")
    print(f"Current year: {current_year}")
    print("Type 'quit' or 'exit' to stop.\n")
    
    while True:
        try:
            # Get coordinates input from user
            print("Enter coordinates (or 'quit' to exit):")
            print("💡 Tip: Use negative longitude for Americas, positive for Europe/Asia")
            lat_input = input("Latitude (-90 to 90): ").strip()
            
            if lat_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not lat_input:
                print("❌ Please enter a valid latitude.")
                continue
            
            try:
                lat = float(lat_input)
                if lat < -90 or lat > 90:
                    print("❌ Latitude must be between -90 and 90.")
                    continue
            except ValueError:
                print("❌ Please enter a valid number for latitude.")
                continue
            
            lon_input = input("Longitude (-180 to 180): ").strip()
            if not lon_input:
                print("❌ Please enter a valid longitude.")
                continue
            
            try:
                lon = float(lon_input)
                if lon < -180 or lon > 180:
                    print("❌ Longitude must be between -180 and 180.")
                    continue
            except ValueError:
                print("❌ Please enter a valid number for longitude.")
                continue
            
            # Get year input
            year = get_year_input()
            
            # Create location display
            location_display = f"Coordinates ({lat:.4f}, {lon:.4f})"
            
            print(f"\n🌤️  Fetching weather data for {location_display} ({year})...")
            
            # Get weather data using coordinates directly
            weather_data = get_weather_data_from_coordinates(lat, lon, location_display, year)
            
            # Display results
            print(f"\n✅ Success! Weather data for {weather_data.location}")
            print("-" * 50)
            print(f"📍 Coordinates: {lat:.4f}, {lon:.4f}")
            print(f"📅 Period: {weather_data.period}")
            print(f"🌡️  Average Temperature: {weather_data.temperature}°C")
            print(f"💧 Average Humidity: {weather_data.humidity}%")
            print(f"🌧️  Total Rainfall: {weather_data.rainfall}mm")
            
            # Show some interpretation
            print(f"\n📊 Weather Analysis:")
            if weather_data.temperature < 10:
                temp_desc = "Cool (good for cold-weather crops like lettuce, spinach)"
            elif weather_data.temperature < 20:
                temp_desc = "Moderate (good for most crops like tomatoes, peppers)"
            elif weather_data.temperature < 30:
                temp_desc = "Warm (good for summer crops like corn, beans)"
            else:
                temp_desc = "Hot (good for heat-loving crops like okra, sweet potatoes)"
            
            if weather_data.humidity < 50:
                humidity_desc = "Dry (may need irrigation, good for drought-resistant crops)"
            elif weather_data.humidity < 70:
                humidity_desc = "Moderate humidity (good for most crops)"
            else:
                humidity_desc = "Humid (good for moisture-loving crops like rice, celery)"
            
            if weather_data.rainfall < 100:
                rainfall_desc = "Low rainfall (drought-resistant crops recommended)"
            elif weather_data.rainfall < 300:
                rainfall_desc = "Moderate rainfall (good for most crops)"
            else:
                rainfall_desc = "High rainfall (good for water-loving crops)"
            
            print(f"   • Temperature: {temp_desc}")
            print(f"   • Humidity: {humidity_desc}")
            print(f"   • Rainfall: {rainfall_desc}")
            
            # Show crop recommendations based on weather
            print(f"\n🌱 Suggested Crop Types:")
            suggestions = []
            if weather_data.temperature < 15:
                suggestions.append("Cool-season vegetables (lettuce, spinach, broccoli)")
            if 15 <= weather_data.temperature <= 25:
                suggestions.append("Warm-season vegetables (tomatoes, peppers, cucumbers)")
            if weather_data.temperature > 25:
                suggestions.append("Heat-loving crops (corn, beans, okra)")
            
            if weather_data.rainfall > 200:
                suggestions.append("Water-loving crops (rice, celery, watercress)")
            elif weather_data.rainfall < 150:
                suggestions.append("Drought-resistant crops (succulents, herbs, root vegetables)")
            
            for suggestion in suggestions:
                print(f"   • {suggestion}")
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")
            print("💡 Check your internet connection or try different coordinates.")
        
        print("\n" + "=" * 60 + "\n")

def test_coordinates():
    """Test with known coordinates for major cities"""
    test_locations = [
        ("New York", 40.7128, -74.0060),
        ("London", 51.5074, -0.1278),
        ("Tokyo", 35.6762, 139.6503),
        ("Mumbai", 19.0760, 72.8777),
        ("Sydney", -33.8688, 151.2093),
        ("Paris", 48.8566, 2.3522),
        ("Berlin", 52.5200, 13.4050),
        ("Rome", 41.9028, 12.4964),
        ("Madrid", 40.4168, -3.7038),
        ("Amsterdam", 52.3676, 4.9041),
    ]
    
    print("🌍 Testing with known coordinates...")
    print("=" * 60)
    
    for city_name, lat, lon in test_locations:
        try:
            print(f"\n🔍 Testing {city_name} ({lat:.4f}, {lon:.4f})...")
            location_display = f"{city_name} ({lat:.4f}, {lon:.4f})"
            
            weather_data = get_weather_data_from_coordinates(lat, lon, location_display, 2024)
            
            print(f"✅ {city_name}: {weather_data.temperature}°C, {weather_data.humidity}% humidity, {weather_data.rainfall}mm rain")
            
        except Exception as e:
            print(f"❌ {city_name}: {str(e)}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    print("Choose testing mode:")
    print("1. Interactive mode (enter your own coordinates)")
    print("2. Test known coordinates (major cities)")
    print("3. Both")
    
    choice = input("\nEnter choice (1, 2, or 3): ").strip()
    
    if choice == "1":
        interactive_weather_test()
    elif choice == "2":
        test_coordinates()
    elif choice == "3":
        test_coordinates()
        print("\n" + "=" * 60)
        interactive_weather_test()
    else:
        print("Invalid choice. Starting interactive mode...")
        interactive_weather_test()
