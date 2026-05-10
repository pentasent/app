import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { Sparkles } from 'lucide-react-native';

export const MayaMessageShimmer = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.6,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [opacity]);

    return (
        <View style={styles.container}>
            <View style={styles.avatar}>
                 <Sparkles size={16} color={colors.primary} fill={colors.primary} />
            </View>
            <Animated.View style={[styles.bubble, { opacity }]}>
                <View style={styles.lineLong} />
                <View style={styles.lineMedium} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 20,
        paddingHorizontal: spacing.md,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    bubble: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.borderLight,
        width: '60%',
        gap: 8,
    },
    lineLong: {
        width: '100%',
        height: 12,
        backgroundColor: colors.borderLight,
        borderRadius: 6,
    },
    lineMedium: {
        width: '60%',
        height: 12,
        backgroundColor: colors.borderLight,
        borderRadius: 6,
    }
});
