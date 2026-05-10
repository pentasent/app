import React, { useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { ImageProps, View, StyleSheet } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { colors } from '../constants/theme';
import { getImageUrl } from '@/utils/get-image-url';

// Global cache to track which images have already been loaded once in this session.
// This prevents avatars and icons from "flickering" back to placeholders during feed updates.
const loadedImageCache = new Set<string>();

export const CustomImage = (props: ImageProps) => {
    const sourceUri = typeof props.source === 'object' && !Array.isArray(props.source) ? (props.source as any).uri : null;
    const isLocalAsset = typeof props.source === 'number';
    const uriString = isLocalAsset ? String(props.source) : sourceUri;

    // Construction of visibility flags
    const hasSource = !!props.source && (
        typeof props.source === 'number' ||
        (Array.isArray(props.source) ? props.source.length > 0 : !!(props.source as any).uri)
    );

    const [hasLoadedOnce, setHasLoadedOnce] = useState(() => {
        return uriString ? loadedImageCache.has(uriString) : false;
    });

    const containerStyle = [styles.container, props.style];
    const flattenedStyle = StyleSheet.flatten(props.style);
    const containerHeight = (flattenedStyle as any)?.height || 100;
    const iconSize = containerHeight < 50 ? 16 : 24;

    return (
        <View style={containerStyle}>
            {hasSource && (
                <ExpoImage
                    {...props as any}
                    style={StyleSheet.absoluteFill}
                    contentFit={props.resizeMode as any || 'cover'}
                    onLoad={() => {
                        if (uriString) loadedImageCache.add(uriString);
                        setHasLoadedOnce(true);
                    }}
                    onLoadEnd={() => {
                        if (uriString) loadedImageCache.add(uriString);
                        setHasLoadedOnce(true);
                    }}
                    transition={200}
                    // Reliable BlurHash for consistent loading aesthetics
                    placeholder="LKO2?4%2Tw=w]~RBVZsqdcRBmuen"
                    placeholderContentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={sourceUri || undefined}
                />
            )}
            
            {(!hasLoadedOnce) && (
                <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
                    <ImageIcon size={iconSize} color={colors.textMuted} strokeWidth={1.2} />
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
        // Removed backgroundColor to allow blurred image to show through
        zIndex: 1,
    }
});
