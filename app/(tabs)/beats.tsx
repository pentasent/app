import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { supabase } from '../../contexts/AuthContext';
import { Beat, BeatTag } from '@/types';
import { BeatTagList } from '../../components/beats/BeatTagList';
// import { BeatFilter, SortOption } from '../../components/beats/BeatFilter';
import { BeatCard } from '../../components/beats/BeatCard';
import { ParticleBackground } from '../../components/beats/ParticleBackground';
import { BeatCardShimmer } from '../../components/shimmers/BeatCardShimmer';

import { useRouter } from 'expo-router';

type SortOption = 'views' | 'duration';

export default function BeatsScreen() {
    const router = useRouter();
    const [tags, setTags] = useState<BeatTag[]>([]);
    const [beats, setBeats] = useState<Beat[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('views');

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
            }
        } catch (error) {
            console.error('Error fetching beats data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
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
                console.error("Failed to update play_count in database");
                // Optional: Revert optimistic state here if critically needed
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handlePlayBeat = (beat: Beat) => {
        const currentCount = beat.play_count || 0;
        incrementPlayCount(beat.id, currentCount);

        // @ts-ignore
        router.push(`/beats/${beat.id}`);
    };

    return (
        <SafeAreaView style={styles.container}>
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
                />
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, paddingTop: spacing.sm }}>
                    <BeatCardShimmer />
                    <BeatCardShimmer />
                    <BeatCardShimmer />
                    <BeatCardShimmer />
                    <BeatCardShimmer />
                    <BeatCardShimmer />
                </View>
            ) : (
                <FlatList
                    data={filteredBeats}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <BeatCard beat={item} onPlay={handlePlayBeat} />
                    )}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => (
                        <View style={{ height: 2, backgroundColor: colors.borderLight }} />
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No beats found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
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
        paddingTop: spacing.xxl,
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
