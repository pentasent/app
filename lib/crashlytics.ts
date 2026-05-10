import Constants, { ExecutionEnvironment } from 'expo-constants';

let nativeInstance: any = null;
let isInitialized = false;

// Determine if we are running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Mock object that matches the crashlytics().... API
const mockInstance = {
  recordError: (error: any) => {
    if (__DEV__) {
      console.log('[CRASHLYTICS_MOCK]: Captured error:', error);
    }
  },
  log: (message: string) => {
    if (__DEV__) {
      console.log('[CRASHLYTICS_MOCK_LOG]:', message);
    }
  },
  setUserId: (id: string) => {
    if (__DEV__) {
      console.log('[CRASHLYTICS_MOCK_USER_ID]:', id);
    }
  },
  setAttribute: (key: string, value: string) => {
    if (__DEV__) {
      console.log(`[CRASHLYTICS_MOCK_ATTR]: ${key}=${value}`);
    }
  }
};

/**
 * Compatibility wrapper: returns the native instance if available,
 * otherwise returns a safe mock object.
 */
const crashlytics = () => {
  if (isInitialized) return nativeInstance || mockInstance;

  // CRITICAL: Never require native modules in Expo Go
  if (isExpoGo) {
    isInitialized = true;
    return mockInstance;
  }

  try {
    const crashlyticsModule = require('@react-native-firebase/crashlytics');
    if (crashlyticsModule) {
      nativeInstance = crashlyticsModule.default();
    }
  } catch (e) {
    // Silent fail
  } finally {
    isInitialized = true;
  }

  return nativeInstance || mockInstance;
};

export default crashlytics;
