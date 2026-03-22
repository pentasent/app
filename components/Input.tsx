import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean; 
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  containerStyle?: object;
}

export const Input: React.FC<InputProps> = ({
  label,
  required,
  error,
  leftAccessory,
  rightAccessory,
  style,
  containerStyle,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {/* {label && <Text style={styles.label}>{label}</Text>} */}
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {leftAccessory && <View style={styles.leftAccessory}>{leftAccessory}</View>}
        <TextInput
          style={[styles.inputElement, style]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
        {rightAccessory && <View style={styles.rightAccessory}>{rightAccessory}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 56, 
  },
  inputElement: {
    flex: 1,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
  },
  leftAccessory: {
    marginRight: spacing.sm,
  },
  rightAccessory: {
    marginLeft: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
