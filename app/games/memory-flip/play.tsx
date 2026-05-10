import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    DeviceEventEmitter,
    Image,
} from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withSpring,
    Easing,
    runOnJS,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { 
    Clock, 
    Trophy, 
    RefreshCcw, 
    LayoutGrid, 
    Cloud, 
    Moon, 
    Sun, 
    Waves, 
    Leaf, 
    Flower2,
    Star,
    Heart,
    Smile,
    Zap,
    Brain
} from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../contexts/AuthContext';
import { colors, spacing, borderRadius } from '../../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Game Constants
const GAME_DURATION = 60;
const PREVIEW_DURATION = 3000;
const GRID_ROWS = 5;
const GRID_COLS = 4;
const TOTAL_CARDS = GRID_ROWS * GRID_COLS;
const TOTAL_PAIRS = TOTAL_CARDS / 2;

const CARD_MARGIN = 6;
const CARD_WIDTH = (width - spacing.lg * 2 - (CARD_MARGIN * (GRID_COLS + 1))) / GRID_COLS;
const CARD_HEIGHT = CARD_WIDTH;

// Wellness Icons
const WELLNESS_ICONS = [
    { name: 'cloud', component: Cloud, color: '#38BDF8' },
    { name: 'moon', component: Moon, color: '#818CF8' },
    { name: 'sun', component: Sun, color: '#FBBF24' },
    { name: 'waves', component: Waves, color: '#2DD4BF' },
    { name: 'leaf', component: Leaf, color: '#4ADE80' },
    { name: 'flower', component: Flower2, color: '#F472B6' },
    { name: 'heart', component: Heart, color: '#FB7185' },
    { name: 'star', component: Star, color: '#FBBF24' },
    { name: 'smile', component: Smile, color: '#34D399' },
    { name: 'zap', component: Zap, color: '#A78BFA' },
];

interface CardData {
    id: number;
    symbolId: number;
    isMatched: boolean;
}

const Card = React.memo(({ 
    data, 
    isFlipped, 
    onPress, 
    disabled 
}: { 
    data: CardData; 
    isFlipped: boolean; 
    onPress: (index: number) => void;
    disabled: boolean;
}) => {
    const flipAnim = useSharedValue(0);
    const IconComponent = WELLNESS_ICONS[data.symbolId].component;
    const iconColor = WELLNESS_ICONS[data.symbolId].color;

    useEffect(() => {
        flipAnim.value = withSpring(isFlipped ? 180 : 0, {
            damping: 15,
            stiffness: 90,
        });
    }, [isFlipped]);

    const frontAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotateY: `${flipAnim.value}deg` }],
        backfaceVisibility: 'hidden',
    }));

    const backAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotateY: `${flipAnim.value - 180}deg` }],
        backfaceVisibility: 'hidden',
    }));

    const scale = useSharedValue(1);
    const handlePress = () => {
        if (disabled || isFlipped || data.isMatched) return;
        scale.value = withSequence(withTiming(1.05, { duration: 100 }), withTiming(1, { duration: 100 }));
        onPress(data.id);
    };

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <TouchableOpacity 
            onPress={handlePress} 
            activeOpacity={0.9} 
            disabled={disabled || isFlipped || data.isMatched}
            style={styles.cardContainer}
        >
            <Animated.View style={[styles.card, containerStyle]}>
                {/* Back of Card (Hidden) */}
                <Animated.View style={[styles.cardBack, backAnimatedStyle]}>
                    <LinearGradient
                        colors={['#FFFFFF', '#F5F3FF']}
                        style={styles.cardGradient}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
                            <IconComponent size={28} color={iconColor} strokeWidth={2.5} />
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Front of Card (Visible) */}
                <Animated.View style={[styles.cardFront, frontAnimatedStyle]}>
                    <LinearGradient
                        colors={['#8E94F2', '#6E75EF']}
                        style={styles.cardGradientFront}
                    >
                        <View style={styles.cardPattern} />
                        <Brain size={24} color="rgba(255,255,255,0.4)" />
                    </LinearGradient>
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
});

