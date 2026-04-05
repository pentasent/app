import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, SafeAreaView, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { ChevronDown, Heart, Info, Play, Repeat, RotateCcw, RotateCw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const BeatDetailShimmer = () => {
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
            <SafeAreaView style={styles.content}>
                <Animated.View style={{ flex: 1, opacity }}>
                    {/* Header */}
                    <BlurView intensity={40} tint="light" style={styles.header}>
                        <View style={styles.iconButton}>
                            <ChevronDown size={28} color={colors.textMuted} />
                        </View>
                        <View style={styles.headerTitleShimmer} />
                        <View style={{ width: 44 }} />
                    </BlurView>

                    {/* Main Cover Art */}
                    <View style={styles.coverContainer}>
                        <View style={styles.coverImageShimmer} />
                    </View>

                    {/* Track Info */}
                    <View style={styles.trackInfo}>
                        <View>
                            <View style={styles.titleShimmer} />
                            <View style={styles.artistShimmer} />
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.sliderShimmer} />
                        <View style={styles.timeRow}>
                            <View style={styles.timeTextShimmer} />
                            <View style={styles.timeTextShimmer} />
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <View style={styles.controlButtonSmall}>
                            <Repeat size={20} color={colors.border} />
                        </View>

                        <View style={styles.controlButtonMedium}>
                            <RotateCcw size={28} color={colors.border} />
                        </View>

                        <View style={styles.playPauseButtonShimmer}>
                            <Play size={32} color={colors.border} fill={colors.border} style={{ marginLeft: 4 }} />
                        </View>

                        <View style={styles.controlButtonMedium}>
                            <RotateCw size={28} color={colors.border} />
                        </View>

                        <View style={styles.controlButtonSmall}>
                            <Info size={20} color={colors.border} />
                        </View>
                    </View>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Platform.OS === 'android' ? 40 : 0,
        marginBottom: 20,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTitleShimmer: {
        width: 120,
        height: 18,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.md,
    },
    iconButton: {
        padding: 8,
    },
    coverContainer: {
        width: width - 48,
        height: width - 48,
        alignSelf: 'center',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 30,
    },
    coverImageShimmer: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.borderLight,
    },
    trackInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    titleShimmer: {
        width: 180,
        height: 28,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.md,
        marginBottom: 8,
    },
    artistShimmer: {
        width: 120,
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.md,
    },
    progressContainer: {
        marginBottom: 30,
    },
    sliderShimmer: {
        width: '100%',
        height: 4,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
        marginBottom: 8,
        marginTop: 18, // To match slider height visually
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeTextShimmer: {
        width: 30,
        height: 12,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    controlButtonSmall: {
        padding: 10,
    },
    controlButtonMedium: {
        padding: 10,
    },
    playPauseButtonShimmer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
