import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import KeyboardShiftView from '@/components/KeyboardShiftView';
import crashlytics from '@/lib/crashlytics';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { setIsResetVerified, refreshUser } = useAuth();

    // Stage Management
    const [stage, setStage] = useState<'request' | 'verify' | 'reset'>('request');

    // UI States
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Form States
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Timer States
    const [timer, setTimer] = useState(0);
    const TIMER_KEY = "reset_timer_end";
    const EMAIL_KEY = "reset_email";

    // Auto-check for active timer on mount
    useEffect(() => {
        const checkTimer = async () => {
            const stored = await AsyncStorage.getItem(TIMER_KEY);
            const storedEmail = await AsyncStorage.getItem(EMAIL_KEY);
            if (stored) {
                const endTime = parseInt(stored, 10);
                const remaining = Math.ceil((endTime - Date.now()) / 1000);
                if (remaining > 0) {
                    setTimer(remaining);
                    if (storedEmail) setEmail(storedEmail);
                    // Automatically jump to verify stage if there is an active timer
                    // because it means they just requested one and maybe refreshed/re-opened
                    setStage('verify');
                } else {
                    await AsyncStorage.removeItem(TIMER_KEY);
                    await AsyncStorage.removeItem(EMAIL_KEY);
                }
            }
        };
        checkTimer();
    }, []);

    // Timer Interval
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        AsyncStorage.removeItem(TIMER_KEY);
                        AsyncStorage.removeItem(EMAIL_KEY);
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

    const isValidEmail = (email: string) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    // Stage 1: Request OTP
    const handleRequestOTP = async () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!isValidEmail(email)) {
            setErrorMsg('Please enter a valid email address');
            return;
        }

        if (timer > 0) {
            // If they already have a timer, let them proceed without re-requesting immediately
            setStage('verify');
            return;
        }

        setLoading(true);
        try {
            const targetEmail = email.toLowerCase().trim();
            const { data: userData } = await supabase.from('users').select('id').ilike('email', targetEmail).maybeSingle();

            if (!userData) {
                setErrorMsg('Account not found with this email.');
                setLoading(false);
                return;
            }

            const { error } = await supabase.auth.resetPasswordForEmail(targetEmail);
            if (error) throw error;

            const endTime = Date.now() + 120 * 1000;
            await AsyncStorage.setItem(TIMER_KEY, endTime.toString());
            await AsyncStorage.setItem(EMAIL_KEY, targetEmail);
            setTimer(120);

            setStage('verify');
        } catch (error: any) {
            crashlytics().recordError(error);
            setErrorMsg(error.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    // Stage 2: Verify OTP
    const handleVerifyOTP = async () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!otp || otp.length !== 6) {
            setErrorMsg('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: email.toLowerCase().trim(),
                token: otp,
                type: 'recovery',
            });
            if (error) throw error;

            setIsResetVerified(true); // Mark as verified so _layout doesn't redirect early
            setStage('reset');
        } catch (error: any) {
            crashlytics().recordError(error);
            setErrorMsg(error.message || 'Invalid or expired code');
        } finally {
            setLoading(false);
        }
    };

    // Stage 3: Reset Password
    const handleResetPassword = async () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!password || password.length < 6) {
            setErrorMsg('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            // Fetch latest session to ensure we have the user state
            await refreshUser();

            setSuccessMsg('Password updated successfully!');

            // await refreshUser();

            // Wait for context to update
            setTimeout(() => {
                // DO NOT call supabase.auth.getUser again
                // Use routing based on DB fetch like you already do

                const goNext = async () => {
                    const { data: { user: updatedUser } } = await supabase.auth.getUser();

                    if (updatedUser) {
                        const { data: publicUser } = await supabase
                            .from('users')
                            .select('is_verified, is_onboarded')
                            .eq('id', updatedUser.id)
                            .maybeSingle();

                        if (publicUser) {
                            if (!publicUser.is_verified) {
                                router.replace('/setup-profile');
                            } else if (!publicUser.is_onboarded) {
                                router.replace('/onboarding-communities');
                            } else {
                                router.replace('/(tabs)');
                            }
                        } else {
                            router.replace('/setup-profile');
                        }
                    } else {
                        router.replace('/login');
                    }

                    setIsResetVerified(false);
                };

                goNext();
            }, 500);
        } catch (error: any) {
            crashlytics().recordError(error);
            setErrorMsg(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <Toast message={errorMsg} onHide={() => setErrorMsg(null)} />
            {successMsg && <Toast message={successMsg} onHide={() => setSuccessMsg(null)} />}

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
                            <Text style={styles.title}>
                                {stage === 'request' && 'Reset Password'}
                                {stage === 'verify' && 'Check your email'}
                                {stage === 'reset' && 'Create New Password'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {stage === 'request' && "Enter your email address and we'll send you a link to reset your password."}
                                {stage === 'verify' && `We sent a 6-digit code to ${email || 'your email'}.`}
                                {stage === 'reset' && "Your identity has been verified. Please enter your new password below."}
                            </Text>
                        </View>

                        {/* Warnings for Verify and Reset Stages */}
                        {(stage === 'verify' || stage === 'reset') && (
                            <View style={styles.warningContainer}>
                                <AlertCircle size={20} color="#eab308" style={styles.warningIcon} />
                                <Text style={styles.warningText}>
                                    Please do not close or leave this screen until your password is reset.
                                </Text>
                            </View>
                        )}

                        <View style={styles.formContainer}>

                            {/* STAGE 1: Request */}
                            {stage === 'request' && (
                                <>
                                    <Input
                                        label="Email Address"
                                        placeholder="example@email.com"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <Button
                                        title={timer > 0 ? `Resend Code in ${formatTime(timer)}` : "Send Reset Code"}
                                        onPress={handleRequestOTP}
                                        loading={loading}
                                        disabled={!isValidEmail(email) || (timer > 0 && stage === 'request')}
                                        variant="web-primary"
                                        style={styles.actionButton}
                                    />
                                </>
                            )}

                            {/* STAGE 2: Verify */}
                            {stage === 'verify' && (
                                <>
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
                                        style={styles.otpInput}
                                    />
                                    <Button
                                        title="Verify Code"
                                        onPress={handleVerifyOTP}
                                        loading={loading}
                                        variant="web-primary"
                                        style={styles.actionButton}
                                    />

                                    <View style={styles.resendContainer}>
                                        <Button
                                            title={timer > 0 ? `Resend again in - ${formatTime(timer)}` : "Resend Code"}
                                            onPress={() => {
                                                if (timer <= 0) {
                                                    handleRequestOTP();
                                                }
                                            }}
                                            variant="outline"
                                            disabled={timer > 0 || loading}
                                            style={styles.resendButton}
                                        />
                                    </View>
                                </>
                            )}

                            {/* STAGE 3: Reset */}
                            {stage === 'reset' && (
                                <>
                                    <Input
                                        label="New Password"
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
                                        title="Set New Password"
                                        onPress={handleResetPassword}
                                        loading={loading}
                                        variant="web-primary"
                                        style={styles.actionButton}
                                    />
                                </>
                            )}

                            {/* Back Navigation (Hidden during verify/reset specifically to prevent accidental loss of state) */}
                            {stage === 'request' && (
                                <Button
                                    title="Back to Login"
                                    onPress={() => router.replace('/login')}
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
                            )}
                        </View>
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
        color: '#3c2a34',
        marginBottom: spacing.xs,
        fontWeight: '300',
    },
    subtitle: {
        ...typography.body,
        color: '#6b4c5c',
        // textAlign: 'center',
        lineHeight: 24,
    },
    formContainer: {
        // backgroundColor: 'rgba(255, 255, 255, 0.9)',
        // borderRadius: 24,
        // padding: spacing.xl,
        paddingTop: spacing.sm,
        // shadowColor: '#3c2a34',
        // shadowOffset: { width: 0, height: 8 },
        // shadowOpacity: 0.05,
        // shadowRadius: 24,
        // elevation: 4,
    },
    actionButton: {
        marginTop: spacing.lg,
    },
    resendContainer: {
        marginTop: spacing.md,
        alignItems: 'center',
    },
    resendButton: {
        width: '100%',
    },
    otpInput: {
        textAlign: 'center',
        fontSize: 28,
        letterSpacing: 14,
        height: 56,
        fontWeight: '600',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fefce8', // yellow-50
        borderColor: '#fef08a', // yellow-200
        borderWidth: 1,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    warningIcon: {
        marginRight: spacing.sm,
    },
    warningText: {
        flex: 1,
        color: '#854d0e', // yellow-800
        ...typography.bodySmall,
    }
});
