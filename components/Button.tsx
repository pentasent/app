import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'web-primary';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'web-primary' && styles.webPrimaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'outline' && styles.outlineButton,
        variant === 'ghost' && styles.ghostButton,
        isDisabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'web-primary'
              ? '#ffffff'
              : colors.primary
          }
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && styles.primaryButtonText,
            variant === 'web-primary' && styles.webPrimaryButtonText,
            variant === 'secondary' && styles.secondaryButtonText,
            variant === 'outline' && styles.outlineButtonText,
            variant === 'ghost' && styles.ghostButtonText,
            isDisabled && styles.disabledButtonText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm,   // was md
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,                 // was 50
    ...shadows.small,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  webPrimaryButton: {
    backgroundColor: '#3d2f4d',
    // borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    minHeight: 0,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  disabledButton: {
    backgroundColor: colors.borderLight,
    borderColor: colors.disabled,
  },
  buttonText: {
    ...typography.button,
    color: colors.surface,
  },
  primaryButtonText: {
    color: colors.surface,
  },
  webPrimaryButtonText: {
    color: colors.surface,
    fontWeight: '500',
  },
  secondaryButtonText: {
    color: colors.surface,
  },
  outlineButtonText: {
    color: colors.primary,
  },
  ghostButtonText: {
    color: colors.websiteSubtitle,
  },
  disabledButtonText: {
    color: colors.disabledText,
  },
});
