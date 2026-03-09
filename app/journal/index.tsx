import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, SafeAreaView, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { ArrowLeft, Plus, BookOpen, Calendar, ChevronRight, Home, LayoutGrid } from 'lucide-react-native';
import { UserJournal } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { StatusBar } from 'expo-status-bar';
import { JournalCardShimmer } from '@/components/shimmers/JournalCardShimmer';

const ITEMS_PER_PAGE = 30;

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

    const fetchJournals = useCallback(async (pageNumber: number, refresh = false) => {
        if (!user) return;
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
                if (data.length < ITEMS_PER_PAGE) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }

                setSections(currentSections => {
                    const newJournals = refresh ? data : [...(pageNumber === 0 ? [] : currentSections.flatMap(s => s.data)), ...data];

                    // Group by Month/Year
                    const grouped = newJournals.reduce((acc: Record<string, UserJournal[]>, journal) => {
                        const date = new Date(journal.created_at);
                        const title = format(date, 'MMMM yyyy'); // e.g. "October 2023"
                        if (!acc[title]) acc[title] = [];
                        acc[title].push(journal);
                        return acc;
                    }, {});

                    return Object.keys(grouped).map(title => ({
                        title,
                        data: grouped[title],
                    }));
                });
            }

        } catch (error) {
            console.error('Error fetching journals:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user]);

    // Initial fetch
    useEffect(() => {
        fetchJournals(0, true);

        const subscription = DeviceEventEmitter.addListener('journal_update', () => {
            fetchJournals(0, true);
        });

        return () => {
            subscription.remove();
        };
    }, [user, fetchJournals]);

    const loadMore = () => {
        if (!hasMore || loadingMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchJournals(nextPage);
    };

    const renderItem = ({ item }: { item: UserJournal }) => {
        const date = new Date(item.created_at);
        const day = format(date, 'dd');
        const weekday = format(date, 'EEE');

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/journal/${item.id}`)}
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
            <StatusBar style="dark" backgroundColor={colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Journal</Text>
                        <Text style={styles.headerSubtitle}>Capture your thoughts and feelings</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => router.push('/(tabs)/explore')}
                    >
                        <LayoutGrid size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
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
                                onPress={() => router.push('/journal/new')}
                            >
                                <Text style={styles.emptyButtonText}>Write Now</Text>
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
                            sections.length > 0 ? <View style={{ height: 40 }} /> : null
                        )
                    }
                />
            )}
            {/* Floating Action Button */}
            <View style={styles.fabContainer} pointerEvents="box-none">
                <TouchableOpacity
                    style={styles.fab}
                    activeOpacity={0.8}
                    onPress={() => router.push('/journal/new')}
                >
                    <Plus size={24} color="#FFF" strokeWidth={2.5} />
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
});
