import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export const JournalCardShimmer = () => {
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
            <View style={styles.dateColumn}>
                <View style={{ width: 24, height: 20, backgroundColor: colors.border, borderRadius: 4, marginBottom: 4 }} />
                <View style={{ width: 28, height: 12, backgroundColor: colors.border, borderRadius: 4 }} />
            </View>

            <View style={styles.contentColumn}>
                <View style={styles.headerRow}>
                    <View style={{ width: '60%', height: 18, backgroundColor: colors.border, borderRadius: 4 }} />
                </View>
                <View style={{ width: '100%', height: 14, backgroundColor: colors.border, borderRadius: 4, marginBottom: 4 }} />
                <View style={{ width: '40%', height: 14, backgroundColor: colors.border, borderRadius: 4 }} />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        paddingRight: spacing.sm,
        alignItems: 'center',
    },
    dateColumn: {
        alignItems: 'center',
        marginRight: spacing.md,
        backgroundColor: colors.borderLight,
        padding: 10,
        borderRadius: 10,
        width: 52,
        height: 56,
        justifyContent: 'center',
    },
    contentColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
});
