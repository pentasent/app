import React, { useState, useEffect } from 'react';
import { Image as RNImage, ImageProps, View, StyleSheet } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { colors } from '../constants/theme';

export const CustomImage = (props: ImageProps) => {
    const [isLoading, setIsLoading] = useState(true);

    const hasSource = !!props.source && (
        typeof props.source === 'number' ||
        (Array.isArray(props.source) ? props.source.length > 0 : !!(props.source as any).uri)
    );

    const sourceUri = typeof props.source === 'object' && !Array.isArray(props.source) ? (props.source as any).uri : null;

    useEffect(() => {
        if (hasSource) {
            setIsLoading(true);
        }
    }, [sourceUri]);

    const style = StyleSheet.flatten(props.style);
    const containerHeight = (style as any)?.height || 100;
    const iconSize = containerHeight < 50 ? 20 : 32;

    return (
        <View style={[styles.container, props.style]}>
            {hasSource && (
                <RNImage
                    {...props}
                    style={StyleSheet.absoluteFill}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)}
                />
            )}
            
            {(isLoading || !hasSource) && (
                <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
                    <ImageIcon size={iconSize} color={colors.textMuted} strokeWidth={1.5} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: colors.borderLight, // Default background for empty state
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.borderLight,
        zIndex: 1,
    }
});
