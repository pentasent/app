import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Dimensions, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Play, Pause, RotateCcw, RotateCw, ChevronDown, Repeat, Heart, Info } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { supabase } from '../../contexts/AuthContext';
import { Beat } from '../../types';
import { BeatDetailShimmer } from '../../components/shimmers/BeatDetailShimmer';
import { getImageUrl } from '@/utils/get-image-url';

const { width } = Dimensions.get('window');

export default function BeatsPlayerScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [beat, setBeat] = useState<Beat | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Audio Player
    const player = useAudioPlayer(getImageUrl(beat?.audio_url) || null);
    const status = useAudioPlayerStatus(player);

    // Status (expo-audio status object)
    const isPlaying = status.playing;
    const isLooping = status.loop;
    const isLoaded = status.isLoaded;
    const isBuffering = status.isBuffering;
    const duration = status.duration; // seconds
    const position = status.currentTime; // seconds

    useEffect(() => {
        fetchBeatDetails();
    }, [id]);

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
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching beat:', err);
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
        // Ensure seconds is treated as seconds (floored)
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
            <ImageBackground
                source={{ uri: getImageUrl(beat.banner_url) }}
                style={styles.backgroundImage}
                blurRadius={20} // Optional blur for background feel
            >
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', colors.background]} // Gradient from transparent to solid theme color
                    style={styles.gradient}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />

                <SafeAreaView style={styles.content}>
                    {/* Header */}
                    <BlurView intensity={40} tint="light" style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                            <ChevronDown size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Now Playing</Text>
                        <View style={{ width: 44 }} />
                    </BlurView>

                    {/* Main Cover Art */}
                    <View style={styles.coverContainer}>
                        <Image
                            source={{ uri: getImageUrl(beat.banner_url) }}
                            style={styles.coverImage}
                        />
                    </View>

                    {/* Track Info */}
                    <View style={styles.trackInfo}>
                        <View>
                            <Text style={styles.title} numberOfLines={1}>{beat.title}</Text>
                            <Text style={styles.artist}>
                                {beat.beat_tags?.name || 'Unknown Genre'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.iconButton}>
                            <Heart size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={duration}
                            value={position}
                            onSlidingComplete={handleSeek}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor={colors.border}
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

                        <TouchableOpacity
                            onPress={togglePlayPause}
                            style={styles.playPauseButton}
                            disabled={!isLoaded || isBuffering}
                        >
                            {!isLoaded || isBuffering ? (
                                <ActivityIndicator size="small" color={colors.background} />
                            ) : isPlaying ? (
                                <Pause size={32} color={colors.background} fill={colors.background} />
                            ) : (
                                <Play size={32} color={colors.background} fill={colors.background} style={{ marginLeft: 4 }} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={skipForward} style={styles.controlButtonMedium}>
                            <RotateCw size={28} color={colors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.controlButtonSmall}>
                            <Info size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorText: {
        color: colors.error,
        marginBottom: 16,
    },
    backButton: {
        padding: 10,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
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
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        letterSpacing: 1,
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
        // elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        marginBottom: 30,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    trackInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
        maxWidth: 250,
    },
    artist: {
        fontSize: 16,
        color: colors.textMuted,
        fontWeight: '500',
    },
    progressContainer: {
        marginBottom: 30,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -10,
    },
    timeText: {
        fontSize: 12,
        color: colors.textMuted,
        fontVariant: ['tabular-nums'],
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
    playPauseButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});
