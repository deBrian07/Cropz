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

const LAST_KNOWN_LOCATION_KEY = "cropz.lastKnownLocation";
let hasLoggedBackgroundLocationError = false;

function isValidCoordinate(latitude: number | undefined, longitude: number | undefined): boolean {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

export function loadLastKnownLocation(maxAgeMs?: number): LocationData | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage?.getItem(LAST_KNOWN_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationData;
    if (!isValidCoordinate(parsed?.latitude, parsed?.longitude)) return null;
    if (typeof maxAgeMs === "number" && parsed?.timestamp) {
      const age = Date.now() - parsed.timestamp;
      if (age > maxAgeMs) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveLastKnownLocation(location: LocationData): void {
  try {
    if (typeof window === "undefined") return;
    if (!isValidCoordinate(location?.latitude, location?.longitude)) return;
    const withTimestamp: LocationData = {
      ...location,
      timestamp: location.timestamp ?? Date.now(),
    };
    try {
      window.sessionStorage?.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify(withTimestamp));
    } catch {}
    (window as any).lastKnownLocation = withTimestamp;
  } catch {}
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
    
    // Persist last known location (session-only) and set global for immediate use
    saveLastKnownLocation(location);
    
  } catch (error) {
    const message = getLocationErrorText(error as LocationError);
    // Avoid red error overlay noise in dev; warn once per session only
    if (!hasLoggedBackgroundLocationError) {
      console.warn('⚠️ [Background] Location error:', message);
      hasLoggedBackgroundLocationError = true;
    } else {
      console.debug('[Background] Location error (suppressed):', message);
    }
  }
}
