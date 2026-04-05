import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { ImageIcon } from 'lucide-react-native';

export const ArticleCardShimmer = () => {
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
            <View style={styles.imageContainer}>
                <View style={[styles.bannerImage, styles.placeholderBg]}>
                    <ImageIcon size={48} color={colors.textMuted} opacity={0.3} />
                </View>
            </View>

            <View style={styles.cardInfo}>
                <View style={styles.badgeRowShimmer}>
                    <View style={styles.tagBadgeShimmer} />
                    <View style={styles.badgeDividerShimmer} />
                    <View style={styles.readTimeBadgeShimmer} />
                </View>

                <View style={styles.titleShimmer} />
                <View style={[styles.titleShimmer, { width: '60%', marginTop: 8 }]} />
                
                <View style={styles.descShimmer} />
                <View style={[styles.descShimmer, { width: '80%', marginTop: 6 }]} />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background,
        marginBottom: spacing.lg,
    },
    imageContainer: {
        width: '100%',
        height: 220,
        position: 'relative',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderBg: {
        backgroundColor: colors.borderLight,
    },
    badgeRowShimmer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    badgeDividerShimmer: {
        width: 1,
        height: 10,
        backgroundColor: colors.border,
    },
    tagBadgeShimmer: {
        width: 60,
        height: 14,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    readTimeBadgeShimmer: {
        width: 50,
        height: 14,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    cardInfo: {
        padding: spacing.md,
    },
    titleShimmer: {
        width: '90%',
        height: 24,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
    descShimmer: {
        width: '100%',
        height: 14,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginTop: 12,
    },
});
