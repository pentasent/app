import React, { useState, useEffect, useRef } from 'react';
import { Image as RNImage, ImageProps, View, StyleSheet } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { colors } from '../constants/theme';

interface FlexibleCustomImageProps extends ImageProps {
    onSizeFound?: (aspectRatio: number) => void;
}

export const FlexibleCustomImage = (props: FlexibleCustomImageProps) => {
    const { onSizeFound, ...imageProps } = props;
    const [isLoading, setIsLoading] = useState(true);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const prevUriRef = useRef<string | null>(null);

    const hasSource = !!props.source && (
        typeof props.source === 'number' ||
        (Array.isArray(props.source) ? props.source.length > 0 : !!(props.source as any).uri)
    );

    const sourceUri = typeof props.source === 'object' && !Array.isArray(props.source) ? (props.source as any).uri : null;

    useEffect(() => {
        const isLocalAsset = typeof props.source === 'number';
        const uriString = isLocalAsset ? String(props.source) : sourceUri;

        if (uriString === prevUriRef.current && aspectRatio !== null) {
            // No need to reset if it's the same source and we already have dimensions
            return;
        }

        prevUriRef.current = uriString;
        setAspectRatio(null);
        setIsLoading(true);

        if (hasSource && sourceUri) {
            RNImage.getSize(
                sourceUri,
                (width: number, height: number) => {
                    if (width && height) {
                        const ratio = width / height;
                        setAspectRatio(ratio);
                        onSizeFound?.(ratio);
                    }
                    setIsLoading(false);
                },
                (error: any) => {
                    console.warn('Failed to get image size for:', sourceUri, error);
                    setIsLoading(false);
                }
            );
        } else if (isLocalAsset) {
            // For local assets
            try {
                const resolveAssetSource = require('react-native/Libraries/Image/resolveAssetSource');
                const source = resolveAssetSource(props.source);
                if (source && source.width && source.height) {
                    const ratio = source.width / source.height;
                    setAspectRatio(ratio);
                    onSizeFound?.(ratio);
                }
            } catch (e) {
                console.warn('Failed to resolve asset source:', e);
            }
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    }, [sourceUri, props.source]); // We still need the dependencies but the ref check prevents flicker

    const style = StyleSheet.flatten(props.style);
    const hasFixedHeight = !!(style as any)?.height;
    
    const containerStyle = [
        styles.container,
        style,
        (aspectRatio && !hasFixedHeight) ? { aspectRatio } : (!hasFixedHeight ? { height: 250 } : {})
    ];

    const iconSize = ((style as any)?.height || 250) < 50 ? 20 : 32;

    return (
        <View style={containerStyle}>
            {hasSource && (
                <RNImage
                    {...imageProps}
                    style={StyleSheet.absoluteFill}
                    onLoadStart={() => {
                        // Only set loading to true if we don't have an aspect ratio yet (first load)
                        if (!aspectRatio) setIsLoading(true);
                    }}
                    onLoadEnd={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)}
                />
            )}
            
            {/* 
                Only show placeholder if loading AND we don't have an aspect ratio.
                If we have an aspect ratio but image is loading (e.g. from network), 
                showing the placeholder might cause flicker if it's opaque.
                However, usually we want some indication.
            */}
            {(isLoading && !aspectRatio) && (
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
        backgroundColor: colors.borderLight,
        width: '100%',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.borderLight,
        zIndex: 1,
    }
});
