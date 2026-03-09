import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export const BeatCardShimmer = () => {
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
            <View style={[styles.imageContainer, { backgroundColor: colors.border }]} />

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <View style={{ width: '70%', height: 16, backgroundColor: colors.border, borderRadius: 4 }} />
                </View>

                <View style={{ width: '90%', height: 13, backgroundColor: colors.border, borderRadius: 4, marginBottom: 4, marginTop: 4 }} />

                <View style={styles.footer}>
                    {/* Tag Chip Placeholder */}
                    <View style={{ width: 60, height: 18, backgroundColor: colors.border, borderRadius: borderRadius.full }} />

                    {/* Stats Placeholder */}
                    <View style={styles.stats}>
                        <View style={{ width: 12, height: 12, backgroundColor: colors.border, borderRadius: 2 }} />
                        <View style={{ width: 40, height: 11, backgroundColor: colors.border, borderRadius: 2 }} />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'transparent',
        marginBottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    imageContainer: {
        width: 80,
        height: 60,
        borderRadius: borderRadius.sm,
    },
    content: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});
