import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Modal, DeviceEventEmitter, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { Users, FileText, Globe, Lock, ChevronLeft, MoreVertical, Hash, UserPlus, LogOut, Settings, Trash2, ChevronRight, MapPin } from 'lucide-react-native';
import { Community, Channel } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ChannelDetailDialog } from '../../components/community/ChannelDetailDialog';
import { CommunityDetailShimmer } from '../../components/shimmers/CommunityDetailShimmer';
import { Toast } from '../../components/Toast';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { useApp } from '../../contexts/AppContext';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';
import crashlytics from '@/lib/crashlytics';

export default function CommunityDetailScreen() {
    const { id, name, description, logo_url, banner_url, followers_count } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { fetchNotifications, addNotification } = useApp();

    interface ExtendedChannel extends Channel {
        postsCount: number;
        isJoined: boolean;
    }

    const [community, setCommunity] = useState<(Community & {
        creator?: { id: string, name: string, avatar_url: string | null, country: string | null }
    }) | null>({
        id: id as string,
        name: (name as string) || '',
        description: (description as string) || '',
        logo_url: (logo_url as string) || null,
        banner_url: (banner_url as string) || null,
        created_at: '',
        visibility_type: 'public',
        access_type: 'free',
        followers_count: parseInt((followers_count as string) || '0', 10),
        is_active: true,
        created_by: undefined
    });
    const [channels, setChannels] = useState<ExtendedChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isJoined, setIsJoined] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const [memberSince, setMemberSince] = useState<string | null>(null);
    const [showModModal, setShowModModal] = useState(false);
    const [joining, setJoining] = useState(false);
    const [moderators, setModerators] = useState<{ user: { id: string, name: string, avatar_url: string | null, country: string | null }, joined_at?: string }[]>([]);
    const [stats, setStats] = useState({ postsCount: 0 });

    // Channel Dialog State
    const [selectedChannel, setSelectedChannel] = useState<ExtendedChannel | null>(null);
    const [showChannelDialog, setShowChannelDialog] = useState(false);
    const [channelActionLoading, setChannelActionLoading] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('info');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fade animation for smooth header loading
    const headerFadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerFadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [headerFadeAnim]);

    const fetchData = useCallback(async () => {
        if (!user || !id) return;
        try {
            setLoading(true);

            // Fetch Community Details
            const { data: communityData, error: communityError } = await supabase
                .from('communities')
                .select('*, creator:users!created_by(id, name, avatar_url, country)')
                .eq('id', id)
                .single();

            if (communityError) throw communityError;
            setCommunity(communityData);

            // Fetch Channels with Stats
            const { data: channelsData, error: channelsError } = await supabase
                .from('channels')
                .select('*')
                .eq('community_id', id)
                .eq('is_active', true)
                .order('is_default', { ascending: false });

            if (channelsError) throw channelsError;

            // Fetch My Channel Memberships
            const { data: myChannelFollows } = await supabase
                .from('channel_followers')
                .select('channel_id')
                .eq('user_id', user.id)
                .in('channel_id', channelsData.map(c => c.id));

            const followedChannelIds = new Set(myChannelFollows?.map(f => f.channel_id));

            // Fetch Post Counts (Loop for now, ideally use a view or RPC)
            const channelsWithStats = await Promise.all(channelsData.map(async (channel) => {
                const { count } = await supabase
                    .from('post_channels')
                    .select('*', { count: 'exact', head: true })
                    .eq('channel_id', channel.id);

                // Fallback: If post_channels is empty, check posts table if we were using 1-to-many?
                // The schema uses post_channels for many-to-many. 

                return {
                    ...channel,
                    postsCount: count || 0,
                    isJoined: followedChannelIds.has(channel.id)
                };
            }));

            setChannels(channelsWithStats);

            // Check Membership
            const { data: followData } = await supabase
                .from('community_followers')
                .select('user_id')
                .eq('community_id', id)
                .eq('user_id', user.id)
                .single();

            if (followData) {
                setIsJoined(true);
                setMemberSince(new Date().toISOString());
            } else {
                setIsJoined(false);
                setMemberSince(null);
            }

            // Check Moderator Status
            const { data: modData, error: modCheckError } = await supabase
                .from('community_moderators')
                .select('user_id')
                .eq('community_id', id)
                .eq('user_id', user.id)
                .maybeSingle(); // Use maybeSingle to avoid error on no rows

            console.log("Moderator Check:", {
                communityId: id,
                userId: user.id,
                modData,
                error: modCheckError
            });

            setIsModerator(!!modData);

            // Fetch Moderators List
            const { data: modsList } = await supabase
                .from('community_moderators')
                .select('user:users(id, name, avatar_url, country), added_at')
                .eq('community_id', id);

            if (modsList) {
                // Fetch joined dates for moderators
                const modUserIds = modsList.map((m: any) => m.user.id);
                const { data: modFollowers } = await supabase
                    .from('community_followers')
                    .select('user_id, created_at')
                    .eq('community_id', id)
                    .in('user_id', modUserIds);

                const formattedMods = modsList.map((m: any) => ({
                    user: m.user,
                    joined_at: m.added_at
                }));

                if (formattedMods.length > 0) {
                    setModerators(formattedMods);
                } else if (communityData.creator) {
                    // Fallback to creator if no mods assigned
                    setModerators([{
                        user: communityData.creator,
                        joined_at: communityData.created_at
                    }]);
                } else {
                    setModerators([]);
                }
            } else if (communityData.creator) {
                setModerators([{
                    user: communityData.creator,
                    joined_at: communityData.created_at
                }]);
            } else {
                setModerators([]);
            }

            // Fetch Stats (Posts Count)
            const { count: postsCount } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('community_id', id);

            setStats({ postsCount: postsCount || 0 });

        } catch (error:any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', 'Error fetching community details:', error);
            setToastMsg('Failed to load community details.');
            router.back();
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRequestAdmin = () => {
        setToastType('info');
        setToastMsg('Request sent to admin');
    };

    const handleJoinLeave = async () => {
        if (!user || !community) return;
        setJoining(true);
        try {
            if (isJoined) {
                // Leave Community
                const { error: leaveError } = await supabase
                    .from('community_followers')
                    .delete()
                    .eq('community_id', community.id)
                    .eq('user_id', user.id);

                if (leaveError) throw leaveError;

                // Leave All Channels (Backend trigger might handle this cleanup if cascade, 
                // but we do it explicitly here for consistency with previous logic)
                // Leave All Channels
                const channelIds = channels.map(c => c.id);
                if (channelIds.length > 0) {
                    await supabase
                        .from('channel_followers')
                        .delete()
                        .in('channel_id', channelIds)
                        .eq('user_id', user.id);
                }

                // Leave Community Chats
                const { data: communityChats } = await supabase
                    .from('community_chats')
                    .select('id')
                    .eq('community_id', community.id);

                if (communityChats && communityChats.length > 0) {
                    const chatIds = communityChats.map(c => c.id);
                    // Delete from community_chat_members
                    await supabase
                        .from('community_chat_members')
                        .delete()
                        .in('chat_id', chatIds)
                        .eq('user_id', user.id);

                    // Also clear their read status for these chats
                    await supabase
                        .from('community_chat_read_status')
                        .delete()
                        .in('chat_id', chatIds)
                        .eq('user_id', user.id);
                }

                setIsJoined(false);
                setMemberSince(null);

                // Optimistic Update: Community Count
                if (community) {
                    setCommunity(prev => prev ? {
                        ...prev,
                        followers_count: Math.max(0, (prev.followers_count || 0) - 1)
                    } : null);
                }

                // Optimistic Update: Channels Count (All become unjoined)
                setChannels(prev => prev.map(c => ({
                    ...c,
                    isJoined: false,
                    followers_count: c.isJoined ? Math.max(0, c.followers_count - 1) : c.followers_count
                })));

                DeviceEventEmitter.emit('community_update'); // Notify list to refresh

                // Check notification settings before sending
                const { data: settingsData } = await supabase
                    .from('user_notification_settings')
                    .select('system_enabled')
                    .eq('user_id', user.id)
                    .eq('category', 'community')
                    .eq('action', 'leave')
                    .maybeSingle();

                if (!settingsData || settingsData.system_enabled !== false) {
                    // Add manual notification for leaving
                    await addNotification({
                        title: 'Community Left',
                        message: `You have left ${community.name}.`,
                        notification_type: 'community_follow',
                        category: 'info',
                        community_id: community.id
                    });
                }

                fetchNotifications(); // Manual refresh fallback
            } else {
                // Join Community
                const { error: joinError } = await supabase
                    .from('community_followers')
                    .insert({
                        community_id: community.id,
                        user_id: user.id
                    });

                if (joinError) throw joinError;

                // Join All Active Channels (Default behavior requested)
                // Filter for Default OR Public channels to avoid RLS errors on Private channels
                const validChannels = channels.filter(c => c.is_default || !c.is_private);
                const validChannelIds = new Set(validChannels.map(c => c.id));

                if (validChannels.length > 0) {
                    const channelInserts = validChannels.map(c => ({
                        channel_id: c.id,
                        user_id: user.id
                    }));

                    const { error: channelError } = await supabase
                        .from('channel_followers')
                        .insert(channelInserts);

                    if (channelError) console.log('[ERROR]:', 'Error joining channels:', channelError);
                }

                // Join Community Chats
                const { data: chatsToJoin } = await supabase
                    .from('community_chats')
                    .select('id')
                    .eq('community_id', community.id)
                    .eq('is_active', true);

                if (chatsToJoin && chatsToJoin.length > 0) {
                    const chatMemRows = chatsToJoin.map(c => ({
                        user_id: user.id,
                        chat_id: c.id,
                        is_active: true
                    }));
                    await supabase.from('community_chat_members').insert(chatMemRows);
                }

                setIsJoined(true);
                setMemberSince(new Date().toISOString());

                // Optimistic Update: Community Count
                if (community) {
                    setCommunity(prev => prev ? {
                        ...prev,
                        followers_count: (prev.followers_count || 0) + 1
                    } : null);
                }

                // Optimistic Update: Channels Count (Default/Public become joined)
                setChannels(prev => prev.map(c => {
                    const shouldJoin = validChannelIds.has(c.id);
                    return {
                        ...c,
                        isJoined: shouldJoin ? true : c.isJoined,
                        followers_count: (shouldJoin && !c.isJoined) ? c.followers_count + 1 : c.followers_count
                    };
                }));

                DeviceEventEmitter.emit('community_update'); // Notify list to refresh

                // Check notification settings before sending
                const { data: settingsData } = await supabase
                    .from('user_notification_settings')
                    .select('system_enabled')
                    .eq('user_id', user.id)
                    .eq('category', 'community')
                    .eq('action', 'join')
                    .maybeSingle();

                if (!settingsData || settingsData.system_enabled !== false) {
                    // Add manual notification for joining
                    await addNotification({
                        title: 'Community Joined',
                        message: `You have successfully joined ${community.name}!`,
                        notification_type: 'community_follow',
                        category: 'success',
                        community_id: community.id
                    });
                }
            }
        } catch (error:any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', 'Error joining/leaving community:', error);
            setToastMsg('Failed to update membership.');
            // Revert optimistic updates if failed (could implement full revert logic here, but fetch is safer if error occurs)
            fetchData();
        } finally {
            setJoining(false);
        }
    };

    const handleJoinChannel = async (channelId: string) => {
        if (!user) return;
        setChannelActionLoading(true);
        try {
            const { error } = await supabase.from('channel_followers').insert({
                channel_id: channelId,
                user_id: user.id
            });
            if (error) throw error;

            // Update Local State
            setChannels(prev => prev.map(c =>
                c.id === channelId
                    ? { ...c, isJoined: true, followers_count: c.followers_count + 1 }
                    : c
            ));

            // Update Selected Channel if open
            if (selectedChannel?.id === channelId) {
                setSelectedChannel(prev => prev ? { ...prev, isJoined: true, followers_count: prev.followers_count + 1 } : null);
            }

        } catch (error:any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', "Error joining channel", error);
            setToastMsg("Failed to join channel.");
        } finally {
            setChannelActionLoading(false);
        }
    };

    const handleLeaveChannel = async (channelId: string) => {
        if (!user) return;
        setChannelActionLoading(true);
        try {
            const { error } = await supabase.from('channel_followers')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', user.id);

            if (error) throw error;

            // Update Local State
            setChannels(prev => prev.map(c =>
                c.id === channelId
                    ? { ...c, isJoined: false, followers_count: Math.max(0, c.followers_count - 1) }
                    : c
            ));

            // Update Selected Channel if open
            if (selectedChannel?.id === channelId) {
                setSelectedChannel(prev => prev ? { ...prev, isJoined: false, followers_count: Math.max(0, prev.followers_count - 1) } : null);
            }

        } catch (error:any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', "Error leaving channel", error);
            setToastMsg("Failed to leave channel.");
        } finally {
            setChannelActionLoading(false);
        }
    };

    const handleDeleteCommunity = () => {
        setShowDeleteModal(true);
    };

    const confirmDeleteCommunity = async () => {
        setToastMsg("Delete functionality is coming soon.");
        setShowDeleteModal(false);
    };

    if (!community) return null;

    const renderHeaderInfo = () => (
        <>
            <Animated.View style={{ opacity: headerFadeAnim }}>
                <View style={styles.bannerContainer}>
                    {community.banner_url || loading ? (
                        <Image source={community.banner_url ? { uri: getImageUrl(community.banner_url) } : undefined} style={styles.banner} />
                    ) : (
                        <LinearGradient
                            colors={[colors.primary, colors.primaryDark]}
                            style={styles.banner}
                        />
                    )}
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ChevronLeft color="white" size={28} />
                    </TouchableOpacity>
                    {/* {isModerator && (
                        <TouchableOpacity style={styles.menuButton} onPress={() => setShowModModal(true)}>
                            <MoreVertical size={24} color={colors.text} />
                        </TouchableOpacity>
                    )} */}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerInfo}>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={community.logo_url ? { uri: getImageUrl(community.logo_url) } : undefined}
                                style={styles.logo}
                            />
                        </View>

                        <View style={styles.titleSection}>
                            <Text style={styles.name}>
                                {community.name || (!loading && 'Unknown Community')}
                            </Text>
                        </View>
                    </View>

                    {!isJoined && !loading && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.joinButton]}
                            onPress={community.visibility_type === 'private' ? handleRequestAdmin : handleJoinLeave}
                            disabled={joining}
                        >
                            {joining ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <UserPlus size={18} color="white" />
                                    <Text style={styles.actionButtonText}>
                                        {community.visibility_type === 'private' ? 'Request Admin' : 'Join Community'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {!!community.description && (
                        <>
                            <Text style={styles.sectionTitle}>About</Text>
                            <Text style={styles.description}>
                                {community.description}
                            </Text>
                        </>
                    )}

                    {/* General Info */}
                    {
                        !!community.description && (
                            <>
                                <Text style={styles.sectionTitle}>General Info</Text>
                                <View style={styles.infoGrid}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Community Type</Text>
                                        <Text style={styles.infoValue}>{community.visibility_type === 'private' ? 'Private' : 'Public'}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Members</Text>
                                        {loading ? (<View style={{ width: 16, height: 16, backgroundColor: colors.border, borderRadius: borderRadius.full }} />) : (<Text style={styles.infoValue}>{formatNumber(community.followers_count)}</Text>)}
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Total Posts</Text>
                                        {loading ? (<View style={{ width: 16, height: 16, backgroundColor: colors.border, borderRadius: borderRadius.full }} />) : (<Text style={styles.infoValue}>{formatNumber(stats.postsCount)}</Text>)}
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Context</Text>
                                        <Text style={styles.infoValue}>{community.access_type === 'paid' ? 'Paid' : 'Free'}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Created</Text>
                                        <Text style={styles.infoValue}>{new Date(community.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                            </>
                        )
                    }

                    {loading && <CommunityDetailShimmer />}
                </View>
            </Animated.View>
        </>
    );

    if (!community.created_at && loading) {
        // Initial load where we only have the nav params but not the full DB entity
        return (
            <View style={styles.container}>
                <Toast message={toastMsg} onHide={() => setToastMsg(null)} type={toastType} />
                <StatusBar style="dark" backgroundColor="transparent" translucent />
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {renderHeaderInfo()}
                </ScrollView>
            </View>
        );
    }

    if (!community.created_at && !loading) return null;

    return (
        <View style={styles.container}>
            <Toast message={toastMsg} onHide={() => setToastMsg(null)} type={toastType} />
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderHeaderInfo()}

                {
                    !loading ?
                        <View style={[styles.contentContainer, { paddingTop: 0, marginTop: 0 }]}>

                            {/* Moderators */}
                            <Text style={styles.sectionTitle}>Community Moderators</Text>
                            <View style={styles.moderatorsList}>
                                {moderators.length > 0 ? (
                                    moderators.map((mod, index) => (
                                        <View key={index} style={styles.moderatorCard}>
                                            <Image
                                                source={{ uri: getImageUrl(mod.user.avatar_url) }}
                                                style={styles.modAvatar}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={styles.modName} numberOfLines={1}>{mod.user.name}</Text>
                                                    <View style={styles.modBadge}>
                                                        <Text style={styles.modBadgeText}>MOD</Text>
                                                    </View>
                                                </View>
                                                <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                                                    {mod.user.country && (
                                                        <Text style={styles.modDetail}><MapPin size={12} color={colors.textMuted} /> {mod.user.country}</Text>
                                                    )}

                                                    {mod.user.country && mod.joined_at && (
                                                        <Text style={[styles.modDetail, { marginHorizontal: 6 }]}>•</Text>
                                                    )}

                                                    {mod.joined_at && (
                                                        <Text style={styles.modDetail}>
                                                            Admin since {new Date(mod.joined_at).getFullYear()}
                                                        </Text>
                                                    )}
                                                </View>

                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.emptyText}>No moderators listed.</Text>
                                )}
                            </View>

                            {/* Channels */}
                            <Text style={styles.sectionTitle}>Channels</Text>
                            <View style={styles.channelsList}>
                                {channels.map((channel, index) => {
                                    const isLastItem = index === channels.length - 1;

                                    return (
                                        <TouchableOpacity
                                            key={channel.id}
                                            style={[
                                                styles.channelItem,
                                                isLastItem && { borderBottomWidth: 0 },
                                                // !isJoined && { opacity: 0.5 } // Visual feedback for disabled state
                                            ]}
                                            onPress={() => {
                                                if (!isJoined) {
                                                    setToastMsg("You must join the community to view channels.");
                                                    return;
                                                }
                                                setSelectedChannel(channel);
                                                setShowChannelDialog(true);
                                            }}
                                            activeOpacity={!isJoined ? 1 : 0.7} // Disable active opacity effect if not joined
                                        >
                                            <View style={styles.channelIcon}>
                                                <Hash size={20} color={colors.text} />
                                            </View>
                                            <View style={styles.channelInfo}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={styles.channelName}>{channel.name}</Text>
                                                    {channel.is_default && (
                                                        <View style={[styles.badgeBase, styles.badgeDefault]}>
                                                            <Text style={styles.badgeTextSmall}>Default</Text>
                                                        </View>
                                                    )}
                                                    {channel.isJoined && (
                                                        <View style={[styles.badgeBase, styles.badgeJoined]}>
                                                            <Text style={[styles.badgeTextSmall, { color: colors.success }]}>Joined</Text>
                                                        </View>
                                                    )}
                                                    {channel.is_private && (
                                                        <Lock size={12} color={colors.textMuted} />
                                                    )}
                                                </View>

                                                <View style={styles.channelMeta}>
                                                    <Text style={styles.metaText}>{formatNumber(channel.followers_count)} members</Text>
                                                    <Text style={styles.metaDot}>•</Text>
                                                    <Text style={styles.metaText}>{formatNumber(channel.postsCount)} posts</Text>
                                                </View>
                                            </View>
                                            {/* {isJoined && <ChevronRight size={16} color={colors.textMuted} />} */}
                                        </TouchableOpacity>
                                    );
                                })}

                            </View>

                            {/* Community Rules */}
                            <Text style={styles.sectionTitle}>Community Rules</Text>
                            <View style={styles.rulesContainer}>
                                {[
                                    "Be respectful and kind to all members.",
                                    "No hate speech or bullying.",
                                    "No spam or self-promotion without permission.",
                                    "Respect everyone's privacy.",
                                    "Follow the community guidelines."
                                ].map((rule, index) => (
                                    <View key={index} style={styles.ruleItem}>
                                        <Text style={styles.ruleNumber}>{index + 1}.</Text>
                                        <Text style={styles.ruleText}>{rule}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Leave Button & Membership Info (Only if joined) */}
                            {isJoined && (
                                <View style={styles.footerActions}>
                                    {/* Members List Link */}
                                    {isJoined && (
                                        <TouchableOpacity
                                            style={styles.membersLink}
                                            onPress={() => router.push(`/community/members/${community.id}`)}
                                        >
                                            <Users size={20} color={colors.primary} />
                                            <Text style={styles.membersLinkText}>View All Members</Text>
                                            <ChevronRight size={16} color={colors.primary} />
                                        </TouchableOpacity>
                                    )}

                                    {!isModerator && !community.is_default && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.leaveButton]}
                                            onPress={handleJoinLeave}
                                            disabled={joining}
                                        >
                                            {joining ? (
                                                <ActivityIndicator color={colors.text} />
                                            ) : (
                                                <>
                                                    <LogOut size={18} color={colors.text} />
                                                    <Text style={[styles.actionButtonText, styles.leaveButtonText]}>
                                                        Leave Community
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    {memberSince && (
                                        <Text style={styles.memberSince}>
                                            Member since {new Date(memberSince).toLocaleDateString()}
                                        </Text>
                                    )}
                                </View>
                            )}

                        </View>
                        : ""
                }

                {/* Confirmation Modal */}
                <ConfirmationModal
                    visible={showDeleteModal}
                    title="Delete Community"
                    message="Are you sure you want to delete this community? This action cannot be undone."
                    confirmText="Delete"
                    onConfirm={confirmDeleteCommunity}
                    onCancel={() => setShowDeleteModal(false)}
                />
            </ScrollView>

            {/* Moderator Modal */}
            <Modal
                visible={showModModal}
                statusBarTranslucent transparent
                animationType="fade"
                onRequestClose={() => setShowModModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowModModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Moderator Tools</Text>

                        <TouchableOpacity style={styles.modalItem} onPress={() => { setShowModModal(false); router.push(`/community/members/${community.id}?mode=add`); }}>
                            <UserPlus size={20} color={colors.text} />
                            <Text style={styles.modalItemText}>Invite Members</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalItem} onPress={() => { setShowModModal(false); /* Nav to Settings */ }}>
                            <Settings size={20} color={colors.text} />
                            <Text style={styles.modalItemText}>Community Settings</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.modalItem} onPress={() => { setShowModModal(false); handleDeleteCommunity(); }}>
                            <Trash2 size={20} color={colors.error} />
                            <Text style={[styles.modalItemText, { color: colors.error }]}>Delete Community</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Channel Detail Dialog */}
            <ChannelDetailDialog
                visible={showChannelDialog}
                channel={selectedChannel}
                isJoined={selectedChannel?.isJoined || false}
                isModerator={isModerator}
                postsCount={selectedChannel?.postsCount || 0}
                loading={channelActionLoading}
                onClose={() => setShowChannelDialog(false)}
                onJoin={handleJoinChannel}
                onLeave={handleLeaveChannel}
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
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
    },
    bannerContainer: {
        height: 200,
        position: 'relative',
    },
    banner: {
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: 50, // improved safe area
        left: spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuButton: {
        position: 'absolute',
        top: 50, // improved safe area
        right: spacing.lg,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: colors.background,
        marginTop: -30,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        // marginBottom: spacing.lg,
    },
    logoWrapper: {
        marginTop: -50,
        padding: 4,
        backgroundColor: colors.background,
        borderRadius: 24,
        marginRight: spacing.md,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: colors.borderLight,
    },
    titleSection: {
        flex: 1,
        marginTop: -25,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    badges: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    badgeText: {
        fontSize: 12,
        color: colors.textLight,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: borderRadius.lg,
        gap: 8,
        marginBottom: spacing.sm,
    },
    joinButton: {
        backgroundColor: colors.primary,
        marginTop: spacing.xl,
    },
    leaveButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
    },
    actionButtonText: {
        fontWeight: '600',
        fontSize: 16,
        color: 'white',
    },
    leaveButtonText: {
        color: colors.text,
    },
    memberSince: {
        textAlign: 'center',
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
        marginTop: spacing.xl,
    },
    description: {
        fontSize: 15,
        color: colors.textLight,
        lineHeight: 22,
        // marginBottom: spacing.lg,
    },
    // Info Grid
    infoGrid: {
        flexDirection: 'column',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    infoItem: {
        width: '100%',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        color: colors.textLight,
        marginBottom: 0,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    // Moderators
    moderatorsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    moderatorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.sm,
        paddingRight: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: 12,
        width: '100%', // Full width for list items
    },
    modAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    modName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    modDetail: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 2,
    },
    modBadge: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    modBadgeText: {
        fontSize: 10,
        color: colors.primary,
        fontWeight: 'bold',
    },
    channelsList: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.md,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    channelIcon: {
        marginRight: spacing.md,
    },
    channelInfo: {
        flex: 1,
    },
    channelName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    channelDesc: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    channelMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    metaText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    metaDot: {
        fontSize: 12,
        color: colors.textMuted,
        marginHorizontal: 6,
    },
    badgeBase: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeDefault: {
        backgroundColor: colors.primary + '15',
    },
    badgeJoined: {
        backgroundColor: colors.success + '15',
    },
    badgeTextSmall: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.primary,
    },
    membersLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface, // or primaryLight
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.primary + '30', // Low opacity primary
        marginBottom: spacing.lg,
        gap: 8
    },
    membersLinkText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 15,
    },
    // Rules
    rulesContainer: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: spacing.md,
    },
    ruleItem: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    ruleNumber: {
        fontWeight: 'bold',
        color: colors.primary,
        fontSize: 15,
    },
    ruleText: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        lineHeight: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: spacing.lg,
        textAlign: 'center',
        color: colors.text,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        gap: 12,
    },
    modalItemText: {
        fontSize: 16,
        color: colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.md,
    },
    emptyText: {
        color: colors.textLight,
        fontSize: 14,
        fontStyle: 'italic',
    },
    footerActions: {
        marginTop: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: spacing.lg,
    },
});
