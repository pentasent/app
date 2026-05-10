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
    Trophy,
    Sparkles,
    Brain,
    Star,
    Clock,
    User,
    ChevronDown,
    LayoutGrid,
    Layers,
    Gamepad2
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

// Shared animation values for flipping sync (Similar to MemoryFlipCard)
const sharedFlip1 = new Animated.Value(0);
const sharedFlip2 = new Animated.Value(0);
const sharedFlip3 = new Animated.Value(0);

const startFlipAnim = (val: Animated.Value, delay: number, duration: number) => {
    Animated.loop(
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, {
                toValue: 1,
                duration: duration / 2,
                useNativeDriver: true,
            }),
            Animated.timing(val, {
                toValue: 2,
                duration: duration / 2,
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

startFlipAnim(sharedFlip1, 0, 5000);
startFlipAnim(sharedFlip2, 1200, 6000);
startFlipAnim(sharedFlip3, 2500, 5500);

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

export default function MemoryFlipHome() {
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
        name: 'Memory Flip',
        description: 'Match symbols to sharpen your focus and memory.'
    };

    const SLUG = 'memory-flip';

    const renderBtnFlip = (anim: Animated.Value, size: number, top: string | number, left: string | number) => {
        const rotateY = anim.interpolate({
            inputRange: [0, 1, 2],
            outputRange: ['0deg', '180deg', '360deg'],
        });
        
        const opacity = anim.interpolate({
            inputRange: [0, 0.2, 0.8, 1, 1.2, 1.8, 2],
            outputRange: [0, 0.4, 0.4, 0.2, 0.4, 0.4, 0],
        });

        const scale = anim.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [0.7, 1.1, 0.7],
        });

        return (
            <Animated.View 
                style={[
                    styles.footerBgCard, 
                    { 
                        width: size, 
                        height: size, 
                        top: top as any,
                        left: left as any, 
                        transform: [{ rotateY }, { scale }] as any,
                        opacity 
                    }
                ]}
            >
                <View style={styles.cardGlossBtn} />
            </Animated.View>
        );
    };

    useFocusEffect(
        useCallback(() => {
            loadCachedData();
            fetchDynamicData(true);
            
            const timer = setTimeout(() => {
                fetchDynamicData(true);
            }, 1000);

            return () => clearTimeout(timer);
        }, [user])
    );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('memory_flip_refresh', () => {
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
                // Fetch User Stats
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

                // Fetch Leaderboard
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
            
            {/* Header */}
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
                        <Gamepad2 size={24} color="#6E75EF" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* Stats Row */}
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

                {/* Daily Streak Section */}
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
                                    <Sparkles size={16} color="#6E75EF" />
                                    <Text style={styles.motivationText}>Sharp mind! You've secured your streak for today. Keep flipping! 🧠</Text>
                                </View>
                            ) : (
                                <Text style={styles.emptyStreakMsg}>Start playing today to build your streak! ✨</Text>
                            )}
                        </>
                    )}
                </View>

                {/* How to Play */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>How to Play</Text>
                    </View>
                    <View style={[
                        styles.instructionsCard,
                        !isHowToPlayExpanded && styles.instructionsCardCollapsed
                    ]}>
                        {/* Pair Matching */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <LinearGradient colors={['#8E94F2', '#6E75EF']} style={styles.instructionIconBg}>
                                    <Layers size={14} color="#FFF" />
                                </LinearGradient>
                                <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.instructionText}>
                                <Text style={styles.instructionTitle}>Find Pairs</Text>
                                <Text style={styles.instructionDesc}>Tap cards to reveal symbols. Find matching pairs to clear them from the grid.</Text>
                            </View>
                        </View>

                        {/* Focus */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <LinearGradient colors={['#A5B4FC', '#6366F1']} style={styles.instructionIconBg}>
                                    <Brain size={14} color="#FFF" />
                                </LinearGradient>
                                <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.instructionText}>
                                <Text style={styles.instructionTitle}>Sharp Focus</Text>
                                <Text style={styles.instructionDesc}>Consecutive matches build your combo for massive score bonuses (+5 per match).</Text>
                            </View>
                        </View>

                        {/* Grid */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <LinearGradient colors={['#C4B5FD', '#8B5CF6']} style={styles.instructionIconBg}>
                                    <LayoutGrid size={14} color="#FFF" />
                                </LinearGradient>
                                <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.instructionText}>
                                <Text style={styles.instructionTitle}>Clear the Grid</Text>
                                <Text style={styles.instructionDesc}>Clear all 16 cards (8 pairs) to complete the level and earn high-tier bonuses.</Text>
                            </View>
                        </View>

                        {/* Timer */}
                        <View style={styles.instructionItem}>
                            <View style={styles.timelineCol}>
                                <View style={[styles.instructionIconBg, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]}>
                                    <Clock size={16} color="#64748B" />
                                </View>
                            </View>
                            <View style={[styles.instructionText, { paddingBottom: 0 }]}>
                                <Text style={styles.instructionTitle}>60s Mastery</Text>
                                <Text style={styles.instructionDesc}>You have 60 seconds to clear the grid and secure your place on the leaderboard.</Text>
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
                                    <ChevronDown size={16} color="#6E75EF" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* Leaderboard */}
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
                                            <Text style={styles.currentUserName}>Your Mind Score</Text>
                                            <Text style={styles.currentUserScore}>Lifetime Points: {formatNumber(userStats.total_score)} pts</Text>
                                        </View>
                                        <Medal size={24} color="#6E75EF" />
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
                                                            <Trophy size={10} color="#6E75EF" />
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
                                <Text style={styles.emptyLBMsg}>Be the first to master the grid! 🏆</Text>
                            </View>
                        )
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                <TouchableOpacity 
                    style={styles.playBtn}
                    onPress={() => {
                        if (isNavigating.current) return;
                        isNavigating.current = true;
                        router.push('/games/memory-flip/play');
                        setTimeout(() => {
                            isNavigating.current = false;
                        }, 500);
                    }}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#8E94F2', '#6E75EF']}
                        style={styles.playBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {/* Animated Background Cards */}
                        {renderBtnFlip(sharedFlip1, 30, '15%', '10%')}
                        {renderBtnFlip(sharedFlip2, 24, '60%', '85%')}
                        {renderBtnFlip(sharedFlip3, 28, '30%', '50%')}

                        <View style={styles.btnContent}>
                            <Brain size={20} color="#FFF" />
                            <Text style={styles.playBtnText}>Play Memory Flip</Text>
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
        borderColor: '#6E75EF',
    },
    todayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#6E75EF',
    },
    dayLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
    },
    dayLabelToday: {
        color: '#6E75EF',
        fontWeight: '800',
    },
    motivationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F5F3FF',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    motivationText: {
        flex: 1,
        fontSize: 13,
        color: '#4F46E5',
        fontWeight: '600',
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
        color: '#6E75EF',
    },
    instructionItem: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    timelineCol: {
        alignItems: 'center',
    },
    instructionIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
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
        backgroundColor: '#F5F3FF',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#E0E7FF',
        marginBottom: spacing.sm,
        position: 'relative',
        overflow: 'hidden',
    },
    tiltedRankBadge: {
        position: 'absolute',
        top: 8,
        left: -20,
        backgroundColor: '#6E75EF',
        paddingHorizontal: 25,
        paddingVertical: 4,
        transform: [{ rotate: '-40deg' }],
        zIndex: 10,
        shadowColor: '#6E75EF',
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
        backgroundColor: '#6E75EF',
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
        color: '#6E75EF',
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
        borderColor: '#6E75EF',
        backgroundColor: '#F5F3FF',
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
    },
    inlineRankText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6E75EF',
    },
    scoreCol: {
        alignItems: 'flex-end',
    },
    lbScore: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    lbScoreLabel: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '700',
        letterSpacing: 1,
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
        shadowColor: '#6E75EF',
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
    footerBgCard: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 4,
    },
    cardGlossBtn: {
        position: 'absolute',
        top: '15%',
        left: '15%',
        width: '30%',
        height: '30%',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    playBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
