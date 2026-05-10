import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring, 
    withDelay 
} from 'react-native-reanimated';
import { colors, spacing } from '../../constants/theme';
import { MOODS, MoodConfig } from '../../constants/moods';
import { MoodIcon } from '../moods/MoodIcon';

interface MoodSquareProps {
    mood: MoodConfig;
    selected: boolean;
    onPress: () => void;
    size?: number;
}

export const MoodSquare = React.memo(({ 
    mood, 
    selected, 
    onPress,
    size = 100 
}: MoodSquareProps) => {
    // Entry animation
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(15);

    React.useEffect(() => {
        const index = MOODS.findIndex(m => m.tag === mood.tag);
        opacity.value = withDelay(index * 40, withTiming(1, { duration: 400 }));
        translateY.value = withDelay(index * 40, withSpring(0, { damping: 20, stiffness: 90 }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }]
    }));

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                style={[
                    styles.container,
                    { width: size, height: size * 1.12 },
                    selected && { 
                        backgroundColor: mood.color + '18',
                        borderColor: mood.color + '40',
                        borderWidth: 1.5,
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={styles.iconWrapper}>
                    <MoodIcon 
                        tag={mood.tag} 
                        color={mood.color} 
                        selected={selected} 
                        size={size * 0.58} 
                    />
                </View>
                
                <Text style={[
                    styles.label, 
                    { fontSize: size * 0.115 },
                    selected && { color: mood.color, fontWeight: '900' }
                ]}>
                    {mood.label}
                </Text>
                
                {selected && (
                    <View style={[styles.activeDot, { backgroundColor: mood.color }]} />
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}, (prev, next) => prev.selected === next.selected && prev.mood.tag === next.mood.tag);

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 24, // Rounder for softer feel
        borderWidth: 1,
        borderColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        paddingVertical: spacing.md,
    },
    iconWrapper: {
        marginBottom: 8,
    },
    label: {
        color: colors.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activeDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 6,
        height: 6,
        borderRadius: 3,
    }
});
