import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useAuth, supabase } from '../contexts/AuthContext';
import { useFeed } from '../contexts/FeedContext';
import { Community } from '../types/database';
import { CustomImage as Image } from '../components/CustomImage';
import { Check, Users } from 'lucide-react-native';
import { OnboardingCommunityShimmer } from '../components/shimmers/OnboardingCommunityShimmer';
import { trackEvent } from '../lib/analytics/track';
import { getImageUrl } from '@/utils/get-image-url';

export default function OnboardingCommunitiesScreen() {
    const { user, refreshUser } = useAuth();
    const { refreshFeed } = useFeed();
    const router = useRouter();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchCommunities = async () => {
            const { data, error } = await supabase
                .from('communities')
                .select('*')
                .eq('is_active', true)
                .eq('visibility_type', 'public')
                .order('followers_count', { ascending: false });

            if (data) setCommunities(data);
            setLoading(false);
        };
        fetchCommunities();
    }, []);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(c => c !== id)
                : [...prev, id]
        );
    };

    const handleJoin = async () => {
        if (selectedIds.length < 3) return;
        if (!user) return;
        setSaving(true);
        try {
            const defaultIds = communities.filter(c => c.is_default).map(c => c.id);
            const allJoinedIds = Array.from(new Set([...selectedIds, ...defaultIds]));

            // Bulk insert followers
            const followerRows = allJoinedIds.map(id => ({
                user_id: user.id,
                community_id: id,
            }));

            const { error } = await supabase.from('community_followers').insert(followerRows);
            if (error) throw error;

            // Fetch all active, public channels for these communities
            const { data: channels } = await supabase
                .from('channels')
                .select('id, community_id')
                .in('community_id', allJoinedIds)
                .eq('is_active', true)
                .eq('is_private', false);

            if (channels && channels.length > 0) {
                for (const channel of channels) {
                    const { data: existing } = await supabase
                        .from('channel_followers')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('channel_id', channel.id)
                        .maybeSingle();

                    if (existing) {
                        await supabase
                            .from('channel_followers')
                            .update({ updated_at: new Date().toISOString() })
                            .eq('id', existing.id);
                    } else {
                        await supabase
                            .from('channel_followers')
                            .insert({
                                user_id: user.id,
                                channel_id: channel.id,
                            });
                    }
                }
            }

            // Fetch and join community default chats
            const { data: chats } = await supabase
                .from('community_chats')
                .select('id, community_id')
                .in('community_id', allJoinedIds)
                .eq('is_active', true);

            if (chats && chats.length > 0) {
                const chatMemRows = chats.map(c => ({
                    user_id: user.id,
                    chat_id: c.id,
                    is_active: true
                }));
                const { error: chatError } = await supabase.from('community_chat_members').insert(chatMemRows);
                if (chatError) console.error("Chat error:", chatError);
            }

            // Create Joined Community Notifications
            const notifications = [
                ...allJoinedIds.map(id => {
                    const comm = communities.find(c => c.id === id);
                    return {
                        user_id: user.id,
                        notification_type: 'community_follow',
                        category: 'info',
                        title: 'Community Joined',
                        message: `You successfully joined ${comm?.name || 'the community'}.`,
                        community_id: id,
                        is_seen: false,
                        is_active: true
                    }
                })
            ];

            const { error: notificationError } = await supabase.from('notifications').insert(notifications);
            if (notificationError) console.error("Notification error:", notificationError);

            // Mark user as onboarded
            const { error: updateError } = await supabase.from('users').update({ is_onboarded: true }).eq('id', user.id);
            if (updateError) throw updateError;

            // Successfully onboarded, refresh user context, feed context, and go to tabs
            trackEvent('onboarding_completed');
            await refreshUser();
            await refreshFeed();
            router.replace('/(tabs)');
        } catch (e: any) {
            console.error('Join error:', e);
            alert(e.message || 'Failed to join communities');
        } finally {
            setSaving(false);
        }
    };

    const requirementMet = selectedIds.length >= 3;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor={colors.background} />

            <View style={styles.header}>
                <Text style={styles.title}>Find Your Tribes</Text>
                <Text style={styles.subtitle}>
                    Follow at least 3 communities to customize your feed. ({selectedIds.length}/3 selected)
                </Text>
            </View>

            <FlatList
                data={loading ? Array.from({ length: 6 }).map((_, i) => ({ id: `shimmer-${i}` } as any)) : communities.filter(c => !c.is_default)}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    if (loading) return <OnboardingCommunityShimmer />;

                    const isSelected = selectedIds.includes(item.id);
                    return (
                        <TouchableOpacity
                            onPress={() => toggleSelection(item.id)}
                            style={[
                                styles.card,
                                isSelected && styles.cardSelected
                            ]}
                            activeOpacity={0.8}
                        >
                            <Image
                                source={{ uri: getImageUrl(item.logo_url) }}
                                style={styles.logo}
                            />
                            <View style={styles.info}>
                                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.desc} numberOfLines={2}>
                                    {item.description || "A community on Pentasent."}
                                </Text>
                                <View style={styles.meta}>
                                    <Users size={14} color={colors.textLight} />
                                    <Text style={styles.metaText}>{item.followers_count} members</Text>
                                </View>
                            </View>
                            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                {isSelected && <Check size={16} color="#FFF" />}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.joinButton, !requirementMet && styles.joinButtonDisabled]}
                    disabled={!requirementMet || saving}
                    onPress={handleJoin}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Text style={styles.joinButtonText}>
                            {requirementMet ? `Join ${selectedIds.length} Communities` : `Pick ${3 - selectedIds.length} more`}
                        </Text>
                    )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
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
    listContent: {
        paddingTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: 100, // space for fixed footer
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        // shadowColor: colors.shadow,
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.5,
        // shadowRadius: 4,
        // elevation: 2,
    },
    cardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '30', // slightly tinted
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: borderRadius.md,
    },
    info: {
        flex: 1,
        marginLeft: spacing.md,
    },
    name: {
        ...typography.h3,
        color: colors.text,
        marginBottom: 2,
    },
    desc: {
        ...typography.caption,
        color: colors.textLight,
        marginBottom: 6,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        ...typography.caption,
        color: colors.textLight,
        marginLeft: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.md,
    },
    checkboxActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: -4 },
        // shadowOpacity: 0.1,
        // shadowRadius: 10,
        // elevation: 10,
    },
    joinButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    joinButtonDisabled: {
        backgroundColor: colors.border,
    },
    joinButtonText: {
        ...typography.button,
        color: '#FFF',
        fontWeight: 'bold',
    },
});
