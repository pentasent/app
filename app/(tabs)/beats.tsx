import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../constants/theme';
import { supabase, useAuth } from '../../contexts/AuthContext';
import { Beat, BeatTag } from '@/types';
import { BeatTagList } from '../../components/beats/BeatTagList';
// import { BeatFilter, SortOption } from '../../components/beats/BeatFilter';
import { BeatCard } from '../../components/beats/BeatCard';
import { ParticleBackground } from '../../components/beats/ParticleBackground';
import { BeatCardShimmer } from '../../components/shimmers/BeatCardShimmer';
import crashlytics from '@/lib/crashlytics';
import { useRouter } from 'expo-router';
import { useApp } from '../../contexts/AppContext';

type SortOption = 'views' | 'duration';

export default function BeatsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useApp();
    const [tags, setTags] = useState<BeatTag[]>([]);
    const [beats, setBeats] = useState<Beat[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('views');
    const insets = useSafeAreaInsets();

    const fetchData = useCallback(async () => {
        try {
            // Fetch Tags
            const { data: tagsData, error: tagsError } = await supabase
                .from('beat_tags')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (tagsError) throw tagsError;
            if (tagsData) setTags(tagsData);

            // Fetch Beats
            const { data: beatsData, error: beatsError } = await supabase
                .from('beats')
                .select('*, beat_tags(*)')
                .eq('is_active', true);

            if (beatsError) throw beatsError;
            
            if (beatsData) {
                setBeats(beatsData);
                
                // Calculate counts dynamically if tags are already fetched
                if (tagsData) {
                    const counts = beatsData.reduce((acc: any, beat: any) => {
                        acc[beat.tag_id] = (acc[beat.tag_id] || 0) + 1;
                        return acc;
                    }, {});
                    
                    const tagsWithCounts = tagsData.map((t: any) => ({
                        ...t,
                        music_count: counts[t.id] || 0
                    }));
                    setTags(tagsWithCounts);
                }
            }

            // Cache the data
            const cacheData = {
                tags: tagsData || [],
                beats: beatsData || [],
                timestamp: Date.now()
            };
            await AsyncStorage.setItem('beats_cache', JSON.stringify(cacheData));
        } catch (error:any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', 'Error fetching beats data:', error);
            showToast("Failed to fetch latest beats. Please try again.", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        const loadCache = async () => {
            try {
                const cached = await AsyncStorage.getItem('beats_cache');
                if (cached) {
                    const { tags: cachedTags, beats: cachedBeats } = JSON.parse(cached);
                    if (cachedTags?.length) setTags(cachedTags);
                    if (cachedBeats?.length) {
                        setBeats(cachedBeats);
                        setLoading(false); // Hide initial loader if we have cache
                    }
                }
            } catch (e) {
                console.log('[ERROR]:', 'Error loading beats cache:', e);
            }
        };
        loadCache();
        fetchData();
    }, [fetchData]);

    const filteredBeats = useMemo(() => {
        let result = [...beats];

        // Filter by Tag
        if (selectedTag) {
            result = result.filter(b => b.tag_id === selectedTag);
        }

        // Sort
        if (sortBy === 'views') {
            result.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
        } else if (sortBy === 'duration') {
            result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
        }

        return result;
    }, [beats, selectedTag, sortBy]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const incrementPlayCount = async (beatId: string, currentCount: number) => {
        // Optimistic UI Update for source beats list
        setBeats(current =>
            current.map(b => b.id === beatId ? { ...b, play_count: currentCount + 1 } : b)
        );

        try {
            const { error } = await supabase
                .from('beats')
                .update({ play_count: currentCount + 1 })
                .eq('id', beatId);

            if (error) {
                console.log('[ERROR]:', "Failed to update play_count in database");
                // Optional: Revert optimistic state here if critically needed
            }
        } catch (err:any) {
            crashlytics().recordError(err);
            console.log('[ERROR]:', err);
        }
    };

    const isNavigating = React.useRef(false);
    const handlePlayBeat = (beat: Beat) => {
        if (isNavigating.current) return;
        isNavigating.current = true;

        const currentCount = beat.play_count || 0;
        incrementPlayCount(beat.id, currentCount);

        // @ts-ignore
        router.push(`/beats/${beat.id}`);

        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ParticleBackground />

            <View style={styles.header}>
                <Text style={styles.title}>Explore Beats</Text>
                <Text style={styles.subtitle}>Find your perfect rhythm</Text>
            </View>

            <View style={styles.filterSection}>
                <BeatTagList
                    tags={tags}
                    selectedTag={selectedTag}
                    onSelect={setSelectedTag}
                    loading={loading || refreshing}
                />
            </View>

            <FlatList
                data={(loading && !refreshing ? [1, 2, 3, 4, 5, 6] : filteredBeats) as any[]}
                keyExtractor={(item) => (typeof item === 'number' ? `shimmer-${item}` : item.id)}
                renderItem={({ item, index }) => (
                    loading && !refreshing ? (
                        <BeatCardShimmer />
                    ) : (
                        <BeatCard 
                            beat={item as Beat} 
                            onPlay={handlePlayBeat} 
                            index={index}
                            isLast={index === (filteredBeats.length - 1)}
                        />
                    )
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No beats found</Text>
                        </View>
                    ) : null
                }
            />
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
    header: {
        paddingHorizontal: spacing.lg,
        // paddingTop: spacing.xxl,
        paddingTop: spacing.md - 3.5,
        paddingBottom: spacing.sm,
        zIndex: 1,
    },
    title: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textLight,
    },
    filterSection: {
        marginBottom: spacing.xs,
        zIndex: 1,
    },
    listContent: {
        paddingBottom: 100,
        // backgroundColor: colors.surface, // Start white section background for list
        minHeight: '100%', // Ensure it covers
        paddingTop: spacing.sm,
    },
    emptyContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 16,
    }
});
