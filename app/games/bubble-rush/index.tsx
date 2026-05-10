import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    SafeAreaView, 
    Dimensions,
    StatusBar as RNStatusBar,
    Image,
    Animated,
    DeviceEventEmitter
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { COUNTRIES } from '@/lib/country';
import { getImageUrl } from '@/utils/get-image-url';
import { LinearGradient } from 'expo-linear-gradient';
import { 
    Medal,
    Bomb,
    Trophy,
    Sparkles,
    Gamepad2,
    Star,
    Clock,
    User,
    ChevronDown,
} from 'lucide-react-native';
import { formatNumber } from '@/utils/format';
import { colors, spacing, borderRadius, typography } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../contexts/AuthContext';
import { GameUserStat } from '@/types/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    GameStatsShimmer, 
    GameStreakShimmer, 
    GameLeaderboardShimmer 
} from '@/components/shimmers/GameDetailShimmer';

// Shared animation values for bubble sync (Same as BubbleGameCard)
const sharedBubble1 = new Animated.Value(0);
const sharedBubble2 = new Animated.Value(0);
const sharedBubble3 = new Animated.Value(0);

const startBubbleAnim = (val: Animated.Value, delay: number, duration: number) => {
    Animated.loop(
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, {
                toValue: 1,
                duration,
                useNativeDriver: true,
            }),
            Animated.timing(val, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            })
        ])
    ).start();
};

startBubbleAnim(sharedBubble1, 0, 4000);
startBubbleAnim(sharedBubble2, 1500, 5000);
startBubbleAnim(sharedBubble3, 3000, 4500);

const { width } = Dimensions.get('window');

type LeaderboardEntry = {
    user_id: string;
    highest_score: number;
    name: string;
    avatar_url: string | null;
    country: string | null;
    rank: number;
    total_score: number;
};

