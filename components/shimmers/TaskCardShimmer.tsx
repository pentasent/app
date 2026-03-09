import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export const TaskCardShimmer = () => {
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
            <View style={styles.checkboxShimmer} />

            <View style={styles.contentColumn}>
                <View style={styles.titleShimmer} />
                <View style={styles.bodyShimmer} />

                <View style={styles.metaRow}>
                    <View style={styles.badgeShimmer} />
                    <View style={styles.dateShimmer} />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.sm,
    },
    checkboxShimmer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.borderLight,
        marginRight: spacing.sm,
    },
    contentColumn: {
        flex: 1,
        gap: 8,
    },
    titleShimmer: {
        width: '60%',
        height: 18,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    bodyShimmer: {
        width: '80%',
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    badgeShimmer: {
        width: 48,
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    dateShimmer: {
        width: 60,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
});
