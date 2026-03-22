import React, { useState, useEffect, useRef } from 'react';
import { Image as RNImage, View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, cancelAnimation } from 'react-native-reanimated';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Clock, Music } from 'lucide-react-native';
import { colors, spacing } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Meditation } from '../../types/database';
import { getImageUrl } from '@/utils/get-image-url';

const { width } = Dimensions.get('window');

// --- Constants ---

const BREATH_DURATION = 4000; // 4 seconds

type SoundOption = {
    id: string;
    title: string;
    uri: string;
    image: string;
};

const TIMERS = [
    { label: '10m', value: 10 * 60 },
    { label: '30m', value: 30 * 60 },
    { label: '1h', value: 60 * 60 },
];

export default function MeditationScreen() {
    const router = useRouter();
    const [sounds, setSounds] = useState<SoundOption[]>([]);
    const [selectedSound, setSelectedSound] = useState<SoundOption | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [breathText, setBreathText] = useState("Inhale");
    const [isLoading, setIsLoading] = useState(true);

    // Timer State
    const [timerValue, setTimerValue] = useState<number>(TIMERS[0].value);
    const [timeLeft, setTimeLeft] = useState<number>(TIMERS[0].value);

    // Animation Values
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.5);

    const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- Fetch Sounds ---
    useEffect(() => {
        const fetchSounds = async () => {
            try {
                const { data, error } = await supabase
                    .from('meditation')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching meditation sounds:', error);
                    return;
                }

                if (data && data.length > 0) {
                    const mappedSounds: SoundOption[] = data.map((item: Meditation) => ({
                        id: item.id,
                        title: item.title,
                        uri: getImageUrl(item.audio_url),
                        image: getImageUrl(item.banner_url),
                    }));
                    setSounds(mappedSounds);
                    setSelectedSound(mappedSounds[0]);
                }
            } catch (err) {
                console.error('Unexpected error fetching sounds:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSounds();
    }, []);

    const incrementPlayCount = async (soundId: string) => {
        try {
            // First fetch current count to increment safely without rpc
            const { data, error } = await supabase
                .from('meditation')
                .select('play_count')
                .eq('id', soundId)
                .single();

            if (error) throw error;

            await supabase
                .from('meditation')
                .update({ play_count: (data?.play_count || 0) + 1 })
                .eq('id', soundId);
        } catch (error) {
            console.error('Error increasing play count', error);
        }
    };

    const handlePlayPause = () => {
        if (!isPlaying && selectedSound) {
            incrementPlayCount(selectedSound.id);
        }
        setIsPlaying(!isPlaying);
    };

    // --- Audio Logic (expo-audio) ---
    const audioSource = React.useMemo(() => {
        if (!selectedSound?.uri) return null;
        return {
            uri: selectedSound.uri,
        };
    }, [selectedSound?.uri]);

    const player = useAudioPlayer(audioSource);
    const status = useAudioPlayerStatus(player);

    const isBuffering = status?.isBuffering ?? false;

    useEffect(() => {
        if (player) {
            player.loop = true;
            player.volume = isMuted ? 0 : 1.0;
            player.muted = isMuted;
            if (isPlaying) {
                player.play();
            } else {
                player.pause();
            }
        }
    }, [player, isPlaying, isMuted]);

    // --- Timer Logic (Unified) ---
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsPlaying(false); // Stop when timer finishes
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000) as unknown as NodeJS.Timeout;
        }
        return () => clearInterval(interval);
    }, [isPlaying, timeLeft]);

    const handleTimerSelect = (val: number) => {
        setTimerValue(val);
        setTimeLeft(val);
        // Do we auto-start? User request implies "click play pause also play pause timer".
        // Let's keep isPlaying as is. If playing, new timer starts counting down correctly.
    };

    // --- Animation & Breath Text Logic ---
    useEffect(() => {
        if (isPlaying) {
            // Animation
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.5, { duration: BREATH_DURATION, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: BREATH_DURATION, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.8, { duration: BREATH_DURATION }),
                    withTiming(0.4, { duration: BREATH_DURATION })
                ),
                -1
            );

            // Breath Text Loop
            if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
            setBreathText("Inhale");

            breathIntervalRef.current = setInterval(() => {
                setBreathText(prev => prev === "Inhale" ? "Exhale" : "Inhale");
            }, BREATH_DURATION) as unknown as NodeJS.Timeout;

        } else {
            // Pause/Stop
            cancelAnimation(scale);
            cancelAnimation(opacity);
            scale.value = withTiming(1);
            opacity.value = withTiming(0.5);

            if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
            setBreathText("Paused");
        }

        return () => {
            if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
        };
    }, [isPlaying]);

    // Animated Styles
    const circleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const circleStyle2 = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value * 0.8 }],
        opacity: opacity.value * 0.8,
    }));

    const circleStyle3 = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value * 1.2 }],
        opacity: opacity.value * 0.6,
    }));


    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.backgroundContainer}>
                <RNImage
                    source={{ uri: getImageUrl('placeholders/meditation_background.png') }}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />
            </View>

            <SafeAreaView style={styles.safeArea}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Meditation</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Content - Center Animation */}
                <View style={styles.centerContainer}>
                    <Animated.View style={[styles.circle, styles.circle3, circleStyle3]} />
                    <Animated.View style={[styles.circle, styles.circle2, circleStyle2]} />
                    <Animated.View style={[styles.circle, circleStyle]} />

                    <View style={styles.instructionContainer}>
                        <Text style={styles.instructionText}>
                            {breathText}
                        </Text>
                    </View>
                </View>


                {/* Bottom Controls */}
                <View style={styles.bottomSheet}>

                    {/* Timer & Play Controls */}
                    <View style={styles.timerContainer}>
                        <View style={styles.timerDisplay}>
                            <Clock size={16} color={isPlaying ? colors.primary : "rgba(255,255,255,0.7)"} style={{ marginRight: 6 }} />
                            <Text style={[styles.timerText, isPlaying && { color: colors.primary }]}>
                                {formatTime(timeLeft)}
                            </Text>
                        </View>

                        <View style={styles.timerOptions}>
                            {TIMERS.map(t => (
                                <TouchableOpacity
                                    key={t.label}
                                    style={[styles.timeOption, timerValue === t.value && styles.timeOptionActive]}
                                    onPress={() => handleTimerSelect(t.value)}
                                >
                                    <Text style={[styles.timeOptionText, timerValue === t.value && styles.timeOptionTextActive]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>


                    {/* Controls Row */}
                    <View style={styles.controlsRow}>
                        {/* Mute */}
                        <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.controlBtn}>
                            {isMuted ? <VolumeX size={24} color="white" /> : <Volume2 size={24} color="white" />}
                        </TouchableOpacity>

                        {/* Play/Pause Main */}
                        <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn}>
                            {isPlaying ? (
                                <Pause size={32} color="black" fill="black" />
                            ) : (
                                <Play size={32} color="black" fill="black" style={{ marginLeft: 4 }} />
                            )}
                            {isBuffering && (
                                <View style={styles.bufferingOverlay}>
                                    <ActivityIndicator size="small" color="black" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={{ width: 24 }} />
                    </View>

                    {/* Sound Selector */}
                    <View style={styles.soundSelector}>
                        {isLoading ? (
                            <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg }}>
                                {[1, 2, 3, 4].map((key) => (
                                    <View key={key} style={[styles.soundCard, { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                                        <Music size={24} color="rgba(255,255,255,0.2)" />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <FlatList
    data={sounds}
    horizontal
    showsHorizontalScrollIndicator={false}
    keyExtractor={(item) => item.id}
    extraData={selectedSound?.id}
    initialNumToRender={sounds.length}
    windowSize={7}
    contentContainerStyle={{ paddingHorizontal: spacing.lg }}
    renderItem={({ item }) => {
        const isActive = selectedSound?.id === item.id;

        return (
            <TouchableOpacity
                key={`sound-${item.id}-${isActive}`}
                style={[
                    styles.soundCard,
                    isActive && styles.soundCardActive
                ]}
                activeOpacity={0.7}
                onPress={() => {
                    if (selectedSound?.id !== item.id) {
                        setSelectedSound(item);
                        setIsPlaying(true);
                        incrementPlayCount(item.id);
                    }
                }}
            >
                <RNImage
                    source={{ uri: item.image }}
                    style={styles.soundCardImage}
                    resizeMode="cover"
                />

                <View
                    style={[
                        styles.soundOverlay,
                        isActive && {
                            backgroundColor: 'rgba(79, 70, 229, 0.4)'
                        }
                    ]}
                >
                    {isActive && (
                        <View style={styles.playingIndicator} />
                    )}

                    <Text style={styles.soundTitle}>
                        {item.title}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }}
/>
                            // <FlatList
                            //     data={sounds}
                            //     horizontal
                            //     showsHorizontalScrollIndicator={false}
                            //     keyExtractor={item => item.id}
                            //     extraData={selectedSound?.id}
                            //     removeClippedSubviews={false}
                            //     contentContainerStyle={{ paddingHorizontal: spacing.lg }}
                            //     renderItem={({ item }) => (
                            //         <TouchableOpacity
                            //             style={[
                            //                 styles.soundCard,
                            //                 selectedSound?.id === item.id && styles.soundCardActive
                            //             ]}
                            //             activeOpacity={0.7}
                            //             onPress={() => {
                            //                 if (selectedSound?.id !== item.id) {
                            //                     setSelectedSound(item);
                            //                     setIsPlaying(true);
                            //                     incrementPlayCount(item.id);
                            //                 }
                            //             }}
                            //         >
                            //             <RNImage
                            //                 source={{ uri: item.image }}
                            //                 style={styles.soundCardImage}
                            //                 resizeMode="cover"
                            //             />
                            //             <View style={[
                            //                 styles.soundOverlay,
                            //                 selectedSound?.id === item.id && { backgroundColor: 'rgba(79, 70, 229, 0.4)' }
                            //             ]}>
                            //                 {selectedSound?.id === item.id && (
                            //                     <View style={styles.playingIndicator} />
                            //                 )}
                            //                 <Text style={styles.soundTitle}>{item.title}</Text>
                            //             </View>
                            //         </TouchableOpacity>
                            //     )}
                            // />
                        )}
                    </View>

                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // fallback
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    backgroundImage: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
    },
    iconButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
        letterSpacing: 1,
    },

    // Center Animation
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.15)',
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: 'rgba(255,255,255,0.3)',
        borderWidth: 1,
    },
    circle2: {
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    circle3: {
        width: 240,
        height: 240,
        borderRadius: 120,
    },
    instructionContainer: {
        zIndex: 10,
    },
    instructionText: {
        color: 'white',
        fontSize: 24,
        fontWeight: '300',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    // Bottom Sheet
    bottomSheet: {
        paddingBottom: 40,
    },
    timerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: 30,
    },
    timerDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timerText: {
        color: 'white',
        fontSize: 32,
        fontWeight: '200',
        fontVariant: ['tabular-nums'],
    },
    timerOptions: {
        flexDirection: 'row',
        gap: 10,
    },
    timeOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    timeOptionActive: {
        backgroundColor: 'white',
        borderColor: 'white',
    },
    timeOptionText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '600',
    },
    timeOptionTextActive: {
        color: 'black',
    },

    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: 30,
    },
    controlBtn: {
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 30,
    },
    playBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "white",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },

    // Sound Selector
    soundSelector: {
        height: 110,
    },
    // soundCard: {
    //     width: 100,
    //     height: 100,
    //     marginRight: 12,
    //     borderRadius: 12,
    //     overflow: 'hidden',
    //     position: 'relative',
    //     backgroundColor: '#222',
    // },
    soundCard: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#222',
    elevation: 1
},
    soundCardActive: {
        borderWidth: 2,
        borderColor: colors.primary,
        transform: [{ scale: 1.02 }],
    },
    soundCardImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    soundOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 6,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    soundTitle: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    playingIndicator: {
        position: 'absolute',
        top: -60,
        alignSelf: 'center',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    bufferingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
