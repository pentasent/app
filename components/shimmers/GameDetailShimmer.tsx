import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

export const GameStatsShimmer = () => {
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
        <Animated.View style={[styles.statsRow, { opacity }]}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.statItem}>
                    <View style={{ width: 60, height: 12, backgroundColor: colors.border, borderRadius: 4, marginBottom: 8 }} />
                    <View style={{ width: 40, height: 26, backgroundColor: colors.border, borderRadius: 4 }} />
                </View>
            ))}
        </Animated.View>
    );
};

export const GameStreakShimmer = () => {
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
        <Animated.View style={[styles.streakWrapper, { opacity }]}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <View key={i} style={styles.streakDay}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.border }} />
                    <View style={{ width: 12, height: 10, backgroundColor: colors.border, borderRadius: 2, marginTop: 8 }} />
                </View>
            ))}
        </Animated.View>
    );
};

export const GameLeaderboardShimmer = () => {
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
        <Animated.View style={[styles.leaderboardWrapper, { opacity }]}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.lbItem}>
                    <View style={{ width: 20, height: 14, backgroundColor: colors.border, borderRadius: 4, marginRight: 10 }} />
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <View style={{ width: '60%', height: 16, backgroundColor: colors.border, borderRadius: 4 }} />
                    </View>
                    <View style={{ width: 40, height: 16, backgroundColor: colors.border, borderRadius: 4 }} />
                </View>
            ))}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    streakWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    streakDay: {
        alignItems: 'center',
        gap: 8,
    },
    leaderboardWrapper: {
        gap: spacing.md,
    },
    lbItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
});
