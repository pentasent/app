import Constants, { ExecutionEnvironment } from 'expo-constants';

let nativeInstance: any = null;
let isInitialized = false;

// Determine if we are running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Mock object that matches the analytics().... API
const mockInstance = {
  logEvent: async (name: string, params?: object) => {
    if (__DEV__) {
      console.log(`[FIREBASE_ANALYTICS_MOCK]: Event ${name} logged with:`, params);
    }
  },
  setUserId: async (id: string) => {
    if (__DEV__) {
      console.log('[FIREBASE_ANALYTICS_MOCK]: User ID set:', id);
    }
  },
  setUserProperties: async (properties: object) => {
    if (__DEV__) {
      console.log('[FIREBASE_ANALYTICS_MOCK]: User properties set:', properties);
    }
  },
  setAnalyticsCollectionEnabled: async (enabled: boolean) => {
    if (__DEV__) {
      console.log('[FIREBASE_ANALYTICS_MOCK]: Collection enabled:', enabled);
    }
  }
};

/**
 * Lazily resolves the analytics instance to prevent load-time crashes in Expo Go.
 */
export const getFirebaseAnalytics = () => {
  if (isInitialized) return nativeInstance || mockInstance;

  // CRITICAL: Never require native modules in Expo Go
  if (isExpoGo) {
    isInitialized = true;
    return mockInstance;
  }

  try {
    // Dynamic require to avoid crashes during initial import in Expo Go
    const analytics = require('@react-native-firebase/analytics');
    if (analytics) {
      nativeInstance = analytics.default();
    }
  } catch (e) {
    // Silent fail - will fallback to mock
  } finally {
    isInitialized = true;
  }

  return nativeInstance || mockInstance;
};
