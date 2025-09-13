/**
 * Geolocation utility for getting user's current position
 * This runs in the background without affecting the UI
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

/**
 * Get current location using the browser's geolocation API
 * @returns Promise<LocationData> - Location coordinates and accuracy
 */
export async function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const error: LocationError = {
        code: 0,
        message: 'Geolocation is not supported by this browser.'
      };
      reject(error);
      return;
    }

    // Request current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        resolve(locationData);
      },
      (error) => {
        const locationError: LocationError = {
          code: error.code,
          message: error.message
        };
        reject(locationError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

/**
 * Get human-readable error message for location errors
 */
export function getLocationErrorText(error: LocationError): string {
  switch (error.code) {
    case 1:
      return 'Location access denied. Please enable location permissions.';
    case 2:
      return 'Location unavailable. Please check your internet connection.';
    case 3:
      return 'Location request timed out. Please try again.';
    default:
      return `Location error: ${error.message}`;
  }
}

/**
 * Background location fetcher that runs automatically
 * This function will be called when the page loads
 */
export async function fetchLocationInBackground(): Promise<void> {
  try {
    console.log('🌍 [Background] Attempting to get current location...');
    const location = await getCurrentLocation();
    
    console.log('✅ [Background] Location obtained successfully:');
    console.log(`   📍 Latitude: ${location.latitude.toFixed(6)}`);
    console.log(`   📍 Longitude: ${location.longitude.toFixed(6)}`);
    console.log(`   🎯 Accuracy: ${location.accuracy?.toFixed(0)} meters`);
    console.log(`   ⏰ Timestamp: ${new Date(location.timestamp || Date.now()).toLocaleString()}`);
    
    // Store location in a global variable for potential future use
    if (typeof window !== 'undefined') {
      (window as any).lastKnownLocation = location;
    }
    
  } catch (error) {
    console.error('❌ [Background] Location error:', getLocationErrorText(error as LocationError));
  }
}
