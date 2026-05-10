import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    useSharedValue, 
    interpolateColor,
    interpolate,
    useAnimatedProps,
    withTiming
} from 'react-native-reanimated';
import { MoodTag } from '../../constants/moods';

interface MoodIconProps {
    tag: MoodTag;
    color: string;
    selected: boolean;
    size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export const MoodIcon = React.memo(({ 
    tag, 
    color = '#BDBDBD', 
    selected = false, 
    size = 60 
}: MoodIconProps) => {
    const selectValue = useSharedValue(selected ? 1 : 0);

    useEffect(() => {
        if (selected) {
            selectValue.value = withSpring(1, {
                damping: 15,
                stiffness: 90,
                mass: 0.5
            });
        } else {
            selectValue.value = withTiming(0, { duration: 200 });
        }
    }, [selected]);

    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: interpolate(selectValue.value, [0, 1], [1, 1.18], 'clamp') }
            ]
        };
    });

    const animatedShellProps = useAnimatedProps(() => {
        return {
            fillOpacity: interpolate(selectValue.value, [0, 1], [0.08, 1], 'clamp'),
            strokeOpacity: interpolate(selectValue.value, [0, 1], [0.15, 0], 'clamp'),
            r: interpolate(selectValue.value, [0, 1], [size * 0.42, size * 0.45], 'clamp'),
        };
    });

    const animatedPathProps = useAnimatedProps(() => {
        return {
            stroke: interpolateColor(
                selectValue.value,
                [0, 1],
                [color, 'white']
            ),
            strokeWidth: interpolate(selectValue.value, [0, 1], [size * 0.05, size * 0.08], 'clamp'),
            opacity: interpolate(selectValue.value, [0, 1], [0.8, 1], 'clamp'),
        };
    });

    const getExpression = () => {
        const center = size / 2;
        const eyeY = size * 0.42;
        const eyeSpacing = size * 0.18;
        
        const mouthW = size * 0.35;
        const mouthY = size * 0.65;
        const mouthX = center - mouthW / 2;

        switch (tag) {
            case 'happy':
                return (
                    <>
                        <AnimatedPath d={`M ${center - eyeSpacing} ${eyeY} Q ${center - eyeSpacing/2} ${eyeY - size*0.08} ${center - eyeSpacing/4} ${eyeY}`} animatedProps={animatedPathProps} fill="none" />
                        <AnimatedPath d={`M ${center + eyeSpacing/4} ${eyeY} Q ${center + eyeSpacing/2} ${eyeY - size*0.08} ${center + eyeSpacing} ${eyeY}`} animatedProps={animatedPathProps} fill="none" />
                        <AnimatedPath d={`M ${mouthX} ${mouthY} Q ${center} ${mouthY + size * 0.18} ${mouthX + mouthW} ${mouthY}`} animatedProps={animatedPathProps} fill="none" />
                    </>
                );
            case 'calm':
                return (
                    <>
                        <AnimatedPath d={`M ${center - eyeSpacing} ${eyeY} L ${center - eyeSpacing/3} ${eyeY}`} animatedProps={animatedPathProps} />
                        <AnimatedPath d={`M ${center + eyeSpacing/3} ${eyeY} L ${center + eyeSpacing} ${eyeY}`} animatedProps={animatedPathProps} />
                        <AnimatedPath d={`M ${mouthX + mouthW*0.2} ${mouthY} Q ${center} ${mouthY + size * 0.05} ${mouthX + mouthW*0.8} ${mouthY}`} animatedProps={animatedPathProps} fill="none" />
                    </>
                );
            case 'neutral':
                return (
                    <>
                        <AnimatedCircle cx={center - eyeSpacing/1.5} cy={eyeY} r={size * 0.04} fill={selected ? 'white' : color} animatedProps={animatedPathProps} />
                        <AnimatedCircle cx={center + eyeSpacing/1.5} cy={eyeY} r={size * 0.04} fill={selected ? 'white' : color} animatedProps={animatedPathProps} />
                        <AnimatedPath d={`M ${mouthX + mouthW*0.2} ${mouthY} L ${mouthX + mouthW*0.8} ${mouthY}`} animatedProps={animatedPathProps} />
                    </>
                );
            case 'sad':
                return (
                    <>
                        <AnimatedPath d={`M ${center - eyeSpacing} ${eyeY} L ${center - eyeSpacing/2} ${eyeY + size*0.04}`} animatedProps={animatedPathProps} />
                        <AnimatedPath d={`M ${center + eyeSpacing} ${eyeY} L ${center + eyeSpacing/2} ${eyeY + size*0.04}`} animatedProps={animatedPathProps} />
                        <AnimatedPath d={`M ${mouthX} ${mouthY + size*0.1} Q ${center} ${mouthY - size * 0.05} ${mouthX + mouthW} ${mouthY + size*0.1}`} animatedProps={animatedPathProps} fill="none" />
                    </>
                );
            case 'tired':
                return (
                    <>
                        <AnimatedPath d={`M ${center - eyeSpacing} ${eyeY} Q ${center - eyeSpacing/2} ${eyeY + size*0.08} ${center - eyeSpacing/4} ${eyeY}`} animatedProps={animatedPathProps} fill="none" />
                        <AnimatedPath d={`M ${center + eyeSpacing/4} ${eyeY} Q ${center + eyeSpacing/2} ${eyeY + size*0.08} ${center + eyeSpacing} ${eyeY}`} animatedProps={animatedPathProps} fill="none" />
                        <AnimatedPath d={`M ${mouthX + mouthW*0.2} ${mouthY + size*0.08} Q ${center} ${mouthY + size*0.02} ${mouthX + mouthW*0.8} ${mouthY + size*0.08}`} animatedProps={animatedPathProps} fill="none" />
                    </>
                );
            case 'anxious':
                return (
                    <>
                        <AnimatedCircle cx={center - eyeSpacing/1.5} cy={eyeY} r={size * 0.05} fill={selected ? 'white' : color} animatedProps={animatedPathProps} />
                        <AnimatedCircle cx={center + eyeSpacing/1.5} cy={eyeY} r={size * 0.05} fill={selected ? 'white' : color} animatedProps={animatedPathProps} />
                        <AnimatedPath d={`M ${mouthX} ${mouthY} L ${center - mouthW/4} ${mouthY + 2} L ${center + mouthW/4} ${mouthY - 2} L ${mouthX + mouthW} ${mouthY}`} animatedProps={animatedPathProps} fill="none" />
                    </>
                );
            default: return null;
        }
    };

    return (
        <Animated.View style={[styles.container, { width: size, height: size }, animatedContainerStyle]}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* The Shell (Glassy for unselected, Solid for selected) */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    fill={color}
                    stroke={color}
                    strokeWidth={1}
                    animatedProps={animatedShellProps}
                />

                {/* The Modern Expression */}
                {getExpression()}
            </Svg>
        </Animated.View>
    );
}, (prev, next) => prev.selected === next.selected && prev.tag === next.tag);

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
