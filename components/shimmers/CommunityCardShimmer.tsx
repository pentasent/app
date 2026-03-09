import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { ImageIcon } from 'lucide-react-native';

export const CommunityCardShimmer = () => {
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
            <View style={styles.cardBannerContainer}>
                <View style={[styles.cardBanner, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                    <ImageIcon size={40} color={colors.textMuted} opacity={0.5} />
                </View>
                <View style={styles.cardLogoContainer}>
                    <View style={[styles.cardLogo, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                        <ImageIcon size={20} color={colors.textMuted} opacity={0.5} />
                    </View>
                </View>
                <View style={styles.badgeContainer}>
                    <View style={{ width: 60, height: 20, borderRadius: 12, backgroundColor: colors.border }} />
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                    <View style={{ width: '60%', height: 18, backgroundColor: colors.border, borderRadius: 4 }} />
                </View>

                <View style={{ width: '90%', height: 14, backgroundColor: colors.border, borderRadius: 4, marginTop: 8 }} />
                <View style={{ width: '70%', height: 14, backgroundColor: colors.border, borderRadius: 4, marginTop: 6 }} />

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <View style={{ width: 14, height: 14, backgroundColor: colors.border, borderRadius: 2 }} />
                        <View style={{ width: 60, height: 12, backgroundColor: colors.border, borderRadius: 2 }} />
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <View style={{ width: 14, height: 14, backgroundColor: colors.border, borderRadius: 2 }} />
                        <View style={{ width: 60, height: 12, backgroundColor: colors.border, borderRadius: 2 }} />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background,
        overflow: 'hidden',
        marginVertical: 10
    },
    cardBannerContainer: {
        height: 200,
        position: 'relative',
    },
    cardBanner: {
        width: '100%',
        height: '100%',
    },
    cardLogoContainer: {
        position: 'absolute',
        bottom: -20,
        left: spacing.md,
        padding: 2,
        backgroundColor: colors.surface,
        borderRadius: 14,
    },
    cardLogo: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    badgeContainer: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    },
    cardContent: {
        paddingTop: 28,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        height: 12,
        backgroundColor: colors.border,
        marginHorizontal: spacing.sm,
    },
});
