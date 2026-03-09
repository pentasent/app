import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { ArrowLeft } from 'lucide-react-native';

interface Props {
    onBack: () => void;
}

export const CommunityChatDetailShimmer = ({ onBack }: Props) => {
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
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>

                <Animated.View style={[styles.headerInfo, { opacity }]}>
                    <View style={styles.headerLogo} />
                    <View>
                        <View style={styles.headerTitle} />
                        <View style={styles.headerSubtitle} />
                    </View>
                </Animated.View>
            </View>

            {/* Chat Messages Skeleton */}
            <View style={styles.messagesContainer}>
                <Animated.View style={{ opacity }}>
                    {/* Left Message */}
                    <View style={styles.theirMessageRow}>
                        <View style={styles.avatar} />
                        <View style={[styles.bubble, styles.theirBubble]}>
                            <View style={styles.nameLine} />
                            <View style={styles.textLineLong} />
                            <View style={styles.textLineShort} />
                        </View>
                    </View>

                    {/* Right Message */}
                    <View style={styles.myMessageRow}>
                        <View style={[styles.bubble, styles.myBubble]}>
                            <View style={styles.textLineLong} />
                        </View>
                    </View>

                    {/* Left Message */}
                    <View style={styles.theirMessageRow}>
                        <View style={styles.avatar} />
                        <View style={[styles.bubble, styles.theirBubble]}>
                            <View style={styles.nameLine} />
                            <View style={styles.textLineMedium} />
                        </View>
                    </View>

                    {/* Right Message */}
                    <View style={styles.myMessageRow}>
                        <View style={[styles.bubble, styles.myBubble]}>
                            <View style={styles.textLineMedium} />
                            <View style={styles.textLineShort} />
                        </View>
                    </View>
                </Animated.View>
            </View>

            {/* Bottom Input Area Skeleton */}
            <View style={styles.bottomArea}>
                <Animated.View style={[styles.inputContainer, { opacity }]}>
                    <View style={styles.inputSkeleton} />
                    <View style={styles.sendButtonSkeleton} />
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.background,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
        backgroundColor: colors.borderLight,
    },
    headerTitle: {
        width: 120,
        height: 14,
        borderRadius: 4,
        backgroundColor: colors.borderLight,
        marginBottom: 6,
    },
    headerSubtitle: {
        width: 80,
        height: 10,
        borderRadius: 4,
        backgroundColor: colors.borderLight,
    },
    messagesContainer: {
        flex: 1,
        padding: spacing.md,
        justifyContent: 'flex-end',
    },
    theirMessageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
    },
    myMessageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
        backgroundColor: colors.borderLight,
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    theirBubble: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderBottomLeftRadius: 4,
        backgroundColor: colors.surface,
    },
    myBubble: {
        backgroundColor: colors.borderLight, // Simulating standard sent message block
        borderBottomRightRadius: 4,
    },
    nameLine: {
        width: 60,
        height: 10,
        borderRadius: 4,
        backgroundColor: colors.border,
        marginBottom: 8,
    },
    textLineLong: {
        width: 180,
        height: 10,
        borderRadius: 4,
        backgroundColor: colors.border,
        marginBottom: 6,
    },
    textLineMedium: {
        width: 120,
        height: 10,
        borderRadius: 4,
        backgroundColor: colors.border,
        marginBottom: 6,
    },
    textLineShort: {
        width: 80,
        height: 10,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    bottomArea: {
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        paddingBottom: 20, // To account for safe area
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inputSkeleton: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    sendButtonSkeleton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.borderLight,
    },
});
