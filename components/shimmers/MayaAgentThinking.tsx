import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Sparkles } from 'lucide-react-native';

const THINKING_LOGS = [
  "Taking a moment to understand you...",
  "Listening to what you're feeling...",
  "Gently reflecting on your thoughts...",
  "Finding the right words for you...",
  "Holding space for your experience...",
  "Putting together something helpful...",
  "Almost ready for you..."
];

export const MayaAgentThinking = () => {
    const [logIndex, setLogIndex] = useState(0);
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const logInterval = setInterval(() => {
            setLogIndex((prev) => (prev + 1) % THINKING_LOGS.length);
        }, 2500);

        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();

        return () => clearInterval(logInterval);
    }, [opacity]);

    return (
        <View style={styles.container}>
            <View style={styles.avatar}>
                 <Sparkles size={16} color={colors.primary} fill={colors.primary} />
            </View>
            <View style={styles.bubble}>
                <View style={styles.header}>
                    <Text style={styles.agentTitle}>Maya AI</Text>
                </View>
                <Animated.View style={{ opacity }}>
                    <Text style={styles.logText}>{THINKING_LOGS[logIndex]}</Text>
                </Animated.View>
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressBar, { width: `${(logIndex + 1) * (100 / THINKING_LOGS.length)}%` as any }]} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 20,
        paddingHorizontal: spacing.md,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    bubble: {
        backgroundColor: colors.surface,
        padding: 14,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.borderLight,
        width: '75%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    agentTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    logText: {
        fontSize: 14,
        color: colors.textLight,
        fontStyle: 'italic',
        marginBottom: 10,
    },
    progressTrack: {
        height: 2,
        backgroundColor: colors.borderLight,
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    spin: {
        // We could animate rotation here if needed
    }
});
