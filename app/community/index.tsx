import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, RefreshControl, SectionList, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { Users, FileText, Globe, Lock, MapPin, Compass, LayoutGrid } from 'lucide-react-native';
import { Community } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { CommunityCardShimmer } from '../../components/shimmers/CommunityCardShimmer';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';
import crashlytics from '@/lib/crashlytics';

const { width } = Dimensions.get('window');

type ExtendedCommunity = Community & {
    members_count: number;
    posts_count: number;
    is_joined: boolean;
};

export default function CommunityListingScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [sections, setSections] = useState<{ title: string; data: ExtendedCommunity[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);

            // Fetch all communities
            const { data: communities, error: communitiesError } = await supabase
                .from('communities')
                .select('*')
                .eq('is_active', true);

            if (communitiesError) throw communitiesError;

            // Fetch user's joined communities
            const { data: followedData, error: followedError } = await supabase
                .from('community_followers')
                .select('community_id')
                .eq('user_id', user.id);

            if (followedError) throw followedError;

            const joinedIds = new Set(followedData?.map(f => f.community_id) || []);

            // Process communities
            const communitiesWithDetails = await Promise.all((communities || []).map(async (c) => {
                const { count: postsCount } = await supabase
                    .from('posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('community_id', c.id);

                return {
                    ...c,
                    members_count: c.followers_count,
                    posts_count: postsCount || 0,
                    is_joined: joinedIds.has(c.id)
                };
            }));

            const joined = communitiesWithDetails.filter(c => c.is_joined);
            const other = communitiesWithDetails.filter(c => !c.is_joined);

            const newSections = [];
            if (joined.length > 0) {
                newSections.push({ title: 'Your Communities', data: joined });
            }
            if (other.length > 0) {
                newSections.push({ title: 'Explore More Communities', data: other });
            }

            setSections(newSections);

        } catch (error) {
            console.log('[ERROR]:', 'Error fetching communities:', error);
            crashlytics().recordError(error as any);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();

        const subscription = DeviceEventEmitter.addListener('community_update', () => {
            fetchData();
        });

        return () => {
            subscription.remove();
        };
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCommunityPress = (communityId: string) => {
        router.push(`/community/${communityId}`);
    };

    const renderCommunityCard = ({ item }: { item: ExtendedCommunity }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleCommunityPress(item.id)}
            activeOpacity={0.9}
        >
            <View style={styles.cardBannerContainer}>
                {item.banner_url ? (
                    <Image source={{ uri: getImageUrl(item.banner_url) }} style={styles.cardBanner} resizeMode="cover" />
                ) : (
                    <LinearGradient
                        colors={[colors.primaryLight, colors.primary]}
                        style={styles.cardBanner}
                    />
                )}
                <View style={[styles.cardLogoContainer, !item.logo_url && styles.placeholderLogo]}>
                    <Image
                        source={{ uri: getImageUrl(item.logo_url) }}
                        style={styles.cardLogo}
                    />
                </View>
                <View style={styles.badgeContainer}>
                    {item.visibility_type === 'private' ? (
                        <View style={styles.badge}>
                            <Lock size={10} color="white" />
                            <Text style={styles.badgeText}>Private</Text>
                        </View>
                    ) : (
                        <View style={[styles.badge, styles.publicBadge]}>
                            <Globe size={10} color="white" />
                            <Text style={styles.badgeText}>Public</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                </View>

                <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description || "No description available."}
                </Text>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Users size={14} color={colors.textLight} />
                        <Text style={styles.statText}>{formatNumber(item.members_count)} Members</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <FileText size={14} color={colors.textLight} />
                        <Text style={styles.statText}>{formatNumber(item.posts_count)} Posts</Text>
                    </View>
                    <View style={styles.statDivider} />
                    {item.country && (
                        <View style={styles.statItem}>
                            <MapPin size={14} color={colors.textLight} />
                            <Text style={styles.statText}>{item.country}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => {
        let IconComponent;
        if (title === 'Your Communities') IconComponent = Users;
        else if (title === 'Explore More Communities') IconComponent = Compass;

        return (
            <View style={styles.sectionHeader}>
                {title === 'Explore More Communities' && <View style={styles.sectionDivider} />}
                <View style={styles.sectionTitleRow}>
                    {IconComponent && <IconComponent size={20} color={colors.primary} />}
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
            </View>
        );
    };

    const ListHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <View>
                    <Text style={styles.title}>Communities</Text>
                    <Text style={styles.subtitle}>Find your tribe and grow together</Text>
                </View>
                <TouchableOpacity
                    style={styles.exploreButton}
                    onPress={() => router.push('/(tabs)/explore')}
                >
                    <LayoutGrid size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <ListHeader />
                <View style={styles.listContent}>
                    <CommunityCardShimmer />
                    <CommunityCardShimmer />
                    <CommunityCardShimmer />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderCommunityCard}
                renderSectionHeader={renderSectionHeader}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No communities found.</Text>
                        </View>
                    ) : null
                }
                stickySectionHeadersEnabled={false}
            // ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
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
        paddingBottom: spacing.xxl,
    },
    sectionHeader: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
        backgroundColor: colors.background, // Ensure background covers scrolling content if sticky
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionDivider: {
        height: 2,
        backgroundColor: colors.borderLight,
        marginBottom: spacing.lg,
        marginTop: spacing.sm,
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
    itemSeparator: {
        height: 2, // Spacer height
        backgroundColor: colors.borderLight, // Spacer color
        marginVertical: 20
    },
    cardBannerContainer: {
        height: 200, // Increased height slightly
        position: 'relative',
    },
    cardBanner: {
        width: '100%',
        height: '100%',
    },
    cardLogoContainer: {
        position: 'absolute',
        bottom: -20,
        left: spacing.md,
        padding: 2,
        backgroundColor: colors.surface,
        borderRadius: 14,
    },
    placeholderLogo: {
        backgroundColor: colors.surface,
    },
    cardLogo: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.borderLight,
    },
    badgeContainer: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    publicBadge: {
        backgroundColor: colors.primary,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardContent: {
        paddingTop: 28, // Adjusted
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
        marginRight: 8,
    },
    countryBadgeAbsolute: {
        position: 'absolute',
        bottom: 12, // Align with logo visual center or slightly above
        left: spacing.md + 48 + spacing.sm, // Left margin + Logo width + gap
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        // backgroundColor: 'rgba(0,0,0,0.6)', // Semi-transparent background for visibility on banner
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: -30
    },
    countryText: {
        fontSize: 10,
        // color: 'white', // Changed to white for visibility on banner
        fontWeight: '500'
    },
    cardDescription: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 18,
        marginBottom: spacing.md,
        height: 36,
    },
    statsContainer: {
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
    },
    emptyText: {
        color: colors.textMuted,
        textAlign: 'center',
    },
});
