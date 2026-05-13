import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

export const PulseShimmer = () => {
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
        <Animated.View style={[styles.container, { opacity }]}>
            {/* Pills Row */}
            <View style={styles.pillsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={styles.pillContainer}>
                        <View style={styles.pillTextSmall} />
                        <View style={styles.pillTextLarge} />
                        <View style={styles.pillCircle} />
                    </View>
                ))}
            </View>

            {/* Today Card */}
            <View style={styles.todayCard}>
                <View style={[styles.shimmerLine, { width: '40%', marginBottom: 20 }]} />
                <View style={styles.statsRow}>
                    <View style={styles.statPlaceholder} />
                    <View style={styles.statPlaceholder} />
                    <View style={styles.statPlaceholder} />
                </View>
                <View style={[styles.shimmerLine, { width: '90%', height: 40, marginTop: 15, borderRadius: 12 }]} />
            </View>

            {/* Analytics Header */}
            <View style={styles.sectionHeader} />
            <View style={styles.graphsList}>
                {[1, 2].map((i) => (
                    <View key={i} style={styles.graphCard}>
                        <View style={styles.graphHeaderShimmer} />
                        <View style={styles.barsRow}>
                            {[1, 2, 3, 4, 5, 6, 7].map(b => (
                                <View key={b} style={styles.barShimmer} />
                            ))}
                        </View>
                    </View>
                ))}
            </View>

            {/* Insights */}
            <View style={styles.sectionHeader} />
            <View style={styles.insightsCard}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={styles.insightRow}>
                        <View style={styles.dotShimmer} />
                        <View style={[styles.shimmerLine, { width: '85%' }]} />
                    </View>
                ))}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: spacing.sm,
    },
    pillsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: spacing.lg,
    },
    pillContainer: {
        alignItems: 'center',
        width: (width - (spacing.lg * 2) - (spacing.sm * 4)) / 5,
    },
    pillTextSmall: {
        width: 20,
        height: 10,
        backgroundColor: colors.border + "80",
        borderRadius: 4,
        marginBottom: 4,
    },
    pillTextLarge: {
        width: 28,
        height: 14,
        backgroundColor: colors.border + "90",
        borderRadius: 4,
        marginBottom: 10,
    },
    pillCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.border,
    },
    todayCard: {
        height: 160, 
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.xl,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statPlaceholder: {
        width: '30%',
        height: 32,
        backgroundColor: colors.border,
        borderRadius: 8,
    },
    shimmerLine: {
        height: 10,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
    sectionHeader: {
        width: 140,
        height: 18,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: spacing.md,
    },
    graphsList: {
        marginBottom: spacing.xl,
    },
    graphCard: {
        height: 180, // Match actual graph card height
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    graphHeaderShimmer: {
        width: 100,
        height: 12,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 30, // More breathing room like actual header
    },
    barsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20, // Add some padding to match container
        flex: 1,
    },
    barShimmer: {
        width: 6, // Match actual bar width
        height: 80, // Match actual bar height
        backgroundColor: colors.border,
        borderRadius: 3,
    },
    insightsCard: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.xxl,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dotShimmer: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.border,
        marginRight: 10,
    }
});
