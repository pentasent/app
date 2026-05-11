import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertCircle, RotateCcw } from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';
import * as Updates from 'expo-updates';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const handleReload = async () => {
      try {
          await Updates.reloadAsync();
      } catch (e) {
          resetErrorBoundary();
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertCircle size={48} color={colors.error} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          We've encountered an unexpected error. Don't worry, your data is safe.
        </Text>
        
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Error Details:</Text>
          <Text style={styles.errorText} numberOfLines={3}>
            {error instanceof Error ? error.message : String(error)}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleReload}
          activeOpacity={0.8}
        >
          <RotateCcw size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Restart Pentasent</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={resetErrorBoundary}
        >
          <Text style={styles.secondaryButtonText}>Try to Recover</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Any cleanup logic on reset
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  errorBox: {
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.error,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    padding: spacing.md,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
