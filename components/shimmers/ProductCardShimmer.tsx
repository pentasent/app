import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { ImageIcon } from 'lucide-react-native';

export const ProductCardShimmer = () => {
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
            <View style={styles.productImage}>
                <ImageIcon size={28} color={colors.textMuted} opacity={0.5} />
            </View>

            <View style={styles.contentColumn}>
                <View style={[styles.categoryBadge, { width: 60, height: 18 }]} />

                <View style={[styles.titleText, { width: '80%', height: 18 }]} />
                <View style={[styles.titleText, { width: '50%', height: 18, marginBottom: 12 }]} />

                <View style={[styles.bodyText, { width: '100%', height: 14 }]} />
                <View style={[styles.bodyText, { width: '70%', height: 14, marginBottom: 16 }]} />

                <View style={styles.metaRow}>
                    <View style={[styles.viewCountContainer, { width: 40, height: 20 }]} />
                    <View style={{ flex: 1 }} />
                    <View style={[styles.shopButton, { width: 80, height: 26 }]} />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        padding: 0,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
    },
    productImage: {
        width: 100,
        height: '100%',
        minHeight: 120,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentColumn: {
        flex: 1,
        padding: spacing.md,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 8,
    },
    titleText: {
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 6,
    },
    bodyText: {
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 'auto',
    },
    viewCountContainer: {
        backgroundColor: colors.border,
        borderRadius: 4,
    },
    shopButton: {
        backgroundColor: colors.border,
        borderRadius: 6,
    },
});
