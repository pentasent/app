import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export const OnboardingCommunityShimmer = () => {
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
            <View style={styles.logo} />
            <View style={styles.info}>
                <View style={styles.nameShimmer} />
                <View style={styles.descShimmer} />
                <View style={styles.metaShimmer} />
            </View>
            <View style={styles.checkbox} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: borderRadius.md,
        backgroundColor: colors.border,
        marginRight: spacing.md,
    },
    info: {
        flex: 1,
        marginRight: spacing.md,
    },
    nameShimmer: {
        width: '60%',
        height: 18,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 8,
    },
    descShimmer: {
        width: '90%',
        height: 14,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 8,
    },
    metaShimmer: {
        width: '40%',
        height: 14,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.border,
    },
});
