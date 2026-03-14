import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Animated,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Eye, EyeOff, Mail, X, CheckCircle2 } from 'lucide-react-native';
import KeyboardShiftView from '@/components/KeyboardShiftView';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { login, resetPassword } = useAuth();
  const router = useRouter();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  // Cooldown timer logic
  useEffect(() => {
    let interval: any;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email.toLowerCase().trim(), password);
    } catch (error: any) {
      const msg = error.message || 'An error occurred during login';
      setErrorMsg(msg);
      if (msg.includes('Email not confirmed')) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}` as any);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!isValidEmail(forgotEmail)) return;
    
    if (cooldown > 0) {
      setErrorMsg(`Please wait ${formatTime(cooldown)} before resending.`);
      return;
    }

    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail.toLowerCase().trim());
      setEmailSent(true);
      setCooldown(120); // 2 minutes cooldown
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to send reset link');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <Toast message={errorMsg} onHide={() => setErrorMsg(null)} />
      <LinearGradient
        colors={[colors.primaryLight, colors.background, colors.secondaryLight]}
        style={styles.gradient}
      >
        <KeyboardShiftView style={styles.container}>
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
              <Text style={styles.title}>Pentasent</Text>
              <Text style={styles.subtitle}>Take Back Control of Your Mind and Senses</Text>
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
                placeholder="Enter your password"
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

              <TouchableOpacity 
                onPress={() => setShowForgotModal(true)}
                style={styles.forgotPasswordLink}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title="Login"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Create New Account"
                onPress={() => router.push('/register')}
                variant="outline"
              />
            </View>

            <Text style={styles.footer}>
              Take Back Control of Your Mind and Senses
            </Text>

                  {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <View style={styles.modalContainer}>
              <ScrollView 
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalContent}>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => {
                      setShowForgotModal(false);
                      setEmailSent(false);
                    }}
                  >
                    <X size={24} color={colors.textMuted} />
                  </TouchableOpacity>

                  {emailSent ? (
                    <View style={styles.successContainer}>
                      <CheckCircle2 size={60} color={colors.success} strokeWidth={1.5} />
                      <Text style={styles.modalTitle}>Check your email</Text>
                      <Text style={styles.modalDescription}>
                        If an account exists with {forgotEmail}, you will receive a password reset link shortly.
                      </Text>
                      
                      <View style={styles.tipCard}>
                        <Text style={styles.tipText}>
                          💡 Didn't receive an email? Check your spam folder, or make sure the email address is correct.
                        </Text>
                      </View>

                      <Button
                        title={cooldown > 0 ? `Resend in ${formatTime(cooldown)}` : "Resend Link"}
                        onPress={handleForgotPassword}
                        loading={forgotLoading}
                        disabled={cooldown > 0}
                        variant="outline"
                        style={styles.modalButton}
                      />
                      
                      <Button
                        title="Back to Login"
                        onPress={() => {
                          setShowForgotModal(false);
                          setEmailSent(false);
                        }}
                        style={styles.modalButton}
                      />
                    </View>
                  ) : (
                    <>
                      <Text style={styles.modalTitle}>Reset Password</Text>
                      <Text style={styles.modalDescription}>
                        Enter your email address and we'll send you a link to reset your password.
                      </Text>

                      <Input
                        label="Email Address"
                        placeholder="example@email.com"
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        leftAccessory={<Mail size={20} color={colors.textMuted} style={{marginRight: 10}} />}
                      />

                      <Button
                        title={cooldown > 0 ? `Resend in ${formatTime(cooldown)}` : "Send Reset Link"}
                        onPress={handleForgotPassword}
                        loading={forgotLoading}
                        disabled={!isValidEmail(forgotEmail) || cooldown > 0}
                        style={styles.modalButton}
                      />
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
    alignItems: 'center',
    marginBottom: spacing.xxl,
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
    ...typography.bodySmall,
    color: colors.textLight,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: colors.surface + '90',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  loginButton: {
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
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
    zIndex: 10,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalDescription: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  successContainer: {
    alignItems: 'center',
  },
  tipCard: {
    backgroundColor: colors.primaryLight + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  tipText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
  }
});
