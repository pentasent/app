import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

export const BeatTagShimmer = () => {
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
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
            scrollEnabled={false}
        >
            {[1, 2, 3, 4].map((i) => (
                <Animated.View key={i} style={[styles.tagCard, { opacity }]}>
                    <View style={styles.gradientPlaceholder}>
                        <View style={styles.textLarge} />
                        <View style={styles.textSmall} />
                    </View>
                </Animated.View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    tagCard: {
        width: 140,
        height: 70,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.borderLight,
        overflow: 'hidden',
    },
    gradientPlaceholder: {
        flex: 1,
        padding: spacing.sm,
        justifyContent: 'flex-end',
    },
    textLarge: {
        width: 80,
        height: 14,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 6,
    },
    textSmall: {
        width: 50,
        height: 10,
        backgroundColor: colors.border,
        borderRadius: 4,
    }
});
