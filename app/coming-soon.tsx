import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { Construction } from 'lucide-react-native';
import LoggoutButton from '@/components/Loggout';


export default function ComingSoonScreen() {
  const { user } = useAuth();
  const AnimatedImage = Animated.createAnimatedComponent(Image);
  return (
    <LinearGradient
      colors={[colors.primaryLight, colors.background, colors.secondaryLight]}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {/* <Construction size={80} color={colors.primary} strokeWidth={1.5} /> */}
            <AnimatedImage
                    source={require('@/assets/images/logo/logo_light.svg')}
                    style={styles.logo}
                    contentFit="contain"
                    // tintColor="#FFFFFF"
                />
          </View>

          <Text style={styles.title}>Features Coming Soon!</Text>

          <Text style={styles.subtitle}>
            We're working hard to bring you the best healthcare experience
          </Text>

          <View style={styles.card}>
            <Text style={styles.message}>
              Hi <Text style={styles.userName}>{user?.name}</Text>,
            </Text>

            <Text style={styles.description}>
              Thank you for joining Pentasent! We're putting the finishing touches on amazing features that will revolutionize your Mind and Senses.
            </Text>

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>What's Coming:</Text>

              <View style={styles.featureItem}>
                <View style={styles.bullet} />
                <Text style={styles.featureText}>Healthcare based communities</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.bullet} />
                <Text style={styles.featureText}>Personalized healthcare experience</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.bullet} />
                <Text style={styles.featureText}>Health track, routines</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.bullet} />
                <Text style={styles.featureText}>Progress tracking & more!</Text>
              </View>
            </View>

            <View style={styles.notificationBox}>
              <Text style={styles.notificationText}>
                We have your email <Text style={styles.email}>{user?.email}</Text> saved in our list. You'll be notified as soon as the new version is released!
              </Text>
            </View>

            <LoggoutButton />
          </View>

          <Text style={styles.footer}>
            Stay tuned for updates
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 55,
    height: 55,
  },
  iconContainer: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textLight,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: 0,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: spacing.xl,
  },
  message: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  userName: {
    color: colors.primary,
    fontWeight: '700',
  },
  description: {
    ...typography.body,
    color: colors.textLight,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  featuresContainer: {
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginRight: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: colors.textLight,
  },
  notificationBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
    marginBottom: spacing.xl
  },
  notificationText: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
  email: {
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
