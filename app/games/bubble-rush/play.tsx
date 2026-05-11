import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    DeviceEventEmitter,
} from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Star, Bomb, Trophy, RefreshCcw, LayoutGrid } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../contexts/AuthContext';
import { colors, spacing } from '../../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Game Constants - Fine-tuned for silky smoothness
const GAME_DURATION = 30;
const BUBBLE_SPAWN_RATE = 700;
const BASE_SPEED = 4500;
const BUBBLE_SIZE_RANGE = [55, 75];

type BubbleType = 'positive' | 'negative' | 'golden' | 'bomb';

interface BubbleData {
    id: number;
    type: BubbleType;
    x: number;
    size: number;
    points: number;
    duration: number;
}

const BubbleItem = React.memo(({
    data,
    onPop,
    onMiss
}: {
    data: BubbleData;
    onPop: (data: BubbleData) => void;
    onMiss: (id: number) => void;
}) => {
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    useEffect(() => {
        translateY.value = withTiming(height + 100, {
            duration: data.duration,
            easing: Easing.out(Easing.quad)
        }, (finished) => {
            if (finished) {
                runOnJS(onMiss)(data.id);
            }
        });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value }
        ],
        opacity: opacity.value,
        left: data.x,
        width: data.size,
        height: data.size,
        borderRadius: data.size / 2,
    }));

    const handlePress = () => {
        scale.value = withSequence(withTiming(1.3, { duration: 60 }), withTiming(0, { duration: 100 }));
        opacity.value = withTiming(0, { duration: 100 });
        onPop(data);
    };

    const getBubbleColors = (): [string, string] => {
        switch (data.type) {
            case 'positive': return ['#38BDF8', '#0284C7'];
            case 'golden': return ['#FCD34D', '#D97706'];
            case 'negative': return ['#F87171', '#DC2626'];
            case 'bomb': return ['#64748B', '#334155'];
            default: return ['#38BDF8', '#0284C7'];
        }
    };

    return (
        <Animated.View style={[styles.bubbleContainer, animatedStyle]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                style={[styles.bubbleTouch, { borderRadius: data.size / 2 }]}
            >
                <LinearGradient
                    colors={getBubbleColors()}
                    style={[styles.bubbleGradient, { borderRadius: data.size / 2 }]}
                >
                    <View style={styles.bubbleGloss} />
                    {data.type === 'golden' && <Star size={data.size * 0.4} color="#FFF" fill="#FFF" />}
                    {data.type === 'bomb' && <Bomb size={data.size * 0.5} color="#FCA5A5" />}
                    {data.type === 'positive' && (
                        <Text style={styles.bubblePoints}>+{data.points}</Text>
                    )}
                    {data.type === 'negative' && <Text style={styles.bubblePenalty}>-{Math.abs(data.points)}</Text>}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}, (prev, next) => prev.data.id === next.data.id);

