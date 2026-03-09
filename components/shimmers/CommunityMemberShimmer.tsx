import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export const CommunityMemberShimmer = () => {
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
        <Animated.View style={[styles.memberCard, { opacity }]}>
            <View style={styles.avatar} />
            <View style={styles.memberInfo}>
                <View style={styles.memberName} />
                <View style={styles.memberDetail} />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: spacing.md,
        backgroundColor: colors.border,
    },
    memberInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    memberName: {
        width: 120,
        height: 16,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: 6,
    },
    memberDetail: {
        width: 80,
        height: 12,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
});
