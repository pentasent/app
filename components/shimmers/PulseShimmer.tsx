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
            <View style={styles.todayCardShadow}>
                <View style={styles.todayCard} />
            </View>

            {/* Analytics Grid/List */}
            <View style={styles.sectionHeader} />
            <View style={styles.graphsList}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.graphCard} />
                ))}
            </View>

            {/* Insights */}
            <View style={styles.sectionHeader} />
            <View style={styles.insightsCard} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        // Removed paddingHorizontal because it's handled by the parent ScrollView in pulse/index.tsx
    },
    pillsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: spacing.lg,
        // Match the pills alignment precisely
    },
    pillContainer: {
        alignItems: 'center',
        padding: spacing.xs,
        width: (width - (spacing.lg * 2) - (spacing.sm * 4)) / 5,
    },
    pillTextSmall: {
        width: 24,
        height: 10,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 4,
    },
    pillTextLarge: {
        width: 32,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 10,
    },
    pillCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.borderLight,
    },
    todayCardShadow: {
        marginBottom: spacing.xl,
    },
    todayCard: {
        height: 140, // Match the height of a filled today card
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
    },
    sectionHeader: {
        width: 160,
        height: 22,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: spacing.md,
        marginTop: spacing.md,
    },
    graphsList: {
        marginBottom: spacing.xl,
    },
    graphCard: {
        height: 180,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    insightsCard: {
        height: 200,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.xxl,
    }
});
