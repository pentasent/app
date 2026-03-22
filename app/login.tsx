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
  
  const { login } = useAuth();
  const router = useRouter();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
                onPress={() => router.push('/reset-password' as any)}
                style={styles.forgotPasswordLink}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                variant="web-primary"
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
    width:75,
    height:75,
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
    textAlign: 'center',
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: '#6b4c5c', // Web forgot password color
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
