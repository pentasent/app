import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export const TaskDetailShimmer = () => {
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
        <>
            <Animated.View style={[styles.content, { opacity }]}>
                {/* Title Input */}
                <View style={styles.section}>
                    <View style={styles.titleShimmerFull} />
                    <View style={styles.charCountShimmer} />
                </View>

                {/* Priority */}
                <View style={styles.section}>
                    <View style={styles.labelShimmer} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={styles.chipShimmer} />
                        <View style={styles.chipShimmer} />
                        <View style={styles.chipShimmer} />
                    </View>
                </View>

                {/* Tags */}
                <View style={styles.section}>
                    <View style={styles.labelShimmer} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={styles.chipShimmer} />
                        <View style={styles.chipShimmer} />
                        <View style={styles.chipShimmer} />
                        <View style={styles.chipShimmer} />
                    </View>
                </View>

                {/* Due Time */}
                <View style={styles.section}>
                    <View style={styles.labelShimmer} />
                    <View style={styles.dateRowShimmer}>
                        <View style={styles.clockIconShimmer} />
                        <View style={styles.timeTextShimmer} />
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <View style={styles.labelShimmer} />
                    <View style={styles.descLineFull} />
                    <View style={styles.descLineMedium} />
                </View>

                {/* Subtasks */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                        <View style={styles.labelShimmer} />
                        <View style={styles.clockIconShimmer} />
                    </View>
                    <View style={styles.subtaskCardShimmer} />
                    <View style={styles.subtaskCardShimmer} />
                </View>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    section: {
        marginBottom: spacing.xl,
    },
    titleShimmerFull: {
        width: '100%',
        height: 32,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 8,
    },
    charCountShimmer: {
        width: 40,
        height: 12,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        alignSelf: 'flex-end',
    },
    labelShimmer: {
        width: 100,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 12,
    },
    chipShimmer: {
        width: 80,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.borderLight,
    },
    dateRowShimmer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    clockIconShimmer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.borderLight,
    },
    timeTextShimmer: {
        width: 120,
        height: 18,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    descLineFull: {
        width: '100%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 8,
    },
    descLineMedium: {
        width: '70%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    subtaskCardShimmer: {
        height: 56,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.sm,
    },
});
