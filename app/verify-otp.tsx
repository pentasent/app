import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { trackEvent } from '../lib/analytics/track';
import crashlytics from '@/lib/crashlytics';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function VerifyOtpScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const [otp, setOtp] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const { otpType } = useAuth();
    const router = useRouter();
    const [isFocused, setIsFocused] = useState(true);
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

    const handleVerify = async () => {
        setErrorMsg(null);
        if (!otp || otp.length !== 6) {
            setErrorMsg('Please enter a valid 6-digit confirmation code.');
            return;
        }

        if (!email) {
            setErrorMsg('Missing email in context. Please try logging in again.');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: decodeURIComponent(email),
                token: otp,
                type: otpType as any,
            });

            if (error) throw error;

            // Verification successful. Auth session is created.
            trackEvent('user_verified');
            router.replace('/(tabs)');
            

        } catch (error: any) {
            crashlytics().recordError(error);
            setErrorMsg(error.message || 'Verification failed. Invalid code.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0 || resendLoading) return;
        setErrorMsg(null);
        if (!email) return;

        setResendLoading(true);
        try {
            await supabase.auth.resend({
                type: otpType as any,
                email: decodeURIComponent(email)
            });
            const endTime = Date.now() + 120 * 1000;
            await AsyncStorage.setItem(TIMER_KEY, endTime.toString());
            setTimer(120); // 2 minutes
            setErrorMsg("Sent! A new code has been sent to your email.");
        } catch (e: any) {
            crashlytics().recordError(e);
            setErrorMsg(e.message || "Failed to resend code.");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <>
            <Toast message={errorMsg} onHide={() => setErrorMsg(null)} />
            <LinearGradient
                colors={[colors.primaryLight, colors.background, colors.accent + "50"]}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
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
                            <Text style={styles.title}>Check your email</Text>
                            <Text style={styles.subtitle}>
                                We sent a 6-digit code to {email ? decodeURIComponent(email) : 'your email'}.
                            </Text>
                        </View>

                        <View style={styles.formContainer}>
                            {/* <Input
                                label="Confirmation Code"
                                placeholder="000000"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={{ textAlign: 'center', fontSize: 24 }}
                            /> */}
                            {/* <Input
                                label="Confirmation Code"
                                placeholder={isFocused ? '' : '000000'}
                                value={otp}
                                onChangeText={(text) => {
                                    const numeric = text.replace(/[^0-9]/g, '');
                                    if (numeric.length <= 6) {
                                        setOtp(numeric);
                                    }
                                }}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                style={{
                                    textAlign: 'center',
                                    fontSize: 28,
                                    letterSpacing: 14,
                                    height: 64,
                                    fontWeight: '600',
                                }}
                            /> */}
                            <Input
                                label="Confirmation Code"
                                placeholder={isFocused ? '' : '000000'}
                                // placeholder={isFocused ? '' : '000000'}
                                value={otp}
                                onChangeText={(text) => {
                                    const numeric = text.replace(/[^0-9]/g, '');
                                    if (numeric.length <= 6) {
                                        setOtp(numeric);
                                    }
                                }}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                style={styles.otpInput}
                            />
                            <Button
                                title="Verify Registration"
                                onPress={handleVerify}
                                loading={loading}
                                variant="web-primary"
                                style={styles.verifyButton}
                            />

                            <View style={styles.resendContainer}>
                                <Button
                                    title={timer > 0 ? `Resend again in - ${formatTime(timer)}` : "Resend Code"}
                                    onPress={handleResend}
                                    variant="outline"
                                    disabled={timer > 0 || resendLoading}
                                    loading={resendLoading}
                                    style={styles.resendButton}
                                />
                            </View>

                            {/* <Button
                                title="Back to Login"
                                onPress={() => router.replace('/login')}
                                variant="ghost"
                                style={{ marginTop: spacing.md }}
                            /> */}
                            <Button
                                title="Back to Registration"
                                onPress={() => router.replace('/register')}
                                variant="ghost"
                                style={{
                                    marginTop: spacing.md,
                                    left: 0,
                                    right: 0,
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    alignItems: 'flex-start',
                                    paddingLeft: 0,
                                    paddingRight: 0,
                                    backgroundColor: 'transparent',
                                    elevation: 0,
                                    shadowOpacity: 0,
                                    opacity: 0.8,
                                }}
                                textStyle={{ fontSize: 14, fontWeight: '500' }}   // 👈 make small
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
        lineHeight: 24,
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
        otpInput: {
        textAlign: 'center',
        fontSize: 28,
        letterSpacing: 14,
        height: 56,
        fontWeight: '600',
    },
    verifyButton: {
        marginTop: spacing.lg,
    },
    resendContainer: {
        marginTop: spacing.md,
        alignItems: 'center',
    },
    resendButton: {
        width: '100%',
    },
    timerText: {
        ...typography.body,
        fontSize: 13,
        color: colors.textLight,
        marginTop: 8,
    },
});
