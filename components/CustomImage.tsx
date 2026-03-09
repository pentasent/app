import React, { useState } from 'react';
import { Image as RNImage, ImageProps, View, StyleSheet } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { colors } from '../constants/theme';

export const CustomImage = (props: ImageProps) => {
    const [isLoading, setIsLoading] = useState(true);

    const hasSource = !!props.source && (
        typeof props.source === 'number' ||
        (Array.isArray(props.source) ? props.source.length > 0 : !!(props.source as any).uri)
    );

    return (
        <View style={[props.style, styles.container]}>
            {hasSource && (
                <RNImage
                    {...props}
                    style={StyleSheet.absoluteFill}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                />
            )}
            {(!hasSource || isLoading) && (
                <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
                    <ImageIcon size={24} color={colors.textMuted} style={styles.icon} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: colors.card,
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.card,
        zIndex: 1,
    },
    icon: {
        opacity: 0.8, // very light
    }
});
