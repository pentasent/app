import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Eye, EyeOff } from 'lucide-react-native';
import KeyboardShiftView from '@/components/KeyboardShiftView';
import { trackEvent } from '../lib/analytics/track';
import crashlytics from '@/lib/crashlytics';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { addNotification } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [referralCode, setReferralCode] = useState('P-APP');
  const [timer, setTimer] = useState(0);

  const TIMER_KEY = "signup_timer_end";

  // Persistent timer initialization
  useEffect(() => {
    const initTimer = async () => {
      const storedTimerEnd = await AsyncStorage.getItem(TIMER_KEY);
      if (storedTimerEnd) {
        const endTime = parseInt(storedTimerEnd, 10);
        const remaining = Math.ceil((endTime - Date.now()) / 1000);
        if (remaining > 0) {
          setTimer(remaining);
        } else {
          await AsyncStorage.removeItem(TIMER_KEY);
        }
      }
    };
    initTimer();
  }, []);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            AsyncStorage.removeItem(TIMER_KEY);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const initializeReferral = async () => {
      const urlRef = params.ref as string;
      if (urlRef) {
        await AsyncStorage.setItem('referral_code', urlRef).catch(e => console.log('[ERROR]:', e));
        setReferralCode(urlRef);
      } else {
        const storedRef = await AsyncStorage.getItem('referral_code').catch(e => console.log('[ERROR]:', e));
        if (storedRef) {
          setReferralCode(storedRef);
        }
      }
    };
    initializeReferral();
  }, [params.ref]);

  const handleRegister = async () => {
    setErrorMsg(null);
    if (!email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const metadata = {
        referral_code: referralCode,
        date: new Date().toISOString(),
        Campain: "Promotion From App"
      };
      await register(email.toLowerCase().trim(), password, metadata);

      // Start the persistent timer after successful registration
      const endTime = Date.now() + 120 * 1000;
      await AsyncStorage.setItem(TIMER_KEY, endTime.toString());
      setTimer(120);

      // Successfully registered, track event
      trackEvent('user_signup');

      // Route to OTP verification
      router.push(`/verify-otp?email=${encodeURIComponent(email)}` as any);

    } catch (error: any) {
      setErrorMsg(error.message || 'Registration failed');
      crashlytics().recordError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast message={errorMsg} onHide={() => setErrorMsg(null)} />
      <LinearGradient
        colors={[colors.primaryLight, colors.background, colors.accent + "50"]}
        style={styles.gradient}
      >
        <KeyboardShiftView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoContainer}>
              <AnimatedImage
                source={require('@/assets/images/logo/logo_light.svg')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join Pentasent for better health</Text>
            </View>

            <View style={styles.formContainer}>
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                rightAccessory={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={24} color={colors.textMuted} />
                    ) : (
                      <Eye size={24} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                }
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                rightAccessory={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={24} color={colors.textMuted} />
                    ) : (
                      <Eye size={24} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                }
              />

              <Button
                title={timer > 0 ? `Resend in ${formatTime(timer)}` : "Create Account"}
                onPress={handleRegister}
                loading={loading}
                disabled={timer > 0}
                variant="web-primary"
                style={styles.registerButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Have an account? Login"
                onPress={() => router.back()}
                variant="outline"
              />
            </View>

            {/* <Text style={styles.footer}>
              By creating an account, you agree to our Terms & Privacy Policy
            </Text> */}
            <Text style={styles.footer}>
              By creating an account, you agree to our{" "}
              <Text
                style={{ color: '#8b5e83' }}
                onPress={() => Linking.openURL('https://pentasent.com/terms-and-conditions')}
              >
                Terms
              </Text>{" "}
              &{" "}
              <Text
                style={{ color: '#8b5e83' }}
                onPress={() => Linking.openURL('https://pentasent.com/privacy-policy')}
              >
                Privacy
              </Text>
            </Text>
          </ScrollView>
        </KeyboardShiftView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xl,
  },
  header: {
    // alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: borderRadius.full,
    width: 75,
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 42,
    height: 42,
  },
  title: {
    ...typography.h1,
    color: '#3c2a34', // Web heading color
    marginBottom: spacing.xs,
    fontWeight: '300', // Lighter weight for premium feel
  },
  subtitle: {
    ...typography.body,
    color: '#6b4c5c',
    // textAlign: 'center',
  },
  formContainer: {
    // backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slight transparency
    // borderRadius: 24, // More rounded like web
    // padding: spacing.xl,
    paddingTop: spacing.sm,
    // shadowColor: '#3c2a34',
    // shadowOffset: { width: 0, height: 8 },
    // shadowOpacity: 0.05,
    // shadowRadius: 24,
    // elevation: 4,
  },
  registerButton: {
    marginTop: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  footer: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xl,
  }
});
