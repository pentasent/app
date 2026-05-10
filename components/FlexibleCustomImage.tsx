import React, { useState } from 'react';
import { Image as RNImage, ImageProps, View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Image as ImageIcon } from 'lucide-react-native';
import { colors } from '../constants/theme';

import { getImageUrl } from '@/utils/get-image-url';

interface FlexibleCustomImageProps extends ImageProps {
    onSizeFound?: (aspectRatio: number) => void;
    transformationOptions?: {
        width?: number;
        height?: number;
        quality?: number;
    };
}

// Global cache to persist aspect ratios across component mounts and feed updates
const aspectRatioCache = new Map<string, number>();

export const FlexibleCustomImage = React.memo((props: FlexibleCustomImageProps) => {
    const { onSizeFound, ...imageProps } = props;
    
    const rawUri = typeof props.source === 'object' && !Array.isArray(props.source) ? (props.source as any).uri : null;
    const isLocalAsset = typeof props.source === 'number';
    const isFileSystemUri = rawUri?.startsWith('file') || rawUri?.startsWith('content');
    
    // Simple robust URI resolution
    const uriString = isLocalAsset 
        ? String(props.source) 
        : (isFileSystemUri ? rawUri : getImageUrl(rawUri));

    // Stable Cache Key: Strip tokens/query params to identify the same image across URI changes
    const getCacheKey = (uri: string | null) => {
        if (!uri) return null;
        if (uri.startsWith('file') || uri.startsWith('content')) return uri;
        // Strip everything after ? for remote URLs
        return uri.split('?')[0];
    };

    const cacheKey = getCacheKey(uriString);

    const [aspectRatio, setAspectRatio] = useState<number | null>(() => {
        return cacheKey ? (aspectRatioCache.get(cacheKey) || null) : null;
    });
    const [isLoading, setIsLoading] = useState(!aspectRatio);
    const [lastUri, setLastUri] = useState(uriString);

    // Use useEffect to handle state sync when URI changes
    // This avoids "Rendered fewer hooks than expected" and other render-cycle violations
    React.useEffect(() => {
        if (uriString !== lastUri) {
            setLastUri(uriString);
            const newCacheKey = getCacheKey(uriString);
            const cached = newCacheKey ? aspectRatioCache.get(newCacheKey) : null;
            
            if (cached) {
                setAspectRatio(cached);
                setIsLoading(false);
            } else {
                setAspectRatio(null);
                setIsLoading(true);
            }
        }
    }, [uriString, lastUri]);

    return (
        <View style={[
            styles.container,
            props.style,
            { minHeight: 150 },
            aspectRatio ? { aspectRatio } : { height: 250 }
        ]}>
            {!!uriString && (
                <ExpoImage
                    {...imageProps as any}
                    source={{ uri: uriString }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    contentPosition="center"
                    onLoad={(e) => {
                        const { width, height } = e.source;
                        if (width && height && !aspectRatio) {
                            const ratio = width / height;
                            if (cacheKey) aspectRatioCache.set(cacheKey, ratio);
                            setAspectRatio(ratio);
                            onSizeFound?.(ratio);
                        }
                        setIsLoading(false);
                    }}
                    onLoadEnd={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)}
                    cachePolicy="memory-disk"
                />
            )}
            
            {isLoading && (
                <View style={styles.overlay}>
                    <ImageIcon size={aspectRatio ? 24 : 32} color={colors.textMuted} strokeWidth={1.2} />
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: colors.borderLight,
        width: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.borderLight + '20', // Very subtle overlay
        zIndex: 1,
    }
});
