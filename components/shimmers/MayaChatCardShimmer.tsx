import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export const MayaChatCardShimmer = () => {
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
                <View style={{ width: 32, height: 10, backgroundColor: colors.border, borderRadius: 3 }} />
            </View>

            <View style={styles.contentColumn}>
                <View style={styles.titleShimmer} />
                <View style={styles.metaRow}>
                    <View style={styles.iconShimmer} />
                    <View style={styles.dateShimmer} />
                    <View style={styles.dot} />
                    <View style={styles.countShimmer} />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    dateColumn: {
        alignItems: 'center',
        marginRight: spacing.md,
        backgroundColor: colors.card,
        padding: 10,
        borderRadius: 12,
        width: 52,
        height: 56,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    contentColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    titleShimmer: {
        width: '65%',
        height: 18,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    iconShimmer: {
        width: 12,
        height: 12,
        backgroundColor: colors.border,
        borderRadius: 2,
    },
    dateShimmer: {
        width: 80,
        height: 12,
        backgroundColor: colors.border,
        borderRadius: 3,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.border,
    },
    countShimmer: {
        width: 40,
        height: 12,
        backgroundColor: colors.border,
        borderRadius: 3,
    }
});
