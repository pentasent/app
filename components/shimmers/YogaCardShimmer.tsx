import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { ImageIcon } from 'lucide-react-native';

export const YogaCardShimmer = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
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
    }, [opacity]);

    return (
        <Animated.View style={[styles.card, { opacity }]}>
            <View style={styles.cardImageContainer}>
                <ImageIcon size={40} color={colors.textMuted} opacity={0.5} />
            </View>

            <View style={styles.cardContent}>
                <View style={styles.cardTitle} />
                <View style={styles.cardDescription} />

                <View style={styles.statsRow}>
                    <View style={styles.statItem} />
                    <View style={styles.statDivider} />
                    <View style={styles.statItem} />
                    <View style={styles.statDivider} />
                    <View style={styles.statItem} />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background,
        overflow: 'hidden',
        marginVertical: 10,
    },
    cardImageContainer: {
        height: 200,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        paddingTop: 8,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    cardTitle: {
        width: '60%',
        height: 20,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 6,
    },
    cardDescription: {
        width: '100%',
        height: 14,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        width: 60,
        height: 14,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
    statDivider: {
        width: 1,
        height: 12,
        backgroundColor: colors.borderLight,
        marginHorizontal: spacing.sm,
    },
});
