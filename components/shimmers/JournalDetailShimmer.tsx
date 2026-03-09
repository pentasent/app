import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export const JournalDetailShimmer = () => {
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
        <Animated.View style={[styles.scrollContent, { flex: 1, backgroundColor: colors.background, opacity }]}>
            {/* View Mode Data */}
            <View style={styles.viewHeader}>
                <View style={styles.dateShimmer} />
                <View style={styles.moodChipShimmer} />
            </View>

            <View style={styles.viewTitleShimmer} />

            <View style={styles.contentLinesContainer}>
                <View style={styles.viewContentLineLong} />
                <View style={styles.viewContentLineMedium} />
                <View style={styles.viewContentLineFull} />
                <View style={styles.viewContentLineShort} />
                <View style={styles.viewContentLineMedium} />
                <View style={styles.viewContentLineLong} />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        padding: spacing.lg,
    },
    viewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    dateShimmer: {
        width: 100,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.sm,
    },
    moodChipShimmer: {
        width: 90,
        height: 28,
        backgroundColor: colors.borderLight,
        borderRadius: 16,
    },
    viewTitleShimmer: {
        width: '70%',
        height: 28,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.md,
    },
    contentLinesContainer: {
        gap: 12,
        marginTop: spacing.sm,
    },
    viewContentLineLong: {
        width: '90%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.sm,
    },
    viewContentLineMedium: {
        width: '75%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.sm,
    },
    viewContentLineFull: {
        width: '100%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.sm,
    },
    viewContentLineShort: {
        width: '40%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.sm,
    },
});
