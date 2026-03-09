import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export const CommunityDetailShimmer = () => {
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
        <Animated.View style={{ opacity, marginTop: spacing.xl }}>
            {/* General Info Skeleton */}
            {/* <View style={{ width: 120, height: 20, backgroundColor: colors.border, borderRadius: 4, marginBottom: spacing.md }} />
            <View style={styles.infoGrid}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <View key={i} style={styles.infoItem}>
                        <View style={{ width: 60, height: 12, backgroundColor: colors.border, borderRadius: 4, marginBottom: 6 }} />
                        <View style={{ width: 80, height: 14, backgroundColor: colors.border, borderRadius: 4 }} />
                    </View>
                ))}
            </View> */}

            {/* Moderators Skeleton */}
            <View style={{ width: 180, height: 20, backgroundColor: colors.border, borderRadius: 4, marginTop: spacing.xl, marginBottom: spacing.md }} />
            <View style={{ gap: spacing.md }}>
                <View style={[styles.moderatorCard]}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, marginRight: spacing.md }} />
                    <View style={{ flex: 1 }}>
                        <View style={{ width: 100, height: 14, backgroundColor: colors.border, borderRadius: 4, marginBottom: 6 }} />
                        <View style={{ width: 140, height: 12, backgroundColor: colors.border, borderRadius: 4 }} />
                    </View>
                </View>
            </View>

            {/* Channels Skeleton */}
            <View style={{ width: 100, height: 20, backgroundColor: colors.border, borderRadius: 4, marginTop: spacing.xl, marginBottom: spacing.md }} />
            <View style={styles.channelsList}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <View key={i} style={[styles.channelItem, i === 2 && { borderBottomWidth: 0 }]}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border, marginRight: spacing.md }} />
                        <View style={{ flex: 1 }}>
                            <View style={{ width: 120, height: 16, backgroundColor: colors.border, borderRadius: 4, marginBottom: 6 }} />
                            <View style={{ width: 80, height: 12, backgroundColor: colors.border, borderRadius: 4 }} />
                        </View>
                    </View>
                ))}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    infoItem: {
        width: '45%',
        marginBottom: spacing.sm,
    },
    moderatorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    channelsList: {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
});
