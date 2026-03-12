import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/theme';
import { Heart, MessageCircle, Share2, BarChart2 } from 'lucide-react-native';

export const FeedPostShimmer = () => {
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
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <View style={styles.avatar} />
                    <View>
                        <View style={styles.nameShimmer} />
                        <View style={styles.metaRowShimmer} />
                    </View>
                </View>
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
                <View style={styles.titleShimmer} />
                <View style={styles.bodyLineLong} />
                <View style={styles.bodyLineShort} />
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
                <View style={styles.actionButton}>
                    {/* <Heart size={20} color={colors.textMuted} /> */}
                    <View style={styles.actionTextShimmer} />
                </View>

                <View style={styles.actionButton}>
                    {/* <MessageCircle size={20} color={colors.textMuted} /> */}
                    <View style={styles.actionTextShimmer} />
                </View>

                <View style={styles.actionButton}>
                    {/* <BarChart2 size={20} color={colors.textMuted} /> */}
                    <View style={styles.actionTextShimmer} />
                </View>

                <View style={styles.actionButton}>
                    <View style={styles.moreButton}>
                        {/* <Share2 size={20} color={colors.textMuted} /> */}
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        marginBottom: 1,
        paddingTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: colors.borderLight,
    },
    nameShimmer: {
        width: 120,
        height: 15,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 6,
    },
    metaRowShimmer: {
        width: 80,
        height: 12,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    contentContainer: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    titleShimmer: {
        width: '60%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 8,
    },
    bodyLineLong: {
        width: '100%',
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 6,
    },
    bodyLineShort: {
        width: '70%',
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionTextShimmer: {
        width: 30,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    moreButton: {
        padding: 4,
    },
});
