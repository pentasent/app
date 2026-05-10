import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Platform, Animated, Easing, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Play, Pause, RotateCcw, RotateCw, ChevronDown, Repeat, Heart } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { supabase } from '../../contexts/AuthContext';
import { Beat } from '../../types';
import { BeatDetailShimmer } from '../../components/shimmers/BeatDetailShimmer';
import { getImageUrl } from '@/utils/get-image-url';
import { StatusBar } from 'expo-status-bar';
import crashlytics from '@/lib/crashlytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlayingAnimation = () => {
    const bars = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

    useEffect(() => {
        const createAnim = (val: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, {
                        toValue: 1,
                        duration: 400,
                        delay,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(val, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        const animations = bars.map((bar, i) => createAnim(bar, i * 150));
        animations.forEach(anim => anim.start());

        return () => animations.forEach(anim => anim.stop());
    }, []);

    return (
        <View style={styles.playingAnimationContainer}>
            {bars.map((bar, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.playingBar,
                        {
                            height: i % 2 === 0 ? 14 : 10,
                            transform: [{
                                scaleY: bar.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.3, 1],
                                })
                            }]
                        }
                    ]}
                />
            ))}
        </View>
    );
};

const HeaderVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
    const bars = Array.from({ length: 12 }).map(() => useRef(new Animated.Value(0)).current);

    useEffect(() => {
        const animations = bars.map((bar, i) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(bar, {
                        toValue: 1,
                        duration: 300 + Math.random() * 500,
                        delay: i * 50,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(bar, {
                        toValue: 0.2,
                        duration: 300 + Math.random() * 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
        });

        if (isPlaying) {
            animations.forEach(anim => anim.start());
        } else {
            animations.forEach(anim => anim.stop());
        }

        return () => animations.forEach(anim => anim.stop());
    }, [isPlaying]);

    return (
        <View style={styles.headerVisualizer}>
            {bars.map((bar, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.headerBar,
                        {
                            height: 12 + (i % 3) * 4,
                            opacity: isPlaying ? 0.8 : 0.3,
                            transform: [{
                                scaleY: isPlaying ? bar : 0.4
                            }]
                        }
                    ]}
                />
            ))}
        </View>
    );
};

const MusicVisualization = ({ isPlaying }: { isPlaying: boolean }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isPlaying) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }).start();
        }
    }, [isPlaying]);

    return (
        <Animated.View style={[styles.visualizationContainer, { opacity: fadeAnim }]}>
            <Animated.View 
                style={[
                    styles.pulseCircle, 
                    { transform: [{ scale: pulseAnim }] }
                ]} 
            />
            <Animated.View 
                style={[
                    styles.pulseCircle, 
                    { 
                        transform: [{ scale: pulseAnim.interpolate({
                            inputRange: [1, 1.2],
                            outputRange: [1, 1.5]
                        }) }],
                        opacity: 0.5
                    }
                ]} 
            />
        </Animated.View>
    );
};

const { width, height: screenHeight } = Dimensions.get('window');