export default function BubbleRushPlay() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    // Game State
    const [gameState, setGameState] = useState<'countdown' | 'playing' | 'finished'>('countdown');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [bubbles, setBubbles] = useState<BubbleData[]>([]);
    const [countdown, setCountdown] = useState(3);

    const stats = useRef({
        positive_hits: 0,
        negative_hits: 0,
        missed_bubbles: 0,
        golden_hits: 0,
        current_score: 0,
        current_combo: 0,
        max_combo: 0
    });

    const bubbleIdCounter = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const spawnRef = useRef<NodeJS.Timeout | null>(null);

    const multiplier = useMemo(() => {
        // Rebalanced: Slower growth (every 15 hits for next level)
        if (combo >= 45) return 4;
        if (combo >= 30) return 3;
        if (combo >= 15) return 2;
        return 1;
    }, [combo]);

    useEffect(() => {
        if (gameState === 'countdown') {
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setGameState('playing');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameState]);

    useEffect(() => {
        if (gameState === 'playing') {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            spawnRef.current = setInterval(() => {
                spawnBubble();
            }, BUBBLE_SPAWN_RATE);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
                if (spawnRef.current) clearInterval(spawnRef.current);
            };
        }
    }, [gameState]);

    const spawnBubble = useCallback(() => {
        const rand = Math.random();
        let type: BubbleType = 'positive';
        let points = 10;

        if (rand < 0.05) { type = 'golden'; points = 25; } // Reduced from 100
        else if (rand < 0.15) { type = 'bomb'; points = -20; } // Reduced from -50
        else if (rand < 0.3) { type = 'negative'; points = -5; } // Reduced from -20
        else {
            type = 'positive';
            points = Math.floor(Math.random() * 2) + 2; // +2 or +3 (Reduced from +10 to +30)
        }

        const size = Math.random() * (BUBBLE_SIZE_RANGE[1] - BUBBLE_SIZE_RANGE[0]) + BUBBLE_SIZE_RANGE[0];
        const x = Math.random() * (width - size);
        const duration = BASE_SPEED - (Math.random() * 500);

        const newBubble: BubbleData = {
            id: bubbleIdCounter.current++,
            type,
            x,
            size,
            points,
            duration
        };

        setBubbles(prev => [...prev, newBubble]);
    }, []);

    const onPop = useCallback((data: BubbleData) => {
        setBubbles(prev => prev.filter(b => b.id !== data.id));

        if (data.type === 'positive' || data.type === 'golden') {
            const addedScore = data.points * (data.type === 'golden' ? 1 : multiplier);
            setScore(prev => {
                const next = prev + addedScore;
                stats.current.current_score = next;
                return next;
            });
            setCombo(prev => {
                const next = prev + 1;
                stats.current.current_combo = next;
                stats.current.max_combo = Math.max(stats.current.max_combo, next);
                return next;
            });
            setMaxCombo(prev => Math.max(prev, combo + 1));

            if (data.type === 'golden') stats.current.golden_hits++;
            else stats.current.positive_hits++;
        } else {
            setScore(prev => {
                const next = Math.max(0, prev + data.points);
                stats.current.current_score = next;
                return next;
            });
            setCombo(0);
            stats.current.current_combo = 0;
            stats.current.negative_hits++;
        }
    }, [multiplier, combo]);

    const onMiss = useCallback((id: number) => {
        setBubbles(prev => {
            const bubble = prev.find(b => b.id === id);
            if (bubble?.type === 'positive') {
                runOnJS(setCombo)(0);
                stats.current.missed_bubbles++;
            }
            return prev.filter(b => b.id !== id);
        });
    }, []);

    const endGame = async () => {
        setGameState('finished');
        if (timerRef.current) clearInterval(timerRef.current);
        if (spawnRef.current) clearInterval(spawnRef.current);

        const finalSessionScore = stats.current.current_score;
        const finalMaxCombo = stats.current.max_combo;

        try {
            if (!user) return;

            // 1. Get Game ID
            const { data: gameData } = await supabase
                .from('games')
                .select('id')
                .eq('slug', 'bubble-rush')
                .single();

            if (gameData) {
                const gameId = gameData.id;

                // 2. Insert Session
                const { error: sessionError } = await supabase
                    .from('game_sessions')
                    .insert({
                        user_id: user.id,
                        game_id: gameId,
                        score: finalSessionScore,
                        duration_seconds: GAME_DURATION,
                        is_completed: true,
                        metadata: {
                            ...stats.current,
                            combo_max: finalMaxCombo,
                            device_fps: 60
                        }
                    });

                if (sessionError) throw sessionError;
                console.log('[GAME_END] Session stored successfully for score:', finalSessionScore);

                // 3. Update User Stats (High Fidelity Aggregation)
                console.log('[STATS] Fetching existing stats for user:', user.id, 'game:', gameId);
                const { data: existingStats, error: statsFetchError } = await supabase
                    .from('game_user_stats')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('game_id', gameId)
                    .maybeSingle();

                if (statsFetchError) {
                    console.error('[STATS] Fetch error:', statsFetchError);
                }

                let finalStats: any;
                const currentSessionScore = Number(finalSessionScore) || 0;
                console.log('[STATS] Current session score to add:', currentSessionScore);

                if (existingStats) {
                    console.log('[STATS] Found existing stats:', existingStats);
                    const prevHighest = Number(existingStats.highest_score) || 0;
                    const prevTotal = Number(existingStats.total_score) || 0;
                    const prevSessions = Number(existingStats.total_sessions) || 0;
                    const prevTime = Number(existingStats.total_play_time) || 0;

                    finalStats = {
                        highest_score: Math.max(prevHighest, currentSessionScore),
                        total_score: prevTotal + currentSessionScore,
                        total_sessions: prevSessions + 1,
                        total_play_time: prevTime + GAME_DURATION,
                        last_played_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    console.log('[STATS] Updating existing record with:', finalStats);
                    const { error: updateError } = await supabase
                        .from('game_user_stats')
                        .update(finalStats)
                        .eq('user_id', user.id)
                        .eq('game_id', gameId);

                    if (updateError) console.error('[STATS] Update failed:', updateError);
                } else {
                    console.log('[STATS] No existing stats found. Creating new record.');
                    finalStats = {
                        user_id: user.id,
                        game_id: gameId,
                        total_score: currentSessionScore,
                        highest_score: currentSessionScore,
                        total_sessions: 1,
                        total_play_time: GAME_DURATION,
                        last_played_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    console.log('[STATS] Inserting new record:', finalStats);
                    const { error: insertError } = await supabase
                        .from('game_user_stats')
                        .insert(finalStats);

                    if (insertError) console.error('[STATS] Insert failed:', insertError);
                }

                // 4. Update Local Cache Immediately
                const SLUG = 'bubble-rush';
                await AsyncStorage.setItem(`game_stats_${SLUG}_${user.id}`, JSON.stringify(finalStats));
                console.log('[STATS] Success: Local cache and DB synchronized.');
                
                // 5. Signal Dashboard Refresh
                DeviceEventEmitter.emit('bubble_rush_refresh');
            }
        } catch (err) {
            console.error('[GAME_END] Error submitting score or updating stats:', err);
        }
    };

    const restartGame = () => {
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setTimeLeft(GAME_DURATION);
        setBubbles([]);
        stats.current = {
            positive_hits: 0,
            negative_hits: 0,
            missed_bubbles: 0,
            golden_hits: 0,
            current_score: 0,
            current_combo: 0,
            max_combo: 0
        };
        setGameState('countdown');
        setCountdown(3);
    };

    const isNavigating = useRef(false);
    const goDashboard = () => {
        if (isNavigating.current) return;
        isNavigating.current = true;
        
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/games/bubble-rush');
        }

        // Failsafe to allow navigation again after a delay
        setTimeout(() => {
            isNavigating.current = false;
        }, 800);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Gameplay HUD */}
            {gameState === 'playing' && (
                <View style={[styles.uiOverlay, { paddingTop: insets.top + 10 }]}>
                    <View style={styles.topRow}>
                        <View style={styles.scoreBoard}>
                            <Text style={styles.scoreLabel}>SCORE</Text>
                            <Text style={styles.scoreValue}>{score}</Text>
                        </View>

                        <View style={styles.timerCircle}>
                            <Clock size={14} color={colors.primary} />
                            <Text style={styles.timerValue}>{timeLeft}s</Text>
                        </View>
                    </View>

                    {combo > 1 && (
                        <Animated.View style={styles.comboContainer}>
                            <Text style={styles.comboText}>{combo} COMBO!</Text>
                            <View style={styles.multiplierBadge}>
                                <Text style={styles.multiplierText}>x{multiplier}</Text>
                            </View>
                        </Animated.View>
                    )}
                </View>
            )}

            {/* Bubble Rendering Layer */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {bubbles.map(bubble => (
                    <BubbleItem
                        key={bubble.id}
                        data={bubble}
                        onPop={onPop}
                        onMiss={onMiss}
                    />
                ))}
            </View>

            {/* Countdown Overlay */}
            {gameState === 'countdown' && (
                <View style={styles.fullOverlay}>
                    <Animated.View style={{ transform: [{ scale: 1 }] }}>
                        <Svg height="150" width="200" viewBox="0 0 200 150">
                            <Defs>
                                <SvgGradient id="countdownGrad" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor="#0083B0" stopOpacity="1" />
                                    <Stop offset="1" stopColor="#00B4DB" stopOpacity="1" />
                                </SvgGradient>
                            </Defs>
                            <SvgText
                                fill="url(#countdownGrad)"
                                fontSize="120"
                                fontWeight="900"
                                x="100"
                                y="115"
                                textAnchor="middle"
                            >
                                {countdown}
                            </SvgText>
                        </Svg>
                    </Animated.View>
                </View>
            )}

            {/* Final Achievement Results */}
            {gameState === 'finished' && (
                <View style={[styles.fullOverlay, { backgroundColor: colors.background }]}>
                    <View style={[styles.achievementContainer, { paddingTop: insets.top + 40 }]}>
                        <View style={styles.medalCircle}>
                            <Trophy size={80} color="#0284C7" fill="#E0F2FE" />
                            <View style={styles.glowEffect} />
                        </View>

                        <Text style={styles.achievementTitle}>Session Complete!</Text>
                        <Text style={styles.achievementScore}>{score}</Text>
                        <Text style={styles.achievementPoints}>POINTS SECURED</Text>

                        <View style={styles.statsSummary}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Hits</Text>
                                <Text style={styles.summaryValue}>{stats.current.positive_hits}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Max Combo</Text>
                                <Text style={styles.summaryValue}>{maxCombo}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Golden</Text>
                                <Text style={styles.summaryValue}>{stats.current.golden_hits}</Text>
                            </View>
                        </View>

                        <View style={[styles.actionWrapper, { paddingBottom: insets.bottom + 20 }]}>
                            <TouchableOpacity
                                style={styles.primaryAction}
                                onPress={restartGame}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#00B4DB', '#0083B0']}
                                    style={styles.playAgainGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.primaryActionText}>Play Again</Text>
                                    <RefreshCcw size={20} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryAction}
                                onPress={goDashboard}
                            >
                                <Text style={styles.secondaryActionText}>Dashboard</Text>
                                <LayoutGrid size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    uiOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        zIndex: 10,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scoreBoard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: 8,
    },
    scoreLabel: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '800',
    },
    scoreValue: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '900',
    },
    timerCircle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    timerValue: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '800',
    },
    comboContainer: {
        alignItems: 'center',
        marginTop: 12,
    },
    comboText: {
        color: '#F59E0B',
        fontSize: 24,
        fontWeight: '900',
    },
    multiplierBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 10,
        paddingVertical: 1,
        borderRadius: 8,
        marginTop: 2,
    },
    multiplierText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
    },
    bubbleContainer: {
        position: 'absolute',
    },
    bubbleTouch: {
        flex: 1,
        overflow: 'hidden',
    },
    bubbleGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    bubbleGloss: {
        position: 'absolute',
        top: '15%',
        left: '15%',
        width: '30%',
        height: '30%',
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    bubblePoints: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 14,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    bubblePenalty: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 12,
    },
    fullOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    countdownText: {
        fontSize: 100,
        fontWeight: '900',
        color: "#0284C7",
    },
    achievementContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    medalCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 15,
    },
    glowEffect: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#E0F2FE',
        opacity: 0.3,
        zIndex: -1,
    },
    achievementTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    achievementScore: {
        fontSize: 80,
        fontWeight: '900',
        color: "#0284C7",
        letterSpacing: -2,
    },
    achievementPoints: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 48,
    },
    statsSummary: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        backgroundColor: colors.surface,
        paddingVertical: 24,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: 'auto',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
    },
    actionWrapper: {
        width: '100%',
        gap: 16,
    },
    primaryAction: {
        width: '100%',
        height: 60,
        borderRadius: 50,
        overflow: 'hidden',
        // shadowColor: '#0284C7',
        // shadowOffset: { width: 0, height: 10 },
        // shadowOpacity: 0.2,
        // shadowRadius: 50,
        // elevation: 8,
    },
    playAgainGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    primaryActionText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    secondaryAction: {
        width: '100%',
        backgroundColor: colors.surface,
        height: 60,
        borderRadius: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    secondaryActionText: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '700',
    }
});
