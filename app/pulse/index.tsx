import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import crashlytics from '@/lib/crashlytics';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { LayoutGrid, Sparkles, TrendingUp, Info, Calendar } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth, supabase } from '../../contexts/AuthContext';
import { MOODS, SUGGESTIONS, getSuggestionRule } from '../../constants/moods';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { UserDailyCheckin } from '@/types/database';
import { MoodCheckInSheet } from '../../components/pulse/MoodCheckInSheet';
import { PulseShimmer } from '../../components/shimmers/PulseShimmer';

const { width } = Dimensions.get('window');

const INSIGHTS = [
    "Your mood improves when your sleep is good.",
    "High stress days are a good time for breathing exercises.",
    "Journaling helps when your mind feels heavy.",
    "Consistency in small habits improves mental clarity.",
    "Taking a pause is productive too.",
];

export default function PulseAnalyticsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [checkins, setCheckins] = useState<UserDailyCheckin[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCheckinSheet, setShowCheckinSheet] = useState(false);

    useEffect(() => {
        if (user) {
            fetchCheckins();
        }
    }, [user]);

    const getScoreColor = (score: number, type: 'stress' | 'other'): string => {
        const stressColors = ['#10B981', '#34D399', '#F59E0B', '#EF4444', '#B91C1C'];
        const otherColors = ['#B91C1C', '#EF4444', '#F59E0B', '#34D399', '#10B981'];
        const colorsArr = type === 'stress' ? stressColors : otherColors;
        return colorsArr[Math.max(0, Math.min(score - 1, 4))];
    };

    const fetchCheckins = async () => {
        try {
            const { data, error } = await supabase
                .from('user_daily_checkins')
                .select('*')
                .eq('user_id', user?.id)
                .order('checkin_date', { ascending: false })
                .limit(14); // Fetch 2 weeks for good measure

            if (error) throw error;
            setCheckins(data || []);
        } catch (error) {
            console.log('[ERROR]:', 'Error fetching pulse data:', error);
            crashlytics().recordError(error as any);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckinSubmit = async (data: any) => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('user_daily_checkins')
                .insert([{
                    user_id: user?.id,
                    checkin_date: new Date().toISOString(),
                    mood_tag: data.mood_tag,
                    mood_score: MOODS.find(m => m.tag === data.mood_tag)?.score || 3,
                    energy_level: data.energy_level,
                    stress_level: data.stress_level,
                    sleep_quality: data.sleep_quality,
                    notes: data.notes
                }]);

            if (error) throw error;
            await fetchCheckins();
            setShowCheckinSheet(false);
        } catch (err) {
            console.log('[ERROR]:', 'Error saving check-in:', err);
            crashlytics().recordError(err as any);
        } finally {
            setLoading(false);
        }
    };

    const getDayPills = () => {
        const last5Days = [4, 3, 2, 1, 0].map(d => subDays(new Date(), d));
        return last5Days.map(date => {
            const checkin = checkins.find(c => isSameDay(new Date(c.checkin_date), date));
            const dayName = format(date, 'eee');
            const dayNum = format(date, 'd');
            const mood = checkin ? MOODS.find(m => m.tag === checkin.mood_tag) : null;

            return (
                <View key={date.toISOString()} style={styles.pillContainer}>
                    <Text style={styles.pillDayName}>{dayName}</Text>
                    <Text style={styles.pillDayNum}>{dayNum}</Text>
                    <View style={styles.pillMood}>
                        {mood ? <Text style={styles.pillEmoji}>{mood.emoji}</Text> : <View style={styles.pillEmpty} />}
                    </View>
                </View>
            );
        });
    };

    const todayCheckin = checkins.find(c => isSameDay(new Date(c.checkin_date), new Date()));
    const todayMood = todayCheckin ? MOODS.find(m => m.tag === todayCheckin.mood_tag) : null;
    const suggestionAction = todayCheckin ? getSuggestionRule(todayCheckin.mood_score, todayCheckin.energy_level, todayCheckin.stress_level, todayCheckin.sleep_quality) : null;
    const suggestion = suggestionAction ? SUGGESTIONS[suggestionAction] : null;

    const renderTodayCard = () => {
        if (!todayCheckin) {
            return (
                <View style={styles.emptyTodayCard}>
                    <Calendar size={24} color={colors.textLight} />
                    <Text style={styles.emptyTodayText}>No check-in recorded for today yet.</Text>
                    <TouchableOpacity 
                        style={styles.emptyTodayButton}
                        onPress={() => setShowCheckinSheet(true)}
                    >
                        <Text style={styles.emptyTodayButtonText}>Check in today</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.todayCard}>
                <View style={styles.todayHeader}>
                    <Text style={styles.todayTitle}>Today</Text>
                    <View style={[styles.moodBadge, { backgroundColor: todayMood?.color + '20' }]}>
                        <Text style={[styles.moodBadgeText, { color: todayMood?.color }]}>{todayMood?.label}</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <StatItem label="Stress" value={todayCheckin.stress_level} color={getScoreColor(todayCheckin.stress_level, 'stress')} />
                    <StatItem label="Energy" value={todayCheckin.energy_level} color={getScoreColor(todayCheckin.energy_level, 'other')} />
                    <StatItem label="Sleep" value={todayCheckin.sleep_quality} color={getScoreColor(todayCheckin.sleep_quality, 'other')} />
                </View>

                {suggestion && (
                    <View style={styles.suggestionBox}>
                        <View style={styles.suggestionIcon}>
                            <Sparkles size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.suggestionTitle}>Suggestion: {suggestion.action.charAt(0).toUpperCase() + suggestion.action.slice(1)}</Text>
                            <Text style={styles.suggestionText}>{suggestion.message}</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderGraph = (label: string, key: keyof UserDailyCheckin) => {
        const type = key === 'stress_level' ? 'stress' : 'other';
        const last7Days = [6, 5, 4, 3, 2, 1, 0].map(d => {
            const date = subDays(new Date(), d);
            const checkin = checkins.find(c => isSameDay(new Date(c.checkin_date), date));
            return {
                day: format(date, 'eee').charAt(0),
                value: checkin ? (checkin[key] as number) : 0
            };
        });

        const maxVal = 5;
        const chartHeight = 80;

        return (
            <View style={styles.graphCard}>
                <View style={styles.graphHeader}>
                    <Text style={styles.graphLabel}>{label}</Text>
                    <TrendingUp size={16} color={colors.textMuted} />
                </View>
                <View style={styles.chartContainer}>
                    <View style={styles.yAxis}>
                        {[5, 3, 1].map(v => <Text key={v} style={styles.axisText}>{v}</Text>)}
                    </View>
                    <View style={styles.barsContainer}>
                        {last7Days.map((d, i) => (
                            <View key={i} style={styles.barColumn}>
                                <View style={styles.barBackground}>
                                    <View 
                                        style={[
                                            styles.barFill, 
                                            { 
                                                height: (d.value / maxVal) * chartHeight,
                                                backgroundColor: d.value > 0 ? getScoreColor(d.value, type) : colors.borderLight 
                                            }
                                        ]} 
                                    />
                                </View>
                                <Text style={styles.barDay}>{d.day}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Pulse</Text>
                        <Text style={styles.headerSubtitle}>Your mood & mind insights</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => router.push('/(tabs)/explore')}
                    >
                        <LayoutGrid size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <PulseShimmer />
                ) : (
                    <>
                        {/* Last 5 Days Pills */}
                        <View style={styles.pillsRow}>
                            {getDayPills()}
                        </View>

                        {renderTodayCard()}

                        <Text style={styles.sectionTitle}>Analytics (7 Days)</Text>
                        <View style={styles.graphsList}>
                            {renderGraph("Mood History", "mood_score")}
                            {renderGraph("Stress Levels", "stress_level")}
                            {renderGraph("Sleep Quality", "sleep_quality")}
                            {renderGraph("Energy Levels", "energy_level")}
                        </View>

                        <Text style={styles.sectionTitle}>Insights</Text>
                        <View style={styles.insightsCard}>
                            {INSIGHTS.map((insight, i) => (
                                <View key={i} style={styles.insightItem}>
                                    <View style={styles.insightDot} />
                                    <Text style={styles.insightText}>{insight}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            <MoodCheckInSheet
                visible={showCheckinSheet}
                onClose={() => setShowCheckinSheet(false)}
                onSubmit={handleCheckinSubmit}
            />
        </SafeAreaView>
    );
}

const StatItem = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <View style={styles.statItem}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>
            {value === 1 ? 'V. Low' : value === 2 ? 'Low' : value === 3 ? 'Medium' : value === 4 ? 'High' : 'V. High'}
        </Text>
        <View style={styles.miniBarBg}>
            <View style={[styles.miniBarFill, { width: `${(value / 5) * 100}%`, backgroundColor: color }]} />
        </View>
    </View>
);

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
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    pillsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: spacing.lg,
    },
    pillContainer: {
        alignItems: 'center',
        padding: spacing.xs,
        width: (width - (spacing.lg * 2) - (spacing.sm * 4)) / 5,
    },
    pillDayName: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    pillDayNum: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    pillMood: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pillEmoji: {
        fontSize: 20,
    },
    pillEmpty: {
        width: 12,
        height: 2,
        backgroundColor: colors.border,
        borderRadius: 1,
    },
    todayCard: {
        // backgroundColor: colors.card,
        // borderRadius: borderRadius.xl,
        // padding: spacing.lg,
        // borderWidth: 1,
        // borderColor: colors.border,
        marginBottom: spacing.xl,
    },
    todayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    todayTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
    },
    moodBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    moodBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
        gap: 10,
    },
    statItem: {
        flex: 1,
        gap: 2,
        marginHorizontal: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 2,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
    },
    miniBarBg: {
        height: 4,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
        overflow: 'hidden',
    },
    miniBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    suggestionBox: {
        flexDirection: 'row',
        backgroundColor: colors.primary + '08',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    suggestionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    suggestionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    suggestionText: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    graphsList: {
        marginBottom: spacing.xl,
    },
    graphCard: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.md,
        height: 180, // Increased from 160
    },
    graphHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg, // Added more breathing room
    },
    graphLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
    },
    chartContainer: {
        flexDirection: 'row',
        flex: 1,
    },
    yAxis: {
        justifyContent: 'space-between',
        paddingRight: 6,
        paddingBottom: 25,
    },
    axisText: {
        fontSize: 10,
        color: colors.textMuted,
    },
    barsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: 25,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
    },
    barBackground: {
        width: 6,
        height: 80,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
        justifyContent: 'flex-end',
    },
    barFill: {
        width: '100%',
        borderRadius: 3,
    },
    barDay: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 4,
        position: 'absolute',
        bottom: -25,
    },
    insightsCard: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    insightItem: {
        flexDirection: 'row',
        marginVertical: spacing.sm,
    },
    insightDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginTop: 8,
        marginRight: 10,
    },
    insightText: {
        fontSize: 15,
        color: colors.textLight,
        lineHeight: 22,
        flex: 1,
        fontWeight: '400',
    },
    emptyTodayCard: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.xl,
        borderStyle: 'dashed',
    },
    emptyTodayText: {
        fontSize: 15,
        color: colors.textMuted,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    emptyTodayButton: {
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
    },
    emptyTodayButtonText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 14,
    }
});
