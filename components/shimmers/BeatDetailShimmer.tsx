import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform, Easing } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { ChevronDown, Play, Repeat, RotateCcw, RotateCw, Music } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height: screenHeight } = Dimensions.get('window');

// Colors for a subtle, clean shimmer
const BASE_COLOR = colors.border;
const HIGHLIGHT_COLOR = '#FFFFFF';

const ShimmerBox = ({ style, translateX, children }: { style: any, translateX: Animated.Value, children?: React.ReactNode }) => (
    <View style={[style, { backgroundColor: BASE_COLOR, overflow: 'hidden' }]}>
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                {
                    transform: [{ translateX }],
                },
            ]}
        >
            <LinearGradient
                colors={[BASE_COLOR, HIGHLIGHT_COLOR, BASE_COLOR]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
        {children}
    </View>
);

export const BeatDetailShimmer = () => {
    const insets = useSafeAreaInsets();
    const translateX = useRef(new Animated.Value(-width)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(translateX, {
                toValue: width,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [translateX]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            {/* Background Atmosphere Shimmer - Same as real page */}
            <View style={styles.backgroundBlurContainer}>
                <ShimmerBox style={styles.blurredBackground} translateX={translateX} />
                <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'transparent', colors.background]}
                    style={styles.topGradient}
                    locations={[0, 0.4, 1]}
                />
            </View>

            <View style={[styles.content, { paddingTop: insets.top }]}>
                {/* Header - Identical Position */}
                <View style={styles.header}>
                    <View style={styles.headerIconButton}>
                        <ChevronDown size={28} color="rgba(255,255,255,0.2)" />
                    </View>
                    <View style={styles.headerVisualizer}>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <View 
                                key={i} 
                                style={[
                                    styles.headerBar, 
                                    { height: 12 + (i % 3) * 4, opacity: 0.1 }
                                ]} 
                            />
                        ))}
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {/* Centered Cover Art Card - flex: 1 ensures identical centering */}
                <View style={styles.coverCardContainer}>
                    <ShimmerBox style={styles.coverCard} translateX={translateX} />
                </View>

                {/* Integrated Controls Section - Identical spacing */}
                <View style={styles.controlsSection}>
                    {/* Track Info */}
                    <View style={styles.trackInfo}>
                        <View style={{ flex: 1 }}>
                            <ShimmerBox style={styles.titleShimmer} translateX={translateX} />
                            <ShimmerBox style={styles.artistShimmer} translateX={translateX} />
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <ShimmerBox style={styles.sliderShimmer} translateX={translateX} />
                        <View style={styles.timeRow}>
                            <ShimmerBox style={styles.timeTextShimmer} translateX={translateX} />
                            <ShimmerBox style={styles.timeTextShimmer} translateX={translateX} />
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <View style={styles.controlButtonSmall}>
                            <Repeat size={20} color="rgba(0,0,0,0.05)" />
                        </View>

                        <View style={styles.controlButtonMedium}>
                            <RotateCcw size={28} color="rgba(0,0,0,0.05)" />
                        </View>

                        <View style={styles.playPauseWrapper}>
                            <ShimmerBox style={styles.playPauseButtonShimmer} translateX={translateX}>
                                <Play size={32} color="white" fill="white" style={{ marginLeft: 4 }} />
                            </ShimmerBox>
                        </View>

                        <View style={styles.controlButtonMedium}>
                            <RotateCw size={28} color="rgba(0,0,0,0.05)" />
                        </View>

                        <View style={styles.controlButtonSmall}>
                            <View style={{ width: 20 }} />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    backgroundBlurContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: screenHeight * 0.5,
        overflow: 'hidden',
    },
    blurredBackground: {
        width: '100%',
        height: '100%',
        opacity: 0.3,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'android' ? spacing.md : 0,
    },
    headerIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerVisualizer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        height: 30,
    },
    headerBar: {
        width: 3,
        backgroundColor: '#000',
        borderRadius: 1.5,
    },
    coverCardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    coverCard: {
        width: width * 0.75,
        height: width * 0.75,
        borderRadius: 24,
    },
    cardIcon: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlsSection: {
        paddingTop: spacing.xxl,
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    },
    trackInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    titleShimmer: {
        width: width * 0.7,
        height: 52, // 2 lines
        borderRadius: borderRadius.md,
        marginBottom: 8,
    },
    artistShimmer: {
        width: width * 0.35,
        height: 18,
        borderRadius: borderRadius.md,
    },
    progressContainer: {
        marginBottom: spacing.lg,
    },
    sliderShimmer: {
        width: '90%',
        height: 6,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 12,
        marginTop: 18,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    timeTextShimmer: {
        width: 40,
        height: 12,
        borderRadius: 2,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    controlButtonSmall: {
        padding: 8,
    },
    controlButtonMedium: {
        padding: 8,
    },
    playPauseWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    playPauseButtonShimmer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
