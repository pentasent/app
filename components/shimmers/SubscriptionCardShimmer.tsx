import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export const SubscriptionCardShimmer = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.6,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 1200,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [opacity]);

    return (
        <View style={styles.card}>
            <Animated.View style={{ opacity }}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        {/* Icon placeholder */}
                        <View style={styles.iconPlaceholder} />
                        <View>
                            {/* Plan Name */}
                            <View style={styles.titlePlaceholder} />
                            {/* Price placeholder */}
                            <View style={styles.pricePlaceholder} />
                        </View>
                    </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBody}>
                    {/* Description 2 lines */}
                    <View style={styles.descPlaceholder1} />
                    <View style={styles.descPlaceholder2} />
                    
                    {/* Features list 3-4 items */}
                    <View style={styles.featuresList}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={styles.featureItem}>
                                <View style={styles.featureIconPlaceholder} />
                                <View style={styles.featureTextPlaceholder} />
                            </View>
                        ))}
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    cardHeader: {
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.borderLight,
        marginRight: spacing.md,
    },
    titlePlaceholder: {
        width: 80,
        height: 18,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 6,
    },
    pricePlaceholder: {
        width: 120,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    cardDivider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginHorizontal: spacing.md,
    },
    cardBody: {
        padding: spacing.md,
    },
    descPlaceholder1: {
        width: '90%',
        height: 12,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
        marginBottom: 8,
    },
    descPlaceholder2: {
        width: '60%',
        height: 12,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
        marginBottom: spacing.lg,
    },
    featuresList: {
        gap: 14,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureIconPlaceholder: {
        width: 14,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    featureTextPlaceholder: {
        width: '70%',
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
});
