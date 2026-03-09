import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 20;

const Particle = ({ index }: { index: number }) => {
    const translateY = useSharedValue(-50);
    const translateX = useSharedValue(Math.random() * width);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(Math.random() * 0.5 + 0.5);

    const duration = 4000 + Math.random() * 3000;
    const delay = Math.random() * 2000;

    useEffect(() => {
        translateY.value = withDelay(
            delay,
            withRepeat(
                withTiming(height / 2, {
                    duration: duration,
                    easing: Easing.linear,
                }),
                -1,
                false
            )
        );

        opacity.value = withDelay(
            delay,
            withRepeat(
                withTiming(0, {
                    duration: duration,
                    easing: Easing.bezier(0.42, 0, 0.58, 1), // ease-in-out
                }),
                -1,
                false
            )
        );
        // Fade in initially
        opacity.value = withDelay(
            delay,
            withRepeat(
                withTiming(0.6, { duration: duration * 0.2 }),
                -1,
                true
            )
        );

        // Drift slightly
        translateX.value = withDelay(
            delay,
            withRepeat(
                withTiming(translateX.value + (Math.random() - 0.5) * 50, { duration: duration, easing: Easing.linear }),
                -1,
                true
            )
        )

        return () => {
            cancelAnimation(translateY);
            cancelAnimation(opacity);
            cancelAnimation(translateX);
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: translateY.value },
                { translateX: translateX.value },
                { scale: scale.value },
            ],
            opacity: opacity.value,
        };
    });

    return <Animated.View style={[styles.particle, animatedStyle]} />;
};

export const ParticleBackground = () => {
    // Generate particles
    const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} index={i} />
    ));

    return (
        <View style={styles.container} pointerEvents="none">
            {particles}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 50, // Start slightly below top
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        height: 300, // Limit height to header area mostly
        zIndex: 0,
    },
    particle: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary, // Or white if on dark bg, but user said light theme
        top: 0,
        left: 0, // Position controlled by animated style
    },
});
