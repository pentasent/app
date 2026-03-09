import { CustomImage as Image } from '@/components/CustomImage';

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, FlatList, RefreshControl, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { Activity, Flame, BarChart2, LayoutGrid, Eye } from 'lucide-react-native';
import { YogaContent } from '@/types/database';
import { LinearGradient } from 'expo-linear-gradient';
import { formatNumber } from '../../utils/format';
import { YogaCardShimmer } from '@/components/shimmers/YogaCardShimmer';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - (spacing.lg * 2);

export default function YogaListingScreen() {
    const router = useRouter();
    const [yogaContents, setYogaContents] = useState<YogaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('yoga_contents')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setYogaContents(data || []);
        } catch (error) {
            console.error('Error fetching yoga contents:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Fetch initially only to prevent full UI re-renders on every "Back" interaction
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handlePress = (id: string) => {
        // Optimistically increment the view count before navigating
        setYogaContents(prev => prev.map(item =>
            item.id === id ? { ...item, views_count: (item.views_count || 0) + 1 } : item
        ));
        router.push(`/yoga/${id}`);
    };

    const renderItem = ({ item }: { item: YogaContent }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handlePress(item.id)}
            activeOpacity={0.9}
        >
            <View style={styles.cardImageContainer}>
                {item.banner_image_url ? (
                    <Image source={{ uri: item.banner_image_url }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                    <LinearGradient
                        colors={[colors.primaryLight, colors.primary]}
                        style={styles.cardImage}
                    />
                )}
                {/* <View style={[styles.badge, styles.typeBadge]}>
                    <Activity size={12} color="white" />
                    <Text style={styles.badgeText}>{item.type === 'asana' ? 'Asana' : 'Pranayama'}</Text>
                </View> */}
                {/* <View style={styles.playIconOverlay}>
                    <PlayCircle size={40} color="rgba(255,255,255,0.8)" />
                </View> */}
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.short_description || "No description available."}
                </Text>

                <View style={styles.statsRow}>
                    {/* <View style={styles.statItem}>
                        <Clock size={14} color={colors.textLight} />
                        <Text style={styles.statText}>{item.duration_minutes} min</Text>
                    </View> */}
                    {/* <View style={styles.statDivider} /> */}
                    <View style={styles.statItem}>
                        <BarChart2 size={14} color={colors.textLight} />
                        <Text style={styles.statText}>{item.difficulty_level}</Text>
                    </View>
                    {item.calories_burn_estimate && (
                        <>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Flame size={14} color={colors.error} />
                                <Text style={styles.statText}>{item.calories_burn_estimate} kcal</Text>
                            </View>
                        </>
                    )}
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Eye size={14} color={colors.textLight} />
                        <Text style={styles.statText}>{formatNumber(item.views_count)} views</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Activity size={14} color={colors.textLight} />
                        <Text style={styles.statText}>{item.type === 'asana' ? 'Asana' : 'Pranayama'}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>Yoga & Pranayama</Text>
                        <Text style={styles.subtitle}>Find balance and harmony</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.exploreButton}
                        onPress={() => router.push('/(tabs)/explore')}
                    >
                        <LayoutGrid size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={[styles.listContent, { paddingTop: 0 }]}>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <YogaCardShimmer key={index} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={yogaContents}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No yoga content available yet.</Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
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
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
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
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exploreButton: {
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
    listContent: {
        // paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
        marginTop: spacing.md,
    },
    card: {
        backgroundColor: colors.background, // Match background or surface
        // borderRadius: borderRadius.lg, // Removed border radius
        overflow: 'hidden',
        // borderWidth: 1, // Removed border
        // borderColor: colors.borderLight,
        // marginHorizontal: spacing.lg, // Removed spacing
        // marginBottom: 20,
        marginVertical: 10
    },
    cardImageContainer: {
        height: 200,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    playIconOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeBadge: {
        backgroundColor: colors.primary,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    cardContent: {
        paddingTop: 8, // Adjusted
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    cardDescription: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 18,
        marginBottom: spacing.md,
        // height: 36,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: colors.textLight,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    statDivider: {
        width: 1,
        height: 12,
        backgroundColor: colors.border,
        marginHorizontal: spacing.sm,
    },
    emptyContainer: {
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 14,
    }
});
