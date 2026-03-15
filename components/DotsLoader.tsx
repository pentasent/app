import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence,
    withDelay
} from 'react-native-reanimated';

interface DotsLoaderProps {
    color?: string;
    size?: number;
    gap?: number;
}

export const DotsLoader = ({ color = '#000', size = 6, gap = 4 }: DotsLoaderProps) => {
    const Dot = ({ delay }: { delay: number }) => {
        const opacity = useSharedValue(0.3);
        
        useEffect(() => {
            opacity.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 400 }),
                        withTiming(0.3, { duration: 400 })
                    ),
                    -1,
                    true
                )
            );
        }, [delay]);

        const animatedStyle = useAnimatedStyle(() => ({
            opacity: opacity.value,
            transform: [{ scale: opacity.value }]
        }));

        return (
            <Animated.View 
                style={[
                    styles.dot, 
                    { 
                        backgroundColor: color, 
                        width: size, 
                        height: size, 
                        borderRadius: size / 2,
                        marginRight: gap 
                    }, 
                    animatedStyle
                ]} 
            />
        );
    };

    return (
        <View style={styles.container}>
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        // dynamic styles
    }
});
