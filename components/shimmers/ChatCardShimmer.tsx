import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export const ChatCardShimmer = () => {
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
        <Animated.View style={[styles.chatCard, { opacity }]}>
            <View style={[styles.communityLogo, { backgroundColor: colors.border }]} />

            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <View style={{ width: '50%', height: 16, backgroundColor: colors.border, borderRadius: 4 }} />
                    <View style={{ width: 40, height: 12, backgroundColor: colors.border, borderRadius: 2, position: 'absolute', right: 0, top: 4 }} />
                </View>

                <View style={{ width: '80%', height: 14, backgroundColor: colors.border, borderRadius: 4, marginTop: 6 }} />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    communityLogo: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    chatContent: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        position: 'relative',
    },
});
