import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ShimmerBox = ({ style, translateX }: { style: any, translateX: Animated.Value }) => (
    <View style={[style, { backgroundColor: colors.border, overflow: 'hidden' }]}>
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                {
                    transform: [{ translateX }],
                },
            ]}
        >
            <LinearGradient
                colors={[colors.border, '#FFFFFF', colors.border]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    </View>
);

export const BeatCardShimmer = () => {
    const translateX = useRef(new Animated.Value(-width)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(translateX, {
                toValue: width,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [translateX]);

    return (
        <View style={styles.card}>
            <ShimmerBox style={styles.imageContainer} translateX={translateX} />

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <ShimmerBox style={{ width: '70%', height: 16, borderRadius: 4 }} translateX={translateX} />
                </View>

                <ShimmerBox style={{ width: '90%', height: 13, borderRadius: 4, marginBottom: 4, marginTop: 4 }} translateX={translateX} />

                <View style={styles.footer}>
                    {/* Tag Chip Placeholder */}
                    <ShimmerBox style={{ width: 60, height: 18, borderRadius: borderRadius.full }} translateX={translateX} />

                    {/* Stats Placeholder */}
                    <View style={styles.stats}>
                        <ShimmerBox style={{ width: 12, height: 12, borderRadius: 2 }} translateX={translateX} />
                        <ShimmerBox style={{ width: 40, height: 11, borderRadius: 2 }} translateX={translateX} />
                    </View>
                </View>
            </View>
        </View>
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
