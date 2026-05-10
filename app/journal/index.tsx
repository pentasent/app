import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, SafeAreaView, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import crashlytics from '@/lib/crashlytics';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { Plus, BookOpen, LayoutGrid } from 'lucide-react-native';
import { UserJournal } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { StatusBar } from 'expo-status-bar';
import { JournalCardShimmer } from '@/components/shimmers/JournalCardShimmer';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Sparkles, AlertCircle } from 'lucide-react-native';

const ITEMS_PER_PAGE = 20;  

type JournalSection = {
    title: string;
    data: UserJournal[];
};

export default function JournalScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [sections, setSections] = useState<JournalSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const { subscription, isExpired, plan, limits } = useSubscription();
    const [todayCount, setTodayCount] = useState(0);

    const fetchJournals = useCallback(async (pageNumber: number, refresh = false) => {
        if (!user) return;
        const startTime = Date.now();
        try {
            if (pageNumber === 0) setLoading(true);
            else setLoadingMore(true);

            const { data, error } = await supabase
                .from('user_journals')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .range(pageNumber * ITEMS_PER_PAGE, (pageNumber + 1) * ITEMS_PER_PAGE - 1);

            if (error) throw error;

            if (data) {
                const isNoMore = data.length < ITEMS_PER_PAGE;
                if (isNoMore) setHasMore(false);
                else setHasMore(true);

                setSections(currentSections => {
                    // Combine old and new entries
                    const allEntries = refresh 
                        ? data 
                        : [...currentSections.flatMap(s => s.data), ...data];

                    // Use a Map for O(N) grouping
                    const groupedMap = new Map<string, UserJournal[]>();
                    
                    allEntries.forEach(journal => {
                        const date = new Date(journal.created_at);
                        
                        // Timezone-safe normalization (Date-Month-Year only)
                        const now = new Date();
                        const todayStr = format(now, 'yyyy-MM-dd');
                        
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

                        const journalDateStr = format(date, 'yyyy-MM-dd');

                        let title = format(date, 'MMMM do, yyyy');
                        if (journalDateStr === todayStr) title = 'Today';
                        else if (journalDateStr === yesterdayStr) title = 'Yesterday';
                        
                        if (!groupedMap.has(title)) {
                            groupedMap.set(title, []);
                        }
                        groupedMap.get(title)?.push(journal);
                    });

                    // Convert Map back to SectionList format
                    // Since allEntries was already sorted by created_at DESC, 
                    // the Map insertion order (for modern JS) or a quick sort will keep them correct.
                    return Array.from(groupedMap.entries()).map(([title, data]) => ({
                        title,
                        data
                    }));
                });
            }

        } catch (error) {
            console.log('[ERROR]:', 'Error fetching journals:', error);
            crashlytics().recordError(error as any);
        } finally {
            const minimumLoadTime = 800; // Slightly faster for premium feel
            const elapsed = Date.now() - startTime;
            const delay = Math.max(0, minimumLoadTime - elapsed);
            
            setTimeout(() => {
                setLoading(false);
                setLoadingMore(false);
            }, delay);
        }
    }, [user]);

    const fetchTodayCount = useCallback(async () => {
        if (!user) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { count, error } = await supabase
            .from('user_journals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true)
            .gte('created_at', todayStart.toISOString());
            
        if (!error) {
            setTodayCount(count || 0);
        }
    }, [user]);

    // Initial fetch
    useEffect(() => {
        setPage(0);
        fetchJournals(0, true);
        fetchTodayCount();

        const subscription = DeviceEventEmitter.addListener('journal_update', () => {
            fetchJournals(0, true);
            fetchTodayCount();
        });

        return () => {
            subscription.remove();
        };
    }, [user, fetchJournals]);

    const isNavigating = useRef(false);
    const safePush = (route: string) => {
        if (isNavigating.current) return;
        isNavigating.current = true;
        // @ts-ignore
        router.push(route);
        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };

    const loadMore = () => {
        if (!hasMore || loadingMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchJournals(nextPage);
    };

    const isLimitReached = limits ? todayCount >= limits.journal.entries_per_day && limits.journal.entries_per_day !== -1 : false;
    const canCreate = !isExpired && !!subscription && !isLimitReached;

    const renderItem = ({ item }: { item: UserJournal }) => {
        const date = new Date(item.created_at);
        const day = format(date, 'dd');
        const weekday = format(date, 'EEE');

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => safePush(`/journal/${item.id}`)}
                activeOpacity={0.7}
            >
                <View style={styles.dateColumn}>
                    <Text style={styles.dayText}>{day}</Text>
                    <Text style={styles.weekdayText}>{weekday}</Text>
                </View>

                <View style={styles.contentColumn}>
                    <View style={styles.headerRow}>
                        <Text style={styles.titleText} numberOfLines={1}>
                            {item.title || 'Untitled Entry'}
                        </Text>
                        {item.mood_emoji && <Text style={styles.moodEmoji}>{item.mood_emoji}</Text>}
                    </View>
                    <Text style={styles.bodyText} numberOfLines={2}>
                        {item.content}
                    </Text>
                    {/* Tags could go here */}
                </View>

                {/* <ChevronRight size={16} color={colors.textLight} style={{ marginLeft: 8 }} /> */}
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Journal</Text>
                        <Text style={styles.headerSubtitle}>Capture your thoughts and feelings</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => safePush('/(tabs)/explore')}
                    >
                        <LayoutGrid size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Subscription Expired Card */}
                {(isExpired || !subscription) && (
                    <TouchableOpacity 
                        style={styles.expiredCard}
                        onPress={() => safePush('/subscription/upgrade')}
                        activeOpacity={0.9}
                    >
                        <View style={styles.expiredIconContainer}>
                            <AlertCircle size={20} color={colors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.expiredTitle}>Subscription Expired</Text>
                            <Text style={styles.expiredSubtitle}>Please renew your plan to continue writing unlimited entries.</Text>
                        </View>
                        <View style={styles.renewBadge}>
                            <Text style={styles.renewText}>RENEW</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Daily Limit Reached Card */}
                {!isExpired && subscription && isLimitReached && (
                    <View style={styles.limitCard}>
                        <View style={styles.limitIconContainer}>
                            <Sparkles size={20} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.limitTitle}>Daily Limit Reached</Text>
                            <Text style={styles.limitSubtitle}>You've used all your journal entries for today. Upgrade for more!</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.upgradeBtn}
                            onPress={() => safePush('/subscription/upgrade')}
                        >
                            <Text style={styles.upgradeBtnText}>UPGRADE</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={styles.listContent}>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <View key={index}>
                            <JournalCardShimmer />
                            {index < 4 && <View style={{ height: 2, backgroundColor: colors.borderLight, marginLeft: 52 }} />}
                        </View>
                    ))}
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                    ItemSeparatorComponent={() => (
                        <View
                            style={{
                                height: 2,
                                backgroundColor: colors.borderLight,
                                marginLeft: 52, // aligns after date column (optional, looks better)
                            }}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <BookOpen size={48} color={colors.textLight} />
                            <Text style={styles.emptyText}>Start your first journal entry.</Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => {
                                    if (canCreate) {
                                        safePush('/journal/new');
                                    } else {
                                        safePush('/subscription/upgrade');
                                    }
                                }}
                            >
                                <Text style={styles.emptyButtonText}>{canCreate ? 'Write Now' : 'Manage Subscription'}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    ListFooterComponent={
                        hasMore ? (
                            <TouchableOpacity
                                style={styles.loadMoreButton}
                                onPress={loadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Text style={styles.loadMoreText}>Load More</Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            sections.length > 0 ? (
                                <View style={styles.footerInfo}>
                                    <View style={styles.footerDivider} />
                                    <Text style={styles.footerNoMore}>No more journal entries.</Text>
                                    {canCreate && (
                                        <TouchableOpacity 
                                           onPress={() => safePush('/journal/new')}
                                           style={styles.footerCreateBtn}
                                        >
                                            <Text style={styles.footerCreateText}>Create New</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : null
                        )
                    }
                />
            )}
            {/* Floating Action Button */}
            {canCreate && (
                <View style={styles.fabContainer} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.fab}
                        activeOpacity={0.8}
                        onPress={() => safePush('/journal/new')}
                    >
                        <Plus size={24} color="#FFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            )}
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
        marginBottom: spacing.md,
    },
    expiredCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.error + '20',
        marginTop: spacing.sm,
    },
    expiredIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    expiredTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.error,
    },
    expiredSubtitle: {
        fontSize: 12,
        color: colors.textLight,
        marginTop: 2,
    },
    renewBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.error,
        borderRadius: 20,
        marginLeft: spacing.sm,
    },
    renewText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFF',
    },
    limitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B' + '10',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#F59E0B' + '20',
        marginTop: spacing.sm,
    },
    limitIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F59E0B' + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    limitTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F59E0B',
    },
    limitSubtitle: {
        fontSize: 12,
        color: colors.textLight,
        marginTop: 2,
    },
    upgradeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F59E0B',
        borderRadius: 20,
        marginLeft: spacing.sm,
    },
    upgradeBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFF',
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
    fabContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 100,
    },
    fab: {
        backgroundColor: colors.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Section
    sectionHeader: {
        paddingVertical: spacing.md,
        backgroundColor: colors.background, // sticky effect needs bg
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Card
    card: {
        flexDirection: 'row',
        // backgroundColor: colors.surface, // or just background if simple
        paddingVertical: spacing.md,
        paddingRight: spacing.sm, // minimal horizontal padding for list feel
        // borderBottomWidth: 2, // separator style
        // borderBottomColor: colors.borderLight,
        alignItems: 'center',
    },
    dateColumn: {
        alignItems: 'center',
        marginRight: spacing.md,
        // width: 40,
        backgroundColor: colors.borderLight,
        padding: 10,
        borderRadius: 10,
    },
    dayText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    weekdayText: {
        fontSize: 12,
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    contentColumn: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    titleText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    moodEmoji: {
        fontSize: 14,
    },
    bodyText: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 20,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    emptyButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: {
        color: 'white',
        fontWeight: '600',
    },

    // Load More
    loadMoreButton: {
        padding: spacing.md,
        alignItems: 'center',
    },
    loadMoreText: {
        color: colors.primary,
        fontWeight: '600',
    },

    // Footer Info
    footerInfo: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    footerDivider: {
        width: 40,
        height: 1,
        backgroundColor: colors.border,
        marginBottom: spacing.md,
    },
    footerNoMore: {
        fontSize: 14,
        color: colors.textLight,
        marginBottom: spacing.sm,
    },
    footerCreateBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    footerCreateText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '700',
    },
});
