import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Animated,
  TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
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
      // Automatic OTP redirect logic for unverified emails:
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
                {/* <View style={styles.logo}>
                <View style={styles.logoPattern} />
              </View> */}
                <AnimatedImage
                  source={require('@/assets/images/logo/logo_light.svg')}
                  style={styles.logo}
                  contentFit="contain"
                // tintColor="#FFFFFF"
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
  logoPattern: {
    width: 60,
    height: 60,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    transform: [{ rotate: '45deg' }],
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
  }
});