export default function BeatsPlayerScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [beat, setBeat] = useState<Beat | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const audioSource = React.useMemo(() => {
        if (!beat?.audio_url) return null;
        return {
            uri: getImageUrl(beat.audio_url),
        };
    }, [beat?.audio_url]);

    // Audio Player
    const player = useAudioPlayer(audioSource);
    const status = useAudioPlayerStatus(player);

    // Status
    const isPlaying = status?.playing ?? false;
    const isLooping = status?.loop ?? false;
    const isLoaded = status?.isLoaded ?? false;
    const isBuffering = status?.isBuffering ?? false;
    const duration = status?.duration ?? 0;
    const position = status?.currentTime ?? 0;

    const imageZoom = useRef(new Animated.Value(1)).current;
    const trackFloat = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const loadCache = async () => {
            try {
                const cached = await AsyncStorage.getItem(`beat_detail_${id}`);
                if (cached) {
                    setBeat(JSON.parse(cached));
                    setLoading(false);
                }
            } catch (e) {
                console.log('[CACHE ERROR]:', e);
            }
        };
        loadCache();
        fetchBeatDetails();
    }, [id]);

    useEffect(() => {
        if (player) {
            player.loop = isLooping;
        }

        if (isPlaying) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(imageZoom, {
                        toValue: 1.1,
                        duration: 10000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(imageZoom, {
                        toValue: 1,
                        duration: 10000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(trackFloat, {
                        toValue: -5,
                        duration: 2500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(trackFloat, {
                        toValue: 0,
                        duration: 2500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            Animated.timing(imageZoom, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            }).start();
            Animated.timing(trackFloat, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }).start();
        }
    }, [player, isLooping, isPlaying]);

    const fetchBeatDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('beats')
                .select('*, beat_tags(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setBeat(data);
                await AsyncStorage.setItem(`beat_detail_${id}`, JSON.stringify(data));
            }
            setLoading(false);
        } catch (err: any) {
            crashlytics().recordError(err);
            console.log('[ERROR]:', 'Error fetching beat:', err);
            setError('Failed to load beat details');
            setLoading(false);
        }
    };

    const togglePlayPause = () => {
        if (!player) return;
        if (isPlaying) player.pause();
        else player.play();
    };

    const handleSeek = (value: number) => {
        if (player) player.seekTo(value);
    };

    const skipForward = () => {
        if (player) player.seekTo(position + 10);
    };

    const skipBackward = () => {
        if (player) player.seekTo(Math.max(0, position - 10));
    };

    const toggleLoop = () => {
        if (player) player.loop = !isLooping;
    };

    const formatTime = (seconds: number) => {
        if (!seconds) return '0:00';
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <BeatDetailShimmer />;
    }

    if (!beat || error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || 'Beat not found'}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            {/* Background Blur Section */}
            <View style={styles.backgroundBlurContainer}>
                <Image
                    source={{ uri: getImageUrl(beat.banner_url) }}
                    style={styles.blurredBackground}
                />
                <BlurView 
                    intensity={Platform.OS === 'ios' ? 40 : 100} 
                    tint="light" 
                    style={StyleSheet.absoluteFill} 
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'transparent', colors.background]}
                    style={styles.topGradient}
                    locations={[0, 0.4, 1]}
                />
            </View>

            <View style={[styles.content, { paddingTop: insets.top }]}>
                {/* Header - Identical Position */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
                        <ChevronDown size={28} color="white" />
                    </TouchableOpacity>
                    <HeaderVisualizer isPlaying={isPlaying} />
                    <View style={{ width: 44 }} />
                </View>

                {/* Centered Cover Art Card */}
                <View style={styles.coverCardContainer}>
                    <Animated.View style={[
                        styles.coverCard,
                        { transform: [{ scale: imageZoom }] }
                    ]}>
                        <Image
                            source={{ uri: getImageUrl(beat.banner_url) }}
                            style={styles.coverImage}
                            resizeMode="cover"
                        />
                    </Animated.View>
                </View>

                {/* Integrated Controls Section */}
                <View style={styles.controlsSection}>
                    {/* Track Info */}
                    <Animated.View style={[styles.trackInfo, { transform: [{ translateY: trackFloat }] }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title} numberOfLines={2}>{beat.title}</Text>
                            <Text style={styles.artist}>
                                {beat.beat_tags?.name || 'Unknown Genre'}
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={duration}
                            value={position}
                            onSlidingComplete={handleSeek}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor={colors.textMuted}
                            thumbTintColor={colors.primary}
                        />
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(position)}</Text>
                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity onPress={toggleLoop} style={styles.controlButtonSmall}>
                            <Repeat size={20} color={isLooping ? colors.primary : colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={skipBackward} style={styles.controlButtonMedium}>
                            <RotateCcw size={28} color={colors.text} />
                        </TouchableOpacity>

                        <View style={styles.playPauseWrapper}>
                            <MusicVisualization isPlaying={isPlaying} />
                            <TouchableOpacity
                                onPress={togglePlayPause}
                                style={styles.playPauseButton}
                                disabled={!isLoaded}
                            >
                            {isPlaying ? (
                                <Pause size={32} color="white" fill="white" />
                            ) : (
                                <Play size={32} color="white" fill="white" style={{ marginLeft: 4 }} />
                            )}
                            {isBuffering && (
                                <View style={styles.bufferingOverlay}>
                                    <ActivityIndicator size="small" color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={skipForward} style={styles.controlButtonMedium}>
                            <RotateCw size={28} color={colors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.controlButtonSmall}>
                            {/* Space for balance or future action */}
                            <View style={{ width: 20 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

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
        opacity: 0.6,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
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
        backgroundColor: colors.surface,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    coverImage: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
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
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
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
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
    },
    artist: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    progressContainer: {
        marginBottom: spacing.lg,
    },
    slider: {
        width: '95%',
        height: 40,
        marginHorizontal: 'auto',
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -5,
        paddingHorizontal: spacing.lg,
    },
    timeText: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
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
    playPauseButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    headerVisualizer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        height: 30,
    },
    headerBar: {
        width: 3,
        backgroundColor: 'white',
        borderRadius: 1.5,
    },
    playingAnimationContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 12,
        gap: 2,
    },
    playingBar: {
        width: 2.5,
        backgroundColor: 'white',
        borderRadius: 1,
    },
    bufferingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: spacing.xl,
    },
    errorText: {
        color: colors.error,
        marginBottom: 20,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
    },
    backButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    playPauseWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    visualizationContainer: {
        position: 'absolute',
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseCircle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary + '15',
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
});
