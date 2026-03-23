import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AppProvider } from '../contexts/AppContext';
import { FeedProvider } from '../contexts/FeedContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { CustomSplashScreen } from '../components/CustomSplashScreen';
import { initMixpanel } from '../lib/analytics/mixpanel';
import { identifyUser } from '../lib/analytics/identify';
import { trackEvent } from '../lib/analytics/track';

function RootLayoutNav() {
  const { user, isAdmin, loading, isResetVerified } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Deep linking pending state
  const url = Linking.useURL();
  const [pendingDeepLinkRoute, setPendingDeepLinkRoute] = useState<string | null>(null);

  // Parse incoming URLs
  useEffect(() => {
    if (url) {
      const parsed = Linking.parse(url);

      // Check if it's a post detail link: e.g. /post/uuid
      if (parsed.path && parsed.path.startsWith('post/')) {
        const targetRoute = `/${parsed.path}`;

        // If ready to navigate right now
        if (user && user.is_onboarded) {
          router.push(targetRoute as any); // use push instead of replace to allow back button to feed
        } else {
          // Save for later once they log in and onboard
          setPendingDeepLinkRoute(targetRoute);
        }
      }

      // Capture referral code if present in query params
      const ref = parsed.queryParams?.ref as string;
      if (ref) {
        AsyncStorage.setItem('referral_code', ref).catch(console.error);
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

  // Track page views
  useEffect(() => {
    if (segments.length > 0) {
      const pageName = segments.join('/');
      trackEvent('page_view', { page: pageName });

      if (segments[0] === 'meditation') {
        trackEvent('meditation_started');
      }
    }
  }, [segments]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'coming-soon';
    const inProtectedRoute = ['chat', 'routine', 'notifications', 'post', 'profile', 'beats', 'community', 'meditation', 'journal', 'articles', 'tasks', 'yoga', 'products'].includes(segments[0]);
    const isAuthRoute = ['login', 'register', 'verify-otp', 'reset-password'].includes(segments[0]);

if (!user) {
  // BLOCK redirects during entire reset flow
  if (segments[0] === 'reset-password') {
    return;
  }

  if (inAuthGroup || inProtectedRoute || segments[0] === 'setup-profile' || segments[0] === 'onboarding-communities') {
    router.replace('/login');
  }
} else {
      // User is logged in. Check verification (Draft User status).
      
      // If they are in the middle of a reset password flow, let them be.
      if (segments[0] === 'reset-password' && isResetVerified) {
         return; 
      }
      
      if (!user.is_verified) {
        if (segments[0] !== 'setup-profile') {
          router.replace('/setup-profile');
        }
      } else if (!user.is_onboarded) {
        if (segments[0] !== 'onboarding-communities') {
          router.replace('/onboarding-communities');
        }
      } else {
        // User is completely onboarded.
        if (!inAuthGroup && !inProtectedRoute && segments[0] !== 'onboarding-communities' && segments[0] !== 'setup-profile' && segments[0] !== 'reset-password') {
          router.replace('/(tabs)');

          // Process pending deep link after landing on feed
          if (pendingDeepLinkRoute) {
            setTimeout(() => {
              router.push(pendingDeepLinkRoute as any);
              setPendingDeepLinkRoute(null);
            }, 100); // slight delay to ensure tabs are mounted
          }
        } else if (segments[0] === '(tabs)' && pendingDeepLinkRoute) {
          // If already on tabs but a pending link exists (e.g. from background login flow)
          setTimeout(() => {
            router.push(pendingDeepLinkRoute as any);
            setPendingDeepLinkRoute(null);
          }, 100);
        }
      }
    }
  }, [user, isAdmin, loading, segments, pendingDeepLinkRoute]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* <ActivityIndicator size="large" color={colors.primary} /> */}
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="setup-profile" />
      <Stack.Screen name="onboarding-communities" />
      <Stack.Screen name="coming-soon" />
      <Stack.Screen name="(tabs)" />
      {/* <Stack.Screen name="updates" /> */}
      <Stack.Screen name="post/[id]" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="profile/index" options={{ headerShown: false }} />
      <Stack.Screen name="beats/[id]" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="community/index" options={{ headerShown: false }} />
      <Stack.Screen name="community/[id]" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="community/members/[id]" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="meditation/index" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="journal/index" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="journal/[id]" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="tasks/index" options={{ headerShown: false }} />
      <Stack.Screen name="tasks/create" options={{ headerShown: false }} />
      <Stack.Screen name="tasks/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="yoga/index" options={{ headerShown: false }} />
      <Stack.Screen name="yoga/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="products/index" options={{ headerShown: false }} />
      <Stack.Screen name="articles/index" options={{ headerShown: false }} />
      <Stack.Screen name="articles/[slug]" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    initMixpanel();
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <FeedProvider>
          <RootLayoutNav />
          <CustomSplashScreen />
          <StatusBar style="dark" backgroundColor={colors.background} />
          {/* <StatusBar style="dark" backgroundColor="transparent" translucent /> */}
        </FeedProvider>
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
