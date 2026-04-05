/**
 * A safe wrapper for Crashlytics that prevents crashes in environments 
 * where the native module is not available (like Expo Go).
 */

const getCrashlyticsInstance = () => {
  try {
    // Dynamic require to avoid crashes during initial import in Expo Go
    const crashlytics = require('@react-native-firebase/crashlytics').default;
    return crashlytics;
  } catch (e) {
    return null;
  }
};

const nativeInstance = getCrashlyticsInstance();

// Mock object that matches the crashlytics().... API
const mockInstance = {
  recordError: (error: any) => {
    console.log('[CRASHLYTICS_MOCK_NOTIFICATION]: Captured in mock:', error);
  },
  log: (message: string) => {
    console.log('[CRASHLYTICS_MOCK_LOG]:', message);
  },
  setUserId: (id: string) => {
    console.log('[CRASHLYTICS_MOCK_USER_ID]:', id);
  },
  setAttribute: (key: string, value: string) => {
    console.log(`[CRASHLYTICS_MOCK_ATTR]: ${key}=${value}`);
  }
};

/**
 * Compatibility wrapper: returns the native instance if available,
 * otherwise returns a safe mock object.
 */
const crashlytics = () => {
  if (nativeInstance) {
    try {
        // Try calling to ensure native app is initialized
        return nativeInstance();
    } catch (e) {
        return mockInstance;
    }
  }
  return mockInstance;
};

export default crashlytics;
