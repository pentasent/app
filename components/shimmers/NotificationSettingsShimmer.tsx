import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, SafeAreaView } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

export const NotificationSettingsShimmer = () => {
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

    const ShimmerRow = () => (
        <View style={styles.settingRow}>
            <View style={styles.textShimmer} />
            <View style={styles.togglesContainer}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.toggleItem}>
                        <View style={styles.iconShimmer} />
                        <View style={styles.switchShimmer} />
                    </View>
                ))}
            </View>
        </View>
    );

    const ShimmerSection = () => (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <View style={styles.categoryIconShimmer} />
                <View style={styles.categoryTitleShimmer} />
            </View>
            <ShimmerRow />
            <View style={styles.rowDivider} />
            <ShimmerRow />
        </View>
    );

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <ShimmerSection />
                <ShimmerSection />
                <ShimmerSection />
            </ScrollView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    sectionContainer: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        ...shadows.small,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    categoryIconShimmer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.borderLight,
        marginRight: spacing.sm,
    },
    categoryTitleShimmer: {
        width: 100,
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
    },
    textShimmer: {
        width: '40%',
        height: 15,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    togglesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    toggleItem: {
        alignItems: 'center',
        gap: 12,
    },
    iconShimmer: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.borderLight,
    },
    switchShimmer: {
        width: 40,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.borderLight,
    },
    rowDivider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: 4,
    },
});
