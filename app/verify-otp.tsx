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
import { supabase } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { trackEvent } from '../lib/analytics/track';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function VerifyOtpScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const [otp, setOtp] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const router = useRouter();
    const [isFocused, setIsFocused] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000) as any;
        }
        return () => {
            if (interval) clearInterval(interval);
        };
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
                type: 'signup',
            });

            if (error) throw error;

            // Verification successful. Auth session is created.
            trackEvent('user_verified');
            router.replace('/(tabs)');

        } catch (error: any) {
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
                type: 'signup',
                email: decodeURIComponent(email)
            });
            setTimer(120); // 2 minutes
            setErrorMsg("Sent! A new code has been sent to your email.");
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to resend code.");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <>
            <Toast message={errorMsg} onHide={() => setErrorMsg(null)} />
            <LinearGradient
                colors={[colors.primaryLight, colors.background, colors.secondaryLight]}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <AnimatedImage
                                    source={require('@/assets/images/logo/logo_light.svg')}
                                    style={styles.logo}
                                    contentFit="contain"
                                />
                            </View>
                            <Text style={styles.title}>Verify Email</Text>
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
                            <Input
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
                                    fontSize: 26,
                                    letterSpacing: 12,
                                    paddingVertical: 10
                                }}
                            />
                            <Button
                                title="Verify & Login"
                                onPress={handleVerify}
                                loading={loading}
                                style={styles.verifyButton}
                            />

                            <View style={styles.resendContainer}>
                                <Button
                                    title="Resend Code"
                                    onPress={handleResend}
                                    variant="outline"
                                    disabled={timer > 0 || resendLoading}
                                    loading={resendLoading}
                                    style={[
                                        styles.resendButton,
                                        timer > 0 && { opacity: 0.5 }
                                    ]}
                                />
                                {timer > 0 && (
                                    <Text style={styles.timerText}>
                                        Resend again in - {formatTime(timer)}
                                    </Text>
                                )}
                            </View>

                            <Button
                                title="Back to Login"
                                onPress={() => router.replace('/login')}
                                variant="ghost"
                                style={{ marginTop: spacing.md }}
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
        justifyContent: 'center'
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoContainer: {
        marginBottom: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 4,
    },
    logo: {
        width: 55,
        height: 55,
    },
    title: {
        ...typography.h1,
        color: colors.primary,
        marginBottom: spacing.xs,
        fontWeight: '700',
    },
    subtitle: {
        ...typography.body,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 24,
    },
    formContainer: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 4,
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
