import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export const ArticleDetailShimmer = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [opacity]);

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            {/* Metadata Row Shimmer */}
            <View style={styles.metaRow}>
                <View style={[styles.metaItem, { width: 80 }]} />
                <View style={styles.metaDivider} />
                <View style={[styles.metaItem, { width: 100 }]} />
                <View style={styles.metaDivider} />
                <View style={[styles.metaItem, { width: 60 }]} />
            </View>

            {/* Tags Shimmer */}
            <View style={styles.tagsContainer}>
                <View style={[styles.tagBadge, { width: 70 }]} />
                <View style={[styles.tagBadge, { width: 90 }]} />
                <View style={[styles.tagBadge, { width: 60 }]} />
            </View>

            {/* Content Blocks Shimmer */}
            <View style={styles.blocks}>
                <View style={styles.paraLine} />
                <View style={styles.paraLine} />
                <View style={[styles.paraLine, { width: '70%', marginBottom: 32 }]} />
                
                <View style={styles.imagePlaceholder} />
                
                <View style={[styles.paraLine, { marginTop: 32 }]} />
                <View style={styles.paraLine} />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    metaItem: {
        height: 14,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
    metaDivider: {
        width: 1,
        height: 12,
        backgroundColor: colors.border,
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 32,
    },
    tagBadge: {
        height: 28,
        backgroundColor: colors.border,
        borderRadius: 14,
    },
    blocks: {
        gap: 12,
    },
    paraLine: {
        width: '100%',
        height: 16,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
    imagePlaceholder: {
        width: '100%',
        height: 200,
        backgroundColor: colors.border,
        borderRadius: 16,
        marginVertical: 12,
    },
});
