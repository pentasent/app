import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Pressable } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { MOODS, MoodConfig } from '../../constants/moods';
import { MoodSquare } from './MoodSquare';
import { LayoutGrid, Sparkles, Heart } from 'lucide-react-native';

interface MoodCheckInCardProps {
    onMoodSelect: (mood: MoodConfig) => void;
    onHeaderPress?: () => void;
    scrollY?: Animated.Value;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MoodCheckInCard: React.FC<MoodCheckInCardProps> = React.memo(({ onMoodSelect, onHeaderPress, scrollY }) => {
    // Scroll Interpolations
    const opacity = scrollY?.interpolate({
        inputRange: [0, 40],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    }) || 1;

    // Mini icon button coming from RIGHT to LEFT
    const miniTriggerTranslateX = scrollY?.interpolate({
        inputRange: [40, 80],
        outputRange: [64, 0],
        extrapolate: 'clamp',
    }) || 64;

    const miniTriggerOpacity = scrollY?.interpolate({
        inputRange: [40, 70],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    }) || 0;

    const checkIconScale = scrollY?.interpolate({
        inputRange: [92, 100],
        outputRange: [0.5, 1],
        extrapolate: 'clamp',
    }) || 1;

    return (
        <Animated.View 
            style={[
                styles.container,
                {
                    opacity: scrollY?.interpolate({
                         inputRange: [0, 150],
                         outputRange: [1, 0.4],
                         extrapolate: 'clamp'
                    }) || 1,
                    height: 180, // Fixed height for parallax space
                    transform: [{
                        translateY: scrollY?.interpolate({
                            inputRange: [0, 180],
                            outputRange: [0, 20], // Slower scroll for parallax depth
                            extrapolate: 'clamp'
                        }) || 0
                    }],
                    zIndex: 0,
                }
            ]}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    {/* <View style={styles.headerTop}>
                        <View style={styles.pillBadge}>
                            <Sparkles size={12} color={colors.primary} />
                            <Text style={styles.pillText}>DAILY WELLNESS</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={onHeaderPress}
                            activeOpacity={0.7}
                        >
                            <Heart size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View> */}
                    <Text style={styles.title}>How are you feeling today?</Text>
                    <Text style={styles.subtitle}>A 10-second check-in helps track your mental pulse.</Text>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.moodScroll}
                >
                    {MOODS.map((mood) => (
                        <View key={mood.tag} style={styles.moodItem}>
                            <MoodSquare
                                mood={mood}
                                selected={false}
                                onPress={() => onMoodSelect(mood)}
                                size={76}
                            />
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: colors.background,
    },
    card: {
        // paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    header: {
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    pillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pillText: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.primary,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 4,
        fontWeight: '500',
    },
    miniChip: {
        position: 'absolute',
        right: spacing.md,
        top: 140, // Height of FeedHeader + some margin
        zIndex: 2000,
    },
    miniChipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    miniChipIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    miniChipText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.text,
    },
    moodScroll: {
        paddingRight: spacing.xl,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    moodItem: {
        marginRight: spacing.sm,
    },
});