export default function BubbleRushHome() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const isNavigating = useRef(false);
    
    const [statsLoading, setStatsLoading] = useState(true);
    const [lbLoading, setLbLoading] = useState(true);
    const [userStats, setUserStats] = useState<GameUserStat | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [isHowToPlayExpanded, setIsHowToPlayExpanded] = useState(false);

    // Static Game Info
    const GAME_INFO = {
        id: 'bubble-rush-id',
        name: 'Bubble Rush',
        description: 'Pop bubbles to relax and focus.'
    };

    const SLUG = 'bubble-rush';

    const renderBtnBubble = (anim: Animated.Value, size: number, left: string | number, value: string) => {
        const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [60, -60], 
        });
        const opacity = anim.interpolate({
            inputRange: [0, 0.2, 0.8, 1],
            outputRange: [0, 0.6, 0.6, 0],
        });
        const scale = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.7, 1.1, 0.9],
        });

        return (
            <Animated.View 
                style={[
                    styles.footerBubble, 
                    { 
                        width: size, 
                        height: size, 
                        borderRadius: size / 2, 
                        left: left as any, 
                        transform: [{ translateY }, { scale }] as any,
                        opacity 
                    }
                ]}
            >
                <View style={styles.bubbleGlossBtn} />
                <Text style={styles.bubbleTextBtn}>{value}</Text>
            </Animated.View>
        );
    };

    useFocusEffect(
        useCallback(() => {
            loadCachedData();
            // Silent refresh on focus to avoid blinking
            fetchDynamicData(true);
            
            const timer = setTimeout(() => {
                fetchDynamicData(true);
            }, 1000);

            return () => clearTimeout(timer);
        }, [user])
    );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('bubble_rush_refresh', () => {
            loadCachedData();
            fetchDynamicData(true);
        });
        return () => sub.remove();
    }, [user]);

    const loadCachedData = async () => {
        if (!user) return;
        try {
            const cachedStats = await AsyncStorage.getItem(`game_stats_${SLUG}_${user.id}`);
            const cachedLB = await AsyncStorage.getItem(`game_leaderboard_${SLUG}`);
            const cachedRank = await AsyncStorage.getItem(`game_rank_${SLUG}_${user.id}`);

            if (cachedStats) {
                setUserStats(JSON.parse(cachedStats));
                setStatsLoading(false);
            }
            if (cachedLB) {
                setLeaderboard(JSON.parse(cachedLB));
                setLbLoading(false);
            }
            if (cachedRank) {
                setUserRank(parseInt(cachedRank, 10));
            }
        } catch (e) {
            console.error('Error loading cached game data:', e);
        }
    };

    const fetchDynamicData = async (silent = false) => {
        try {
            if (!user) return;
            
            if (!silent) {
                setStatsLoading(true);
                setLbLoading(true);
            }

            const { data: gameData } = await supabase
                .from('games')
                .select('id')
                .eq('slug', SLUG)
                .single();

            if (gameData) {
                // 2. Fetch User Stats
                const { data: statsData } = await supabase
                    .from('game_user_stats')
                    .select('*')
                    .eq('game_id', gameData.id)
                    .eq('user_id', user.id)
                    .maybeSingle();
                
                setUserStats(statsData);
                setStatsLoading(false);
                if (statsData) {
                    AsyncStorage.setItem(`game_stats_${SLUG}_${user.id}`, JSON.stringify(statsData));
                }

                // 3. Fetch Leaderboard
                const { data: lbData } = await supabase
                    .from('game_user_stats')
                    .select(`
                        user_id,
                        highest_score,
                        total_score,
                        users (
                            name,
                            avatar_url,
                            country
                        )
                    `)
                    .eq('game_id', gameData.id)
                    .order('highest_score', { ascending: false })
                    .limit(10);

                if (lbData) {
                    const formattedLB = lbData.map((item: any, index) => ({
                        user_id: item.user_id,
                        highest_score: item.highest_score,
                        name: item.users?.name || 'Anonymous',
                        avatar_url: item.users?.avatar_url,
                        country: item.users?.country,
                        rank: index + 1,
                        total_score: item.total_score
                    }));
                    setLeaderboard(formattedLB);
                    AsyncStorage.setItem(`game_leaderboard_${SLUG}`, JSON.stringify(formattedLB));

                    // Find current user rank
                    let rank: number | null = null;
                    const myLBIndex = formattedLB.findIndex(e => e.user_id === user.id);
                    if (myLBIndex !== -1) {
                        rank = myLBIndex + 1;
                    } else if (statsData) {
                        const { count } = await supabase
                            .from('game_user_stats')
                            .select('*', { count: 'exact', head: true })
                            .eq('game_id', gameData.id)
                            .gt('highest_score', statsData.highest_score || 0);
                        
                        rank = (count || 0) + 1;
                    }
                    if (rank !== null) {
                        setUserRank(rank);
                        AsyncStorage.setItem(`game_rank_${SLUG}_${user.id}`, rank.toString());
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching dynamic game data:', error);
        } finally {
            setStatsLoading(false);
            setLbLoading(false);
        }
    };

    const streakDays = useMemo(() => {
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const today = new Date();
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dayName = days[date.getDay()];
            const isCompleted = userStats && i === 0; 
            result.push({
                day: dayName,
                isToday: i === 0,
                isCompleted: !!isCompleted
            });
        }
        return result;
    }, [userStats]);

    return (
        <SafeAreaView style={styles.container}>
            <RNStatusBar barStyle="dark-content" />
            
            {/* Header (Loader-Free) */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>{GAME_INFO.name}</Text>
                        <Text style={styles.headerSubtitle}>{GAME_INFO.description}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => {
                            if (isNavigating.current) return;
                            isNavigating.current = true;
                            router.push('/(tabs)/explore');
                            setTimeout(() => {
                                isNavigating.current = false;
                            }, 500);
                        }}
                    >
                        <Gamepad2 size={24} color="#0083B0" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* Stats Row (Shimmer) */}
                {statsLoading ? (
                    <GameStatsShimmer />
                ) : (
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Best Score</Text>
                            <Text style={styles.statValue}>{userStats?.highest_score || '0'}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Global Rank</Text>
                            <Text style={styles.statValue}>#{userRank || '--'}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Plays</Text>
                            <Text style={styles.statValue}>{userStats?.total_sessions || '0'}</Text>
                        </View>
                    </View>
                )}

                {/* Daily Streak Section (Shimmer) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Daily Progress</Text>
                        {userStats?.streak_days ? (
                            <View style={styles.streakInfo}>
                                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.streakText}>{userStats.streak_days} Day Streak</Text>
                            </View>
                        ) : null}
                    </View>
                    
                    {statsLoading ? (
                        <GameStreakShimmer />
                    ) : (
                        <>
                            <View style={styles.streakWrapper}>
                                {streakDays.map((day, idx) => (
                                    <View key={idx} style={styles.streakDay}>
                                        <View style={[
                                            styles.streakCircle,
                                            day.isCompleted && styles.streakCircleCompleted,
                                            day.isToday && styles.streakCircleToday
                                        ]}>
                                            {day.isCompleted ? (
                                                <Star size={14} color="#FFF" fill="#FFF" />
                                            ) : day.isToday ? (
                                                <View style={styles.todayDot} />
                                            ) : null}
                                        </View>
                                        <Text style={[
                                            styles.dayLabel,
                                            day.isToday && styles.dayLabelToday
                                        ]}>{day.day}</Text>
                                    </View>
                                ))}
                            </View>
                            {userStats && userStats.last_played_at && new Date(userStats.last_played_at).toDateString() === new Date().toDateString() ? (
                                <View style={styles.motivationBox}>
                                    <Sparkles size={16} color="#0083B0" />
                                    <Text style={styles.motivationText}>Great job! You've secured your streak for today. Keep it up! 🔥</Text>
                                </View>
                            ) : (
                                <Text style={styles.emptyStreakMsg}>Start playing today to build your streak! ✨</Text>
                            )}
                        </>
                    )}
                </View>

                {/* Instructions (Loader-Free) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>How to Play</Text>
                    </View>
                    <View style={[
                        styles.instructionsCard,
                        !isHowToPlayExpanded && styles.instructionsCardCollapsed
                    ]}>
                        {/* Positive */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <LinearGradient
                                    colors={['#38BDF8', '#0284C7']}
                                    style={styles.instructionBubble}
                                >
                                    <View style={styles.bubbleGlossMini} />
                                    <Text style={styles.bubblePointsMini}>+10</Text>
                                </LinearGradient>
                                <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.instructionText}>
                                <Text style={styles.instructionTitle}>Target Positive</Text>
                                <Text style={styles.instructionDesc}>Tap blue bubbles to earn points. Build your combo for multipliers!</Text>
                            </View>
                        </View>

                        {/* Negative */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <LinearGradient
                                    colors={['#F87171', '#DC2626']}
                                    style={styles.instructionBubble}
                                >
                                    <View style={styles.bubbleGlossMini} />
                                    <Text style={styles.bubblePointsMini}>-20</Text>
                                </LinearGradient>
                                <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.instructionText}>
                                <Text style={styles.instructionTitle}>Avoid Negative</Text>
                                <Text style={styles.instructionDesc}>Red bubbles penalize your score and reset your combo. Be careful!</Text>
                            </View>
                        </View>

                        {/* Golden */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <LinearGradient
                                    colors={['#FCD34D', '#D97706']}
                                    style={styles.instructionBubble}
                                >
                                    <View style={styles.bubbleGlossMini} />
                                    <Star size={14} color="#FFF" fill="#FFF" />
                                </LinearGradient>
                                <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.instructionText}>
                                <Text style={styles.instructionTitle}>Golden Star</Text>
                                <Text style={styles.instructionDesc}>Rare +100 points! These are the ultimate boosters for your rank.</Text>
                            </View>
                        </View>

                        {/* Bomb */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <LinearGradient
                                    colors={['#64748B', '#334155']}
                                    style={styles.instructionBubble}
                                >
                                    <View style={styles.bubbleGlossMini} />
                                    <Bomb size={14} color="#FCA5A5" />
                                </LinearGradient>
                                <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.instructionText}>
                                <Text style={styles.instructionTitle}>Danger Bomb</Text>
                                <Text style={styles.instructionDesc}>Heavy penalty (-50) and a major setback. Avoid at all costs!</Text>
                            </View>
                        </View>

                        {/* Timer */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <View style={[styles.instructionBubble, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]}>
                                    <Clock size={16} color="#64748B" />
                                </View>
                            </View>
                            <View style={[styles.instructionText, { paddingBottom: 0 }]}>
                                <Text style={styles.instructionTitle}>30s Sprint</Text>
                                <Text style={styles.instructionDesc}>You have 30 seconds to secure the highest score possible!</Text>
                            </View>
                        </View>
                        
                        {!isHowToPlayExpanded && (
                            <>
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.9)', '#FFFFFF']}
                                    style={styles.smokeEffect}
                                />
                                <TouchableOpacity 
                                    style={styles.expandBtnOverlay}
                                    onPress={() => setIsHowToPlayExpanded(true)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.expandBtnText}>Read More</Text>
                                    <ChevronDown size={16} color="#0083B0" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* Leaderboard Section (Shimmer) */}
                <View style={[styles.section, { marginBottom: 120 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Top Performers</Text>
                    </View>
                    
                    {lbLoading ? (
                        <GameLeaderboardShimmer />
                    ) : (
                        leaderboard.length > 0 ? (
                            <View style={styles.leaderboardWrapper}>
                                {userStats && (
                                    <View style={styles.currentUserRankCard}>
                                        <View style={styles.tiltedRankBadge}>
                                            <Text style={styles.tiltedRankText}>RANK #{userRank}</Text>
                                        </View>
                                        <View style={styles.currentUserAvatar}>
                                            {user?.avatar_url ? (
                                                <Image 
                                                    source={{ uri: getImageUrl(user.avatar_url) }} 
                                                    style={styles.lbAvatarImg} 
                                                />
                                            ) : (
                                                <User size={20} color="#FFF" />
                                            )}
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.currentUserName}>Your Performance</Text>
                                            <Text style={styles.currentUserScore}>Lifetime Points: {formatNumber(userStats.total_score)} pts</Text>
                                        </View>
                                        <Medal size={24} color="#0083B0" />
                                    </View>
                                )}

                                {leaderboard.map((item) => {
                                    const userCountry = COUNTRIES.find(c => c.label === item.country || c.code === item.country);
                                    
                                    return (
                                            <View 
                                                key={item.user_id} 
                                                style={[
                                                    styles.lbItem,
                                                    item.user_id === user?.id && styles.lbItemActive
                                                ]}
                                            >
                                                <View style={styles.lbAvatar}>
                                                    {item.avatar_url ? (
                                                        <Image 
                                                            source={{ uri: getImageUrl(item.avatar_url) }} 
                                                            style={styles.lbAvatarImg} 
                                                        />
                                                    ) : (
                                                        <Text style={styles.lbAvatarText}>{item.name[0]}</Text>
                                                    )}
                                                </View>
                                                <View style={styles.lbInfo}>
                                                    <Text style={styles.lbName} numberOfLines={1}>{item.name}</Text>
                                                    <View style={styles.countryRankRow}>
                                                        {item.country && (
                                                            <View style={styles.countryRow}>
                                                                <Text style={styles.countryFlag}>{userCountry?.flag || '🌍'}</Text>
                                                                <Text style={styles.countryName}>{userCountry?.label || item.country}</Text>
                                                            </View>
                                                        )}
                                                        <View style={styles.rankDot} />
                                                        <View style={styles.inlineRank}>
                                                            <Trophy size={10} color="#0083B0" />
                                                            <Text style={styles.inlineRankText}>Rank {item.rank}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <View style={styles.scoreCol}>
                                                    <Text style={styles.lbScore}>{formatNumber(item.total_score)}</Text>
                                                    <Text style={styles.lbScoreLabel}>PTS</Text>
                                                </View>
                                            </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={styles.emptyLB}>
                                <Text style={styles.emptyLBMsg}>No champions yet. Be the first to lead! 🏆</Text>
                            </View>
                        )
                    )}
                </View>
            </ScrollView>

            {/* Play Button Footer (Loader-Free) */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                <TouchableOpacity 
                    style={styles.playBtn}
                    onPress={() => {
                        if (isNavigating.current) return;
                        isNavigating.current = true;
                        router.push('/games/bubble-rush/play');
                        setTimeout(() => {
                            isNavigating.current = false;
                        }, 500);
                    }}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#00B4DB', '#0083B0']}
                        style={styles.playBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {/* Animated Background Bubbles */}
                        {renderBtnBubble(sharedBubble1, 30, '10%', '+10')}
                        {renderBtnBubble(sharedBubble2, 24, '80%', '+50')}
                        {renderBtnBubble(sharedBubble3, 28, '45%', '-30')}

                        <View style={styles.btnContent}>
                            <Gamepad2 size={20} color="#FFF" />
                            <Text style={styles.playBtnText}>Play Bubble Rush</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textLight,
        width: width * 0.7,
    },
    homeButton: {
        padding: 8,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    scrollContent: {
        paddingTop: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E2E8F0',
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    streakInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    streakText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F59E0B',
    },
    streakWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    streakDay: {
        alignItems: 'center',
        gap: 8,
    },
    streakCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakCircleCompleted: {
        backgroundColor: '#F59E0B',
    },
    streakCircleToday: {
        borderWidth: 2,
        borderColor: '#0083B0',
    },
    todayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#0083B0',
    },
    dayLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
    },
    dayLabelToday: {
        color: '#0083B0',
        fontWeight: '800',
    },
    emptyStreakMsg: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 24,
        fontStyle: 'italic',
    },
    instructionsCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        position: 'relative',
    },
    instructionsCardCollapsed: {
        height: 200,
        overflow: 'hidden',
    },
    smokeEffect: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    expandBtnOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        zIndex: 10,
    },
    expandBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0083B0',
    },
    instructionItem: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    timelineCol: {
        alignItems: 'center',
    },
    instructionBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    bubbleGlossMini: {
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '30%',
        height: '30%',
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    bubblePointsMini: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.borderLight,
        marginVertical: 4,
    },
    instructionText: {
        flex: 1,
        paddingBottom: 20,
    },
    instructionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    instructionDesc: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 18,
    },
    leaderboardWrapper: {
        gap: spacing.md,
    },
    currentUserRankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        marginBottom: spacing.sm,
        position: 'relative',
        overflow: 'hidden',
    },
    tiltedRankBadge: {
        position: 'absolute',
        top: 8,
        left: -20,
        backgroundColor: '#0083B0',
        paddingHorizontal: 25,
        paddingVertical: 4,
        transform: [{ rotate: '-40deg' }],
        zIndex: 10,
        shadowColor: '#0083B0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    tiltedRankText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    currentUserAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0083B0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        overflow: 'hidden',
    },
    userInfo: {
        flex: 1,
    },
    currentUserName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    currentUserScore: {
        fontSize: 13,
        color: '#0083B0',
        fontWeight: '600',
    },
    lbItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    lbItemActive: {
        borderColor: '#0083B0',
        backgroundColor: '#F0F9FF',
    },
    lbRank: {
        display: 'none',
    },
    lbAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.borderLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        overflow: 'hidden',
    },
    lbAvatarImg: {
        width: '100%',
        height: '100%',
    },
    lbAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    lbInfo: {
        flex: 1,
        gap: 4,
    },
    lbName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    countryRankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    countryFlag: {
        fontSize: 14,
    },
    countryName: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '600',
    },
    rankDot: {
        width: 4,
        height: 4,
        borderRadius: 4,
        backgroundColor: colors.textMuted,
        opacity: 0.5,
    },
    inlineRank: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        // backgroundColor: colors.primary + '08',
        // paddingHorizontal: 6,
        // paddingVertical: 2,
        // borderRadius: 4,
    },
    inlineRankText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0083B0',
    },
    scoreCol: {
        alignItems: 'flex-end',
    },
    lbScore: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    lbScoreLabel: {
        fontSize: 9,
        color: colors.textMuted,
        fontWeight: '700',
    },
    motivationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.md,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    motivationText: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
        fontWeight: '600',
        lineHeight: 18,
    },
    emptyLB: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyLBMsg: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    playBtn: {
        height: 58,
        borderRadius: 80,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#0083B0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    playBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        zIndex: 2,
    },
    footerBubble: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubbleGlossBtn: {
        position: 'absolute',
        top: '15%',
        left: '15%',
        width: '30%',
        height: '30%',
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    bubbleTextBtn: {
        fontSize: 8,
        fontWeight: '900',
        color: '#FFF',
        opacity: 0.8,
    },
    playBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
