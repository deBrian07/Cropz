import requests
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import statistics
from pydantic import BaseModel


class MultipleCitiesException(Exception):
    """Exception raised when multiple cities are found and disambiguation is needed"""
    def __init__(self, message: str, options: List[Dict]):
        super().__init__(message)
        self.options = options


class WeatherData(BaseModel):
    """Weather data model for crop recommendation"""
    temperature: float  # Average temperature in Celsius
    humidity: float     # Average humidity percentage
    rainfall: float     # Total rainfall in mm
    location: str       # City name
    period: str         # Date range (e.g., "March-May 2024")


class WeatherService:
    """Service to fetch weather data from OpenWeatherMap API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENWEATHER_API_KEY")
        if not self.api_key:
            raise ValueError("OpenWeatherMap API key is required. Set OPENWEATHER_API_KEY environment variable.")
        
        self.base_url = "http://api.openweathermap.org/data/2.5"
    
    def get_coordinates(self, city: str) -> Tuple[float, float]:
        """Get latitude and longitude for a city"""
        url = f"{self.base_url}/weather"
        params = {
            "q": city,
            "appid": self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            return data["coord"]["lat"], data["coord"]["lon"]
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get coordinates for {city}: {str(e)}")
        except KeyError:
            raise Exception(f"City '{city}' not found. Please check the spelling.")
    
    def get_historical_weather(self, lat: float, lon: float, start_date: str, end_date: str) -> List[Dict]:
        """Get historical weather data for a location and date range"""
        url = f"{self.base_url}/history/city"
        params = {
            "lat": lat,
            "lon": lon,
            "type": "hour",
            "start": start_date,
            "end": end_date,
            "appid": self.api_key,
            "units": "metric"
        }
        
        try:
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            return data.get("list", [])
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get historical weather data: {str(e)}")
    
    def get_weather_for_crop_season(self, city: str, year: int = 2024) -> WeatherData:
        """
        Get weather data for the crop growing season (March-May)
        Returns aggregated data suitable for crop recommendation
        """
        # Define the growing season period
        start_date = f"{year}-03-01"
        end_date = f"{year}-05-31"
        
        # Get coordinates for the city
        lat, lon = self.get_coordinates(city)
        
        # Get historical weather data
        weather_data = self.get_historical_weather(lat, lon, start_date, end_date)
        
        if not weather_data:
            raise Exception(f"No weather data available for {city} during {start_date} to {end_date}")
        
        # Process the data
        temperatures = []
        humidities = []
        rainfall_total = 0.0
        
        for entry in weather_data:
            # Temperature (convert from Kelvin to Celsius if needed)
            temp = entry["main"]["temp"]
            temperatures.append(temp)
            
            # Humidity
            humidity = entry["main"]["humidity"]
            humidities.append(humidity)
            
            # Rainfall (if available)
            if "rain" in entry and "1h" in entry["rain"]:
                rainfall_total += entry["rain"]["1h"]
        
        # Calculate averages and totals
        avg_temperature = statistics.mean(temperatures) if temperatures else 0
        avg_humidity = statistics.mean(humidities) if humidities else 0
        
        return WeatherData(
            temperature=round(avg_temperature, 2),
            humidity=round(avg_humidity, 2),
            rainfall=round(rainfall_total, 2),
            location=city,
            period=f"March-May {year}"
        )


def get_weather_data_for_city(city: str, year: int = 2024) -> WeatherData:
    """
    Convenience function to get weather data for a city
    This is the main function to use for crop recommendations
    """
    service = WeatherService()
    return service.get_weather_for_crop_season(city, year)


# Alternative implementation using a free weather API (Open-Meteo)
class OpenMeteoWeatherService:
    """Alternative weather service using Open-Meteo (completely free, no API key required)"""
    
    def __init__(self):
        self.base_url = "https://archive-api.open-meteo.com/v1/archive"
    
    def get_coordinates(self, city: str, state: str = None, country: str = None) -> Tuple[float, float]:
        """Get coordinates using Open-Meteo geocoding with optional state/country disambiguation"""
        geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
        
        # Build search query with state/country if provided
        search_query = city
        if state:
            search_query += f", {state}"
        if country:
            search_query += f", {country}"
        
        params = {
            "name": search_query,
            "count": 10,  # Get more results to allow disambiguation
            "language": "en",
            "format": "json"
        }
        
        try:
            response = requests.get(geocoding_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("results"):
                raise Exception(f"City '{city}' not found. Please check the spelling.")
            
            results = data["results"]
            
            # If only one result or state/country specified, use the first result
            if len(results) == 1 or state or country:
                result = results[0]
                return result["latitude"], result["longitude"]
            
            # Multiple results - raise exception with options for disambiguation
            options = []
            for i, result in enumerate(results[:5]):  # Limit to 5 options
                admin1 = result.get("admin1", "")
                country_name = result.get("country", "")
                display_name = f"{result['name']}"
                if admin1:
                    display_name += f", {admin1}"
                if country_name:
                    display_name += f", {country_name}"
                options.append({
                    "index": i,
                    "name": display_name,
                    "lat": result["latitude"],
                    "lon": result["longitude"],
                    "admin1": admin1,
                    "country": country_name
                })
            
            raise MultipleCitiesException(f"Multiple cities found for '{city}'. Please specify state/country or choose from options.", options)
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get coordinates for {city}: {str(e)}")
    
    def get_weather_for_crop_season(self, city: str, year: int = None, state: str = None, country: str = None) -> WeatherData:
        """Get weather data using Open-Meteo API"""
        # Use current year if not specified
        if year is None:
            year = datetime.now().year
        
        # Get coordinates with optional state/country
        try:
            lat, lon = self.get_coordinates(city, state, country)
        except MultipleCitiesException as e:
            # If we get multiple cities exception, re-raise it for the caller to handle
            raise e
        
        # Define date range
        start_date = f"{year}-03-01"
        end_date = f"{year}-05-31"
        
        # Check if we're requesting current year and if we're past the growing season
        current_date = datetime.now()
        current_year = current_date.year
        
        # Open-Meteo only has historical data up to 2024, so use 2024 for current year requests
        if year >= current_year:
            year = 2024
            start_date = f"{year}-03-01"
            end_date = f"{year}-05-31"
        elif year == current_year:
            # If we're in the current year and past May, use historical data
            if current_date.month > 5:
                # Use previous year's data for current year if we're past the growing season
                year = current_year - 1
                start_date = f"{year}-03-01"
                end_date = f"{year}-05-31"
            elif current_date.month < 3:
                # If we're before March, use previous year's data
                year = current_year - 1
                start_date = f"{year}-03-01"
                end_date = f"{year}-05-31"
        
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum",
            "timezone": "auto"
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            daily_data = data.get("daily", {})
            temperatures = daily_data.get("temperature_2m_mean", [])
            humidities = daily_data.get("relative_humidity_2m_mean", [])
            precipitations = daily_data.get("precipitation_sum", [])
            
            if not temperatures:
                raise Exception(f"No weather data available for {city} during {start_date} to {end_date}")
            
            # Calculate averages and totals
            avg_temperature = statistics.mean(temperatures)
            avg_humidity = statistics.mean(humidities)
            total_rainfall = sum(precipitations)
            
            # Create location display name
            location_display = city
            if state:
                location_display += f", {state}"
            if country:
                location_display += f", {country}"
            
            return WeatherData(
                temperature=round(avg_temperature, 2),
                humidity=round(avg_humidity, 2),
                rainfall=round(total_rainfall, 2),
                location=location_display,
                period=f"March-May {year}"
            )
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get weather data: {str(e)}")


def get_weather_data_for_city_free(city: str, year: int = None, state: str = None, country: str = None) -> WeatherData:
    """
    Get weather data using the free Open-Meteo API (no API key required)
    This is the recommended function to use
    """
    service = OpenMeteoWeatherService()
    return service.get_weather_for_crop_season(city, year, state, country)


def get_weather_data_from_coordinates(lat: float, lon: float, city_name: str, year: int = None) -> WeatherData:
    """
    Get weather data directly from coordinates (bypasses geocoding)
    """
    service = OpenMeteoWeatherService()
    
    # Use current year if not specified
    if year is None:
        year = datetime.now().year
    
    # Define date range
    start_date = f"{year}-03-01"
    end_date = f"{year}-05-31"
    
    # Check if we're requesting current year and if we're past the growing season
    current_date = datetime.now()
    current_year = current_date.year
    
    # Open-Meteo only has historical data up to 2024, so use 2024 for current year requests
    if year >= current_year:
        year = 2024
        start_date = f"{year}-03-01"
        end_date = f"{year}-05-31"
    
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum",
        "timezone": "auto"
    }
    
    try:
        response = requests.get(service.base_url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        daily_data = data.get("daily", {})
        temperatures = daily_data.get("temperature_2m_mean", [])
        humidities = daily_data.get("relative_humidity_2m_mean", [])
        precipitations = daily_data.get("precipitation_sum", [])
        
        if not temperatures:
            raise Exception(f"No weather data available for coordinates {lat}, {lon} during {start_date} to {end_date}")
        
        # Calculate averages and totals
        avg_temperature = statistics.mean(temperatures)
        avg_humidity = statistics.mean(humidities)
        total_rainfall = sum(precipitations)
        
        return WeatherData(
            temperature=round(avg_temperature, 2),
            humidity=round(avg_humidity, 2),
            rainfall=round(total_rainfall, 2),
            location=city_name,
            period=f"March-May {year}"
        )
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to get weather data: {str(e)}")

import json
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import statistics
from pydantic import BaseModel


# Lightweight weather feature fetch for scoring integration (Open-Meteo; no API key)
OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"


@dataclass
class WeatherFeatures:
    temperature: float
    humidity: float
    rainfall: float


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

    try:
        resp = requests.get(OPEN_METEO_BASE, params=params, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return WeatherFeatures(temperature=20.0, humidity=60.0, rainfall=0.0)

    current = data.get("current", {}) or {}
    daily_vals = (data.get("daily", {}) or {}).get("precipitation_sum", []) or []

    try:
        temperature = float(current.get("temperature_2m", 20.0))
    except Exception:
        temperature = 20.0
    try:
        humidity = float(current.get("relative_humidity_2m", current.get("relativehumidity_2m", 60.0)))
    except Exception:
        humidity = 60.0

    if isinstance(daily_vals, list) and daily_vals:
        try:
            rainfall = float(daily_vals[-1])
        except Exception:
            rainfall = 0.0
    else:
        try:
            rainfall = float(current.get("precipitation", 0.0))
        except Exception:
            rainfall = 0.0

    return WeatherFeatures(temperature=temperature, humidity=humidity, rainfall=rainfall)


class MultipleCitiesException(Exception):
    """Exception raised when multiple cities are found and disambiguation is needed"""
    def __init__(self, message: str, options: List[Dict]):
        super().__init__(message)
        self.options = options


class WeatherData(BaseModel):
    """Weather data model for crop recommendation"""
    temperature: float  # Average temperature in Celsius
    humidity: float     # Average humidity percentage
    rainfall: float     # Total rainfall in mm
    location: str       # City name
    period: str         # Date range (e.g., "March-May 2024")


class WeatherService:
    """Service to fetch weather data from OpenWeatherMap API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENWEATHER_API_KEY")
        if not self.api_key:
            raise ValueError("OpenWeatherMap API key is required. Set OPENWEATHER_API_KEY environment variable.")
        
        self.base_url = "http://api.openweathermap.org/data/2.5"
    
    def get_coordinates(self, city: str) -> Tuple[float, float]:
        """Get latitude and longitude for a city"""
        url = f"{self.base_url}/weather"
        params = {
            "q": city,
            "appid": self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            return data["coord"]["lat"], data["coord"]["lon"]
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get coordinates for {city}: {str(e)}")
        except KeyError:
            raise Exception(f"City '{city}' not found. Please check the spelling.")
    
    def get_historical_weather(self, lat: float, lon: float, start_date: str, end_date: str) -> List[Dict]:
        """Get historical weather data for a location and date range"""
        url = f"{self.base_url}/history/city"
        params = {
            "lat": lat,
            "lon": lon,
            "type": "hour",
            "start": start_date,
            "end": end_date,
            "appid": self.api_key,
            "units": "metric"
        }
        
        try:
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            return data.get("list", [])
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get historical weather data: {str(e)}")
    
    def get_weather_for_crop_season(self, city: str, year: int = 2024) -> WeatherData:
        """
        Get weather data for the crop growing season (March-May)
        Returns aggregated data suitable for crop recommendation
        """
        # Define the growing season period
        start_date = f"{year}-03-01"
        end_date = f"{year}-05-31"
        
        # Get coordinates for the city
        lat, lon = self.get_coordinates(city)
        
        # Get historical weather data
        weather_data = self.get_historical_weather(lat, lon, start_date, end_date)
        
        if not weather_data:
            raise Exception(f"No weather data available for {city} during {start_date} to {end_date}")
        
        # Process the data
        temperatures = []
        humidities = []
        rainfall_total = 0.0
        
        for entry in weather_data:
            # Temperature (convert from Kelvin to Celsius if needed)
            temp = entry["main"]["temp"]
            temperatures.append(temp)
            
            # Humidity
            humidity = entry["main"]["humidity"]
            humidities.append(humidity)
            
            # Rainfall (if available)
            if "rain" in entry and "1h" in entry["rain"]:
                rainfall_total += entry["rain"]["1h"]
        
        # Calculate averages and totals
        avg_temperature = statistics.mean(temperatures) if temperatures else 0
        avg_humidity = statistics.mean(humidities) if humidities else 0
        
        return WeatherData(
            temperature=round(avg_temperature, 2),
            humidity=round(avg_humidity, 2),
            rainfall=round(rainfall_total, 2),
            location=city,
            period=f"March-May {year}"
        )


def get_weather_data_for_city(city: str, year: int = 2024) -> WeatherData:
    """
    Convenience function to get weather data for a city
    This is the main function to use for crop recommendations
    """
    service = WeatherService()
    return service.get_weather_for_crop_season(city, year)


# Alternative implementation using a free weather API (Open-Meteo)
class OpenMeteoWeatherService:
    """Alternative weather service using Open-Meteo (completely free, no API key required)"""
    
    def __init__(self):
        self.base_url = "https://archive-api.open-meteo.com/v1/archive"
    
    def get_coordinates(self, city: str, state: str = None, country: str = None) -> Tuple[float, float]:
        """Get coordinates using Open-Meteo geocoding with optional state/country disambiguation"""
        geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
        
        # Build search query with state/country if provided
        search_query = city
        if state:
            search_query += f", {state}"
        if country:
            search_query += f", {country}"
        
        params = {
            "name": search_query,
            "count": 10,  # Get more results to allow disambiguation
            "language": "en",
            "format": "json"
        }
        
        try:
            response = requests.get(geocoding_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("results"):
                raise Exception(f"City '{city}' not found. Please check the spelling.")
            
            results = data["results"]
            
            # If only one result or state/country specified, use the first result
            if len(results) == 1 or state or country:
                result = results[0]
                return result["latitude"], result["longitude"]
            
            # Multiple results - raise exception with options for disambiguation
            options = []
            for i, result in enumerate(results[:5]):  # Limit to 5 options
                admin1 = result.get("admin1", "")
                country_name = result.get("country", "")
                display_name = f"{result['name']}"
                if admin1:
                    display_name += f", {admin1}"
                if country_name:
                    display_name += f", {country_name}"
                options.append({
                    "index": i,
                    "name": display_name,
                    "lat": result["latitude"],
                    "lon": result["longitude"],
                    "admin1": admin1,
                    "country": country_name
                })
            
            raise MultipleCitiesException(f"Multiple cities found for '{city}'. Please specify state/country or choose from options.", options)
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get coordinates for {city}: {str(e)}")
    
    def get_weather_for_crop_season(self, city: str, year: int = None, state: str = None, country: str = None) -> WeatherData:
        """Get weather data using Open-Meteo API"""
        # Use current year if not specified
        if year is None:
            year = datetime.now().year
        
        # Get coordinates with optional state/country
        try:
            lat, lon = self.get_coordinates(city, state, country)
        except MultipleCitiesException as e:
            # If we get multiple cities exception, re-raise it for the caller to handle
            raise e
        
        # Define date range
        start_date = f"{year}-03-01"
        end_date = f"{year}-05-31"
        
        # Check if we're requesting current year and if we're past the growing season
        current_date = datetime.now()
        current_year = current_date.year
        
        # Open-Meteo only has historical data up to 2024, so use 2024 for current year requests
        if year >= current_year:
            year = 2024
            start_date = f"{year}-03-01"
            end_date = f"{year}-05-31"
        elif year == current_year:
            # If we're in the current year and past May, use historical data
            if current_date.month > 5:
                # Use previous year's data for current year if we're past the growing season
                year = current_year - 1
                start_date = f"{year}-03-01"
                end_date = f"{year}-05-31"
            elif current_date.month < 3:
                # If we're before March, use previous year's data
                year = current_year - 1
                start_date = f"{year}-03-01"
                end_date = f"{year}-05-31"
        
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum",
            "timezone": "auto"
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            daily_data = data.get("daily", {})
            temperatures = daily_data.get("temperature_2m_mean", [])
            humidities = daily_data.get("relative_humidity_2m_mean", [])
            precipitations = daily_data.get("precipitation_sum", [])
            
            if not temperatures:
                raise Exception(f"No weather data available for {city} during {start_date} to {end_date}")
            
            # Calculate averages and totals
            avg_temperature = statistics.mean(temperatures)
            avg_humidity = statistics.mean(humidities)
            total_rainfall = sum(precipitations)
            
            # Create location display name
            location_display = city
            if state:
                location_display += f", {state}"
            if country:
                location_display += f", {country}"
            
            return WeatherData(
                temperature=round(avg_temperature, 2),
                humidity=round(avg_humidity, 2),
                rainfall=round(total_rainfall, 2),
                location=location_display,
                period=f"March-May {year}"
            )
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get weather data: {str(e)}")


def get_weather_data_for_city_free(city: str, year: int = None, state: str = None, country: str = None) -> WeatherData:
    """
    Get weather data using the free Open-Meteo API (no API key required)
    This is the recommended function to use
    """
    service = OpenMeteoWeatherService()
    return service.get_weather_for_crop_season(city, year, state, country)


def get_weather_data_from_coordinates(lat: float, lon: float, city_name: str, year: int = None) -> WeatherData:
    """
    Get weather data directly from coordinates (bypasses geocoding)
    """
    service = OpenMeteoWeatherService()
    
    # Use current year if not specified
    if year is None:
        year = datetime.now().year
    
    # Define date range
    start_date = f"{year}-03-01"
    end_date = f"{year}-05-31"
    
    # Check if we're requesting current year and if we're past the growing season
    current_date = datetime.now()
    current_year = current_date.year
    
    # Open-Meteo only has historical data up to 2024, so use 2024 for current year requests
    if year >= current_year:
        year = 2024
        start_date = f"{year}-03-01"
        end_date = f"{year}-05-31"
    
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum",
        "timezone": "auto"
    }
    
    try:
        response = requests.get(service.base_url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        daily_data = data.get("daily", {})
        temperatures = daily_data.get("temperature_2m_mean", [])
        humidities = daily_data.get("relative_humidity_2m_mean", [])
        precipitations = daily_data.get("precipitation_sum", [])
        
        if not temperatures:
            raise Exception(f"No weather data available for coordinates {lat}, {lon} during {start_date} to {end_date}")
        
        # Calculate averages and totals
        avg_temperature = statistics.mean(temperatures)
        avg_humidity = statistics.mean(humidities)
        total_rainfall = sum(precipitations)
        
        return WeatherData(
            temperature=round(avg_temperature, 2),
            humidity=round(avg_humidity, 2),
            rainfall=round(total_rainfall, 2),
            location=city_name,
            period=f"March-May {year}"
        )
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to get weather data: {str(e)}")
