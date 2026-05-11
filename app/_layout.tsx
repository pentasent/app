import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRootNavigationState, Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AppProvider, useApp } from '../contexts/AppContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { FeedProvider } from '../contexts/FeedContext';
import { SessionProvider } from '../contexts/SessionContext';
import { View, StyleSheet, LogBox, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../constants/theme';
import Constants from 'expo-constants';
import { CustomSplashScreen } from '../components/CustomSplashScreen';
import { NoInternetScreen } from '../components/NoInternetScreen';
import { MaintenanceScreen } from '../components/MaintenanceScreen';
import { UpdateModal } from '../components/UpdateModal';
import { Toast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { isVersionLower } from '../utils/version';
import { initMixpanel } from '../lib/analytics/mixpanel';
import { identifyUser } from '../lib/analytics/identify';
import { trackEvent } from '../lib/analytics/track';

// Suppress Mixpanel native module warning in Expo Go
LogBox.ignoreLogs(['MixpanelReactNative is not available']);

function RootLayoutNav() {
  const { user, isAdmin, loading, isResetVerified, refreshUser } = useAuth();
  const { toast, hideToast, showToast, isConnected } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const isNavigationReady = navigationState?.key;
  
  // Deep linking pending state
  const url = Linking.useURL();
  const [pendingDeepLinkRoute, setPendingDeepLinkRoute] = useState<string | null>(null);

  // Version Control State
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [updateConfig, setUpdateConfig] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isForcedUpdate, setIsForcedUpdate] = useState(false);

  // Network Status State
  const [showNoInternetPage, setShowNoInternetPage] = useState(false);

  // Prevent infinite redirect loops
  const lastRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    checkAppConfig();
  }, []);

  const checkAppConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('[ERROR]:', 'Error fetching app config:', error);
        return;
      }

      if (data) {
        // 1. Check Maintenance Mode
        if (data.maintenance_mode) {
          setIsMaintenanceMode(true);
          setMaintenanceMessage(data.maintenance_message);
          return;
        }

        // 2. Check Force Update
        if (isVersionLower(appVersion, data.min_supported_version)) {
          setUpdateConfig(data);
          setIsForcedUpdate(true);
          setShowUpdateModal(true);
          return;
        }

        // 3. Check Optional Update
        if (isVersionLower(appVersion, data.latest_version)) {
          setUpdateConfig(data);
          setIsForcedUpdate(data.force_update); // Allow remote toggle of forced vs optional
          setShowUpdateModal(true);
        }
      }
    } catch (err) {
      console.log('[ERROR]:', 'Failed to check app config:', err);
    }
  };

  const handleUpdate = () => {
    const url = Platform.OS === 'android' ? updateConfig?.android_url : updateConfig?.ios_url;
    if (url) {
      Linking.openURL(url);
    }
  };

  const hasAttemptedRefreshRef = useRef(false);

  useEffect(() => {
    if (isConnected === false) {
      if (loading || !user || !(user as any).is_onboarded) {
        setShowNoInternetPage(true);
      }
    } else if (isConnected === true) {
      setShowNoInternetPage(false);
      // If internet is back and we don't have a user yet, try to refresh the session ONCE
      if (!user && !loading && !hasAttemptedRefreshRef.current) {
        hasAttemptedRefreshRef.current = true;
        refreshUser();
      }
    }
  }, [isConnected, loading, user]);

  // Parse incoming URLs
  useEffect(() => {
    if (url) {
      const parsed = Linking.parse(url);

      // Check if it's a post detail link: e.g. /post/uuid
      if (parsed.path && parsed.path.startsWith('post/')) {
        const targetRoute = `/${parsed.path}`;

        // ONLY save as pending if the user is NOT ready (redirecting to login/onboarding)
        // If they ARE ready, Expo Router handles the navigation automatically.
        // Manual push here causes a "double-push" bug.
        if (!user || !(user as any).is_onboarded) {
          setPendingDeepLinkRoute(targetRoute);
        }
      }

      // Capture referral code if present in query params
      const ref = parsed.queryParams?.ref as string;
      if (ref) {
        AsyncStorage.setItem('referral_code', ref).catch(e => console.log('[ERROR]:', e));
      }
    }
  }, [url, user]);

  // Identify user for Mixpanel
  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
        role: user.role,
      });
    }
  }, [user]);

  // Track page views and reset redirect ref
  useEffect(() => {
    if (segments.length > 0) {
      const pageName = segments.join('/');
      trackEvent('page_view', { page: pageName });

      // If we've reached the destination we were trying to redirect to, clear the ref
      if (segments[0] === lastRedirectRef.current?.replace('/', '')) {
        lastRedirectRef.current = null;
      }

      if (segments[0] === 'meditation') {
        trackEvent('meditation_started');
      }
    }
  }, [segments]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'coming-soon';
    const inProtectedRoute = ['chat', 'routine', 'notifications', 'post', 'profile', 'beats', 'community', 'meditation', 'journal', 'articles', 'tasks', 'yoga', 'products', 'pulse', 'maya', 'subscription', 'games', 'events'].includes(segments[0]);
    const isAuthRoute = ['login', 'register', 'verify-otp', 'reset-password'].includes(segments[0]);

    if (!user) {
      // BLOCK redirects during entire reset flow
      if (segments[0] === 'reset-password') {
        return;
      }

      if (isAuthRoute) {
        // Only clear the ref if we have actually landed on an auth route
        if (segments[0] === lastRedirectRef.current?.replace('/', '')) {
          lastRedirectRef.current = null;
        }
        return;
      }

      // REDIRECT TO LOGIN: if at root OR in a protected area
      if (!segments[0] || inAuthGroup || inProtectedRoute || segments[0] === 'setup-profile' || segments[0] === 'onboarding-communities') {
        if (isNavigationReady && lastRedirectRef.current !== '/login') {
          lastRedirectRef.current = '/login';
          requestAnimationFrame(() => {
            router.replace('/login');
          });
        }
      }
    } else {
      // User is logged in.
      
      // If they are in the middle of a reset password flow, let them be.
      if (segments[0] === 'reset-password' && isResetVerified) {
         return; 
      }
      
      if (!user.is_verified) {
        if (segments[0] !== 'setup-profile' && isNavigationReady && lastRedirectRef.current !== '/setup-profile') {
          lastRedirectRef.current = '/setup-profile';
          router.replace('/setup-profile');
        }
      } else if (!user.is_onboarded) {
        if (segments[0] !== 'onboarding-communities' && isNavigationReady && lastRedirectRef.current !== '/onboarding-communities') {
          lastRedirectRef.current = '/onboarding-communities';
          router.replace('/onboarding-communities');
        }
      } else {
        // User is completely onboarded.
        if (!inAuthGroup && !inProtectedRoute && segments[0] !== 'onboarding-communities' && segments[0] !== 'setup-profile' && segments[0] !== 'reset-password') {
          if (isNavigationReady && lastRedirectRef.current !== '/(tabs)') {
            lastRedirectRef.current = '/(tabs)';
            router.replace('/(tabs)');
          }

          // Process pending deep link after landing on feed
          if (pendingDeepLinkRoute) {
            setTimeout(() => {
              router.push(pendingDeepLinkRoute as any);
              setPendingDeepLinkRoute(null);
            }, 100);
          }
        } else if (segments[0] === '(tabs)' && pendingDeepLinkRoute) {
          setTimeout(() => {
            router.push(pendingDeepLinkRoute as any);
            setPendingDeepLinkRoute(null);
          }, 100);
        }
      }
    }
  }, [user, isAdmin, loading, segments, pendingDeepLinkRoute, isNavigationReady]);

  // 3. Render Logic
  return (
    <View style={{ flex: 1 }}>
      <Toast 
        message={toast.message} 
        onHide={hideToast} 
        type={toast.type}
        duration={toast.duration}
      />
      <UpdateModal
        visible={showUpdateModal}
        isForced={isForcedUpdate}
        latestVersion={updateConfig?.latest_version || ''}
        message={updateConfig?.update_message || ''}
        releaseNotes={updateConfig?.release_notes}
        onUpdate={handleUpdate}
        onDismiss={() => setShowUpdateModal(false)}
      />
      
      {isMaintenanceMode ? (
        <MaintenanceScreen message={maintenanceMessage} />
      ) : showNoInternetPage ? (
        <View style={{ flex: 1 }}>
          <NoInternetScreen onRetry={() => NetInfo.fetch()} />
        </View>
      ) : loading ? (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <CustomSplashScreen isReady={false} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{headerShown: false, animation: 'fade' }}/>
            <Stack.Screen name="register" options={{headerShown: false, animation: 'fade' }}/>
            <Stack.Screen name="reset-password" options={{headerShown: false, animation: 'fade' }}/>
            <Stack.Screen name="verify-otp" options={{headerShown: false, animation: 'fade' }}/>
            <Stack.Screen name="setup-profile" options={{headerShown: false, animation: 'fade' }}/>
            <Stack.Screen name="onboarding-communities" options={{headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="coming-soon" options={{headerShown: false, animation: 'fade' }}/>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="post/[id]" options={{ presentation: 'modal', headerShown: false, animation: 'none'}} />
            <Stack.Screen name="profile/index" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="beats/[id]" options={{ headerShown: false, presentation: 'modal', animation: 'fade' }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="community/index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="community/[id]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="community/members/[id]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="meditation/index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="journal/index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="journal/[id]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="tasks/index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="tasks/create" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="tasks/[id]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="yoga/index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="yoga/[id]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="articles/index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="articles/[slug]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="pulse/index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="maya/index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="maya/[id]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="games" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="events/yoga" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="subscription/upgrade" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          {((user && segments.length > 0 && segments[0] !== '(tabs)' && !['chat', 'routine', 'notifications', 'post', 'profile', 'beats', 'community', 'meditation', 'journal', 'articles', 'tasks', 'yoga', 'pulse', 'maya', 'subscription', 'games', 'events', 'setup-profile', 'onboarding-communities', 'login', 'register', 'verify-otp', 'reset-password'].includes(segments[0])) ||
            (!user && segments.length > 0 && segments[0] === '(tabs)')
          ) && (
            <View style={[StyleSheet.absoluteFill, styles.loadingContainer]} />
          )}
        </View>
      )}
      
      <CustomSplashScreen isReady={!loading} />
    </View>
  );
}

import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // initMixpanel(); // Disabled temporarily to check if JS fallback breaks websockets
    // trackEvent('app_open');
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <SubscriptionProvider>
          <FeedProvider>
            <SessionProvider>
              <GlobalErrorBoundary>
                <RootLayoutNav />
                <StatusBar style="dark" />
              </GlobalErrorBoundary>
            </SessionProvider>
          </FeedProvider>
        </SubscriptionProvider>
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