export default function MemoryFlipPlay() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    // Game State
    const [gameState, setGameState] = useState<'countdown' | 'preview' | 'playing' | 'finished'>('countdown');
    const [cards, setCards] = useState<CardData[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [countdown, setCountdown] = useState(3);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [matchesFound, setMatchesFound] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);

    const stats = useRef({
        matches_found: 0,
        wrong_attempts: 0,
        combo_max: 0,
        accuracy: 0,
        completion_time: 0,
        current_score: 0
    });

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Game
    useEffect(() => {
        const symbols = Array.from({ length: TOTAL_PAIRS }, (_, i) => i);
        const pairedSymbols = [...symbols, ...symbols];
        const shuffled = pairedSymbols
            .sort(() => Math.random() - 0.5)
            .map((symbolId, id) => ({
                id,
                symbolId,
                isMatched: false
            }));
        setCards(shuffled);
    }, []);

    // Countdown Logic
    useEffect(() => {
        if (gameState === 'countdown') {
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setGameState('preview');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameState]);

    // Preview Logic
    useEffect(() => {
        if (gameState === 'preview') {
            const timer = setTimeout(() => {
                setGameState('playing');
            }, PREVIEW_DURATION);
            return () => clearTimeout(timer);
        }
    }, [gameState]);

    // Main Timer
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
            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [gameState]);

    const handleCardPress = (id: number) => {
        if (flippedIndices.length === 2) return;

        const selectedCard = cards[id];

        const newFlipped = [...flippedIndices, id];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setTotalAttempts(prev => prev + 1);
            const [firstId, secondId] = newFlipped;
            const firstCard = cards[firstId];
            const secondCard = cards[secondId];

            if (firstCard.symbolId === secondCard.symbolId) {
                // Match Found
                setTimeout(() => {
                    setCards(prev => prev.map(c => 
                        (c.id === firstId || c.id === secondId) ? { ...c, isMatched: true } : c
                    ));
                    setFlippedIndices([]);
                    
                    // Scoring logic
                    const matchBonus = 5;
                    const comboBonus = combo >= 3 ? 3 : (combo >= 2 ? 2 : (combo >= 1 ? 1 : 0));
                    const totalGained = matchBonus + comboBonus;
                    
                    setScore(prev => prev + totalGained);
                    setCombo(prev => {
                        const next = prev + 1;
                        setMaxCombo(m => Math.max(m, next));
                        return next;
                    });
                    setMatchesFound(prev => {
                        const next = prev + 1;
                        if (next === TOTAL_PAIRS) endGame();
                        return next;
                    });
                }, 500);
            } else {
                // Mismatch
                setCombo(0);
                setScore(prev => Math.max(0, prev - 1));
                stats.current.wrong_attempts++;
                setTimeout(() => {
                    setFlippedIndices([]);
                }, 800);
            }
        }
    };

    const endGame = async () => {
        setGameState('finished');
        if (timerRef.current) clearInterval(timerRef.current);

        const accuracy = totalAttempts > 0 ? Math.round((matchesFound / totalAttempts) * 100) : 0;
        const completionTime = GAME_DURATION - timeLeft;
        
        stats.current = {
            ...stats.current,
            matches_found: matchesFound,
            combo_max: maxCombo,
            accuracy,
            completion_time: completionTime,
            current_score: score
        };

        try {
            if (!user) return;

            // 1. Get Game ID
            const { data: gameData } = await supabase
                .from('games')
                .select('id')
                .eq('slug', 'memory-flip')
                .single();

            if (gameData) {
                const gameId = gameData.id;

                // 2. Insert Session
                const { error: sessionError } = await supabase
                    .from('game_sessions')
                    .insert({
                        user_id: user.id,
                        game_id: gameId,
                        score: score,
                        duration_seconds: completionTime,
                        is_completed: true,
                        metadata: {
                            ...stats.current,
                            device_fps: 60
                        }
                    });

                if (sessionError) throw sessionError;
                // console.log('[MEMORY_FLIP] Session stored successfully');

                // 3. Update User Stats
                const { data: existingStats } = await supabase
                    .from('game_user_stats')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('game_id', gameId)
                    .maybeSingle();

                let finalStats: any;
                const currentSessionScore = Number(score) || 0;

                if (existingStats) {
                    const prevHighest = Number(existingStats.highest_score) || 0;
                    const prevTotal = Number(existingStats.total_score) || 0;
                    const prevSessions = Number(existingStats.total_sessions) || 0;
                    const prevTime = Number(existingStats.total_play_time) || 0;

                    finalStats = {
                        highest_score: Math.max(prevHighest, currentSessionScore),
                        total_score: prevTotal + currentSessionScore,
                        total_sessions: prevSessions + 1,
                        total_play_time: prevTime + completionTime,
                        last_played_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    await supabase
                        .from('game_user_stats')
                        .update(finalStats)
                        .eq('user_id', user.id)
                        .eq('game_id', gameId);
                } else {
                    finalStats = {
                        user_id: user.id,
                        game_id: gameId,
                        total_score: currentSessionScore,
                        highest_score: currentSessionScore,
                        total_sessions: 1,
                        total_play_time: completionTime,
                        last_played_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    await supabase
                        .from('game_user_stats')
                        .insert(finalStats);
                }

                // 4. Update Local Cache Immediately
                const SLUG = 'memory-flip';
                await AsyncStorage.setItem(`game_stats_${SLUG}_${user.id}`, JSON.stringify(finalStats));
                
                // 5. Signal Dashboard Refresh
                DeviceEventEmitter.emit('memory_flip_refresh');
            }
        } catch (err) {
            console.error('[MEMORY_FLIP] Error submitting score or updating stats:', err);
        }
    };

    const restartGame = () => {
        setScore(0);
        setTimeLeft(GAME_DURATION);
        setCombo(0);
        setMaxCombo(0);
        setMatchesFound(0);
        setTotalAttempts(0);
        setFlippedIndices([]);
        const symbols = Array.from({ length: TOTAL_PAIRS }, (_, i) => i);
        const pairedSymbols = [...symbols, ...symbols];
        const shuffled = pairedSymbols
            .sort(() => Math.random() - 0.5)
            .map((symbolId, id) => ({
                id,
                symbolId,
                isMatched: false
            }));
        setCards(shuffled);
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
            router.replace('/games/memory-flip');
        }
        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Gameplay HUD */}
            {(gameState === 'playing' || gameState === 'preview') && (
                <View style={[styles.uiOverlay, { paddingTop: insets.top + 10 }]}>
                    <View style={styles.topRow}>
                        <View style={styles.scoreBoard}>
                            <Text style={styles.scoreLabel}>POINTS</Text>
                            <Text style={styles.scoreValue}>{score}</Text>
                        </View>

                        <View style={styles.timerCircle}>
                            <Clock size={14} color="#6E75EF" />
                            <Text style={styles.timerValue}>{timeLeft}s</Text>
                        </View>
                    </View>

                    {gameState === 'preview' ? (
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>MEMORIZE CARDS...</Text>
                        </View>
                    ) : (
                        combo > 1 && (
                            <View style={styles.comboBadge}>
                                <Zap size={14} color="#FFF" fill="#FFF" />
                                <Text style={styles.comboText}>{combo} COMBO!</Text>
                            </View>
                        )
                    )}
                </View>
            )}

            {/* Grid Rendering */}
            {(gameState === 'playing' || gameState === 'preview') && (
                <View style={styles.gridWrapper}>
                    <View style={styles.grid}>
                        {cards.map((card, index) => (
                            <Card
                                key={card.id}
                                data={card}
                                isFlipped={gameState === 'preview' || card.isMatched || flippedIndices.includes(index)}
                                onPress={handleCardPress}
                                disabled={gameState !== 'playing'}
                            />
                        ))}
                    </View>
                </View>
            )}

            {/* Countdown */}
            {gameState === 'countdown' && (
                <View style={styles.fullOverlay}>
                    <Svg height="150" width="200" viewBox="0 0 200 150">
                        <Defs>
                            <SvgGradient id="countdownGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#6E75EF" stopOpacity="1" />
                                <Stop offset="1" stopColor="#8E94F2" stopOpacity="1" />
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
                </View>
            )}

            {/* Finished Screen */}
            {gameState === 'finished' && (
                <View style={[styles.fullOverlay, { backgroundColor: colors.background }]}>
                    <View style={[styles.achievementContainer, { paddingTop: insets.top + 40 }]}>
                        <View style={styles.medalCircle}>
                            <Trophy size={80} color="#6E75EF" fill="#F5F3FF" />
                            <View style={styles.glowEffect} />
                        </View>

                        <Text style={styles.achievementTitle}>Memory Mastered!</Text>
                        <Text style={styles.achievementScore}>{score}</Text>
                        <Text style={styles.achievementPoints}>SCORE ACHIEVED</Text>

                        <View style={styles.statsSummary}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Accuracy</Text>
                                <Text style={styles.summaryValue}>{Math.round((matchesFound / Math.max(1, totalAttempts)) * 100)}%</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Max Combo</Text>
                                <Text style={styles.summaryValue}>{maxCombo}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Time</Text>
                                <Text style={styles.summaryValue}>{GAME_DURATION - timeLeft}s</Text>
                            </View>
                        </View>

                        <View style={[styles.actionWrapper, { paddingBottom: insets.bottom + 20 }]}>
                            <TouchableOpacity style={styles.primaryAction} onPress={restartGame}>
                                <LinearGradient colors={['#8E94F2', '#6E75EF']} style={styles.playAgainGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <Text style={styles.primaryActionText}>Play Again</Text>
                                    <RefreshCcw size={20} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryAction} onPress={goDashboard}>
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
        alignItems: 'center',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
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
        borderColor: '#6E75EF40',
    },
    timerValue: {
        color: '#6E75EF',
        fontSize: 14,
        fontWeight: '800',
    },
    statusBadge: {
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#6E75EF30',
    },
    statusText: {
        color: '#6E75EF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    comboBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 12,
        gap: 6,
    },
    comboText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
    },
    gridWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    cardContainer: {
        margin: CARD_MARGIN / 2,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
    },
    cardBack: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12,
        backgroundColor: '#FFF',
        backfaceVisibility: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
    },
    cardFront: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12,
        backfaceVisibility: 'hidden',
        overflow: 'hidden',
    },
    cardGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardGradientFront: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardPattern: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        opacity: 0.1,
    },
    fullOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
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
        shadowColor: '#6E75EF',
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
        backgroundColor: '#F5F3FF',
        opacity: 0.5,
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
        color: '#6E75EF',
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
        elevation: 8,
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
