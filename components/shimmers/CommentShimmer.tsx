import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/theme';

export const CommentShimmer = () => {
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
        <Animated.View style={[styles.commentContainer, { opacity }]}>
            <View style={[styles.avatar, { backgroundColor: colors.border }]} />
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <View style={{ width: 100, height: 14, backgroundColor: colors.border, borderRadius: 4 }} />
                    <View style={{ width: 60, height: 10, backgroundColor: colors.border, borderRadius: 4, marginLeft: 8 }} />
                </View>
                <View style={{ width: '90%', height: 14, backgroundColor: colors.border, borderRadius: 4, marginTop: 4 }} />
                <View style={{ width: '60%', height: 14, backgroundColor: colors.border, borderRadius: 4, marginTop: 8 }} />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    commentContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
});
