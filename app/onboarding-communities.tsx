import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { useAuth, supabase } from '../contexts/AuthContext';
import { useFeed } from '../contexts/FeedContext';
import { Community } from '../types/database';
import { CustomImage as Image } from '../components/CustomImage';
import { Check, Users, MessageSquare, Music, Sparkles, BookOpen, Gamepad2 } from 'lucide-react-native';
import { OnboardingCommunityShimmer } from '../components/shimmers/OnboardingCommunityShimmer';
import { trackEvent } from '../lib/analytics/track';
import { getImageUrl } from '@/utils/get-image-url';
import crashlytics from '@/lib/crashlytics';
import { useSession } from '@/contexts/SessionContext';

export default function OnboardingCommunitiesScreen() {
    const { user, refreshUser } = useAuth();
    const { refreshFeed } = useFeed();
    const { setFeedAlreadyLoaded } = useSession();
    const router = useRouter();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [activeShowcaseIndex, setActiveShowcaseIndex] = useState(0);
    const showcaseOpacity = useRef(new Animated.Value(1)).current;
    const showcaseTranslateX = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0.4)).current;

    // Start pulsing animation for status text
    useEffect(() => {
        if (showWelcomeModal) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0.4,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [showWelcomeModal]);
    const exitFade = useRef(new Animated.Value(1)).current;

    const runShowcaseTransition = (index: number) => {
        Animated.parallel([
            Animated.timing(showcaseOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(showcaseTranslateX, { toValue: -20, duration: 300, useNativeDriver: true })
        ]).start(() => {
            setActiveShowcaseIndex(index);
            showcaseTranslateX.setValue(20);
            Animated.parallel([
                Animated.timing(showcaseOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
                Animated.timing(showcaseTranslateX, { toValue: 0, duration: 450, useNativeDriver: true })
            ]).start();
        });
    };

    // Autoplay logic with increased speed
    const showcaseItems = [
        {
            tag: "CONNECT",
            title: "Communities",
            description: "Discover supportive spaces where people share experiences, stories, growth, and meaningful conversations together.",
            icon: <Users size={32} color="#C08497" />,
            color: "#C08497",
            bg: "#FDF7FA",
            halo: "rgba(192, 132, 151, 0.14)"
        },
        {
            tag: "LIVE",
            title: "Live Chats",
            description: "Join real-time conversations, wellness discussions, and active communities happening across the platform.",
            icon: <MessageSquare size={32} color="#7BAE9B" />,
            color: "#7BAE9B",
            bg: "#F4FAF7",
            halo: "rgba(123, 174, 155, 0.14)"
        },
        {
            tag: "MIND",
            title: "Mindful Music",
            description: "Listen to calming soundscapes, focus music, and peaceful audio curated for mindful moments.",
            icon: <Music size={32} color="#8B7FD6" />,
            color: "#8B7FD6",
            bg: "#F7F5FF",
            halo: "rgba(139, 127, 214, 0.14)"
        },
        {
            tag: "GUIDE",
            title: "Meet Maya AI",
            description: "Talk with your AI wellness companion for support, reflection, guidance, and daily encouragement.",
            icon: <Sparkles size={32} color="#D49A6A" />,
            color: "#D49A6A",
            bg: "#FFF8F3",
            halo: "rgba(212, 154, 106, 0.14)"
        },
        {
            tag: "GROWTH",
            title: "Self Growth",
            description: "Build healthier habits through journaling, guided activities, reflections, and mindful daily routines.",
            icon: <BookOpen size={32} color="#6FA7D8" />,
            color: "#6FA7D8",
            bg: "#F4F9FE",
            halo: "rgba(111, 167, 216, 0.14)"
        },
        {
            tag: "PLAY",
            title: "Mindful Games",
            description: "Enjoy relaxing mini experiences designed to help you reset, focus, and feel mentally refreshed.",
            icon: <Gamepad2 size={32} color="#7B7B86" />,
            color: "#7B7B86",
            bg: "#F7F7F8",
            halo: "rgba(123, 123, 134, 0.10)"
        }
    ];

    useEffect(() => {
        if (showWelcomeModal) {
            const interval = setInterval(() => {
                const nextIndex = (activeShowcaseIndex + 1) % showcaseItems.length;
                runShowcaseTransition(nextIndex);
            }, 2800);
            return () => clearInterval(interval);
        }
    }, [showWelcomeModal, activeShowcaseIndex]);


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
                if (chatError) console.log('[ERROR]:', "Chat error:", chatError);
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
            if (notificationError) console.log('[ERROR]:', "Notification error:", notificationError);

            // Mark user as onboarded
            const { error: updateError } = await supabase.from('users').update({ is_onboarded: true }).eq('id', user.id);
            if (updateError) throw updateError;

            // Successfully onboarded, refresh user context, feed context, and go to tabs
            trackEvent('onboarding_completed');
            await refreshUser();

            // PRE-WARM FEED:
            // Explicitly fetch metadata and posts while the "Getting ready" screen is still visible
            // This prevents the "blank filter" and "white screen" bugs on first landing.
            const { useFeedStore } = require('../stores/useFeedStore');
            const feedStore = useFeedStore.getState();
            
            await Promise.all([
                feedStore.fetchCommunitiesAndChannels(user.id),
                feedStore.fetchPosts(true)
            ]);
            
            // 3. Mark as loaded in session so Feed shows up instantly without "fade from 0"
            setFeedAlreadyLoaded(true);

            // Silken Overlap Transition: 
            // We fade out the modal while SIMULTANEOUSLY replacing the screen.
            // This prevents the "sudden cut" and the "white screen" gap.
            Animated.timing(exitFade, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true
            }).start();
            
            // Wait 100ms for state to stabilize before navigating
            setTimeout(() => {
                // We DO NOT call setShowWelcomeModal(false) here because 
                // it would reveal the "Find Your Tribes" list for a split second 
                // before the navigation happens (causing a flicker).
                router.replace('/(tabs)');
            }, 100);
        } catch (e: any) {
            console.log('[ERROR]:', 'Join error:', e);
            crashlytics().recordError(e);
            setShowWelcomeModal(false);
            alert(e.message || 'Failed to join communities');
        } finally {
            setSaving(false);
        }
    };

    const handleJoinWithModal = () => {
        if (!requirementMet || saving) return;
        setShowWelcomeModal(true);
        handleJoin();
    };

    const requirementMet = selectedIds.length >= 3;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            <Modal
                visible={showWelcomeModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.modalContent, { backgroundColor: colors.background, opacity: exitFade }]}>
                        <SafeAreaView style={styles.sanctuaryContainer}>
                            {/* Minimalist Top Branding */}
                            <View style={styles.sanctuaryHeader}>
                                <Text style={styles.sanctuaryWelcome}>WELCOME TO</Text>
                                <Text style={styles.sanctuaryBrand}>PENTASENT</Text>
                            </View>

                            {/* Centered Prism Showcase */}
                            <View style={styles.sanctuaryShowcase}>
                                <Animated.View style={[
                                    styles.sanctuaryItem, 
                                    { 
                                        opacity: showcaseOpacity,
                                        transform: [
                                            { translateX: showcaseTranslateX }
                                        ]
                                    }
                                ]}>
                                    <View style={styles.prismGemStage}>
                                        <View style={[styles.sanctuaryAura, { backgroundColor: showcaseItems[activeShowcaseIndex].bg }]} />
                                        <View style={[styles.prismBorder, { borderColor: showcaseItems[activeShowcaseIndex].color }]} />
                                        <View style={styles.prismGem}>
                                            {showcaseItems[activeShowcaseIndex].icon}
                                        </View>
                                    </View>
                                    
                                    <View style={styles.sanctuaryTextFrame}>
                                        <Text style={[styles.sanctuaryTitle, { color: showcaseItems[activeShowcaseIndex].color }]}>
                                            {showcaseItems[activeShowcaseIndex].title}
                                        </Text>
                                        <View style={styles.sanctuaryDescWrapper}>
                                            <Text style={styles.sanctuaryDesc}>
                                                {showcaseItems[activeShowcaseIndex].description}
                                            </Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            </View>

                            {/* Bottom Navigation & Absolute Status */}
                            <View style={styles.sanctuaryFooter}>
                                <View style={styles.dotContainer}>
                                    {showcaseItems.map((_, i) => (
                                        <View 
                                            key={i} 
                                            style={[
                                                styles.sanctuaryDot, 
                                                i === activeShowcaseIndex ? 
                                                    { backgroundColor: showcaseItems[i].color, width: 24 } : 
                                                    { backgroundColor: colors.border, width: 8 }
                                            ]} 
                                        />
                                    ))}
                                </View>
                                
                                <View style={styles.sanctuaryStatusArea}>
                                    <Text style={styles.sanctuaryUserName}>{user?.name?.split(' ')[0] || 'Explorer'}</Text>
                                    <Animated.Text style={[styles.sanctuaryStatus, { opacity: pulseAnim }]}>
                                        Getting ready your space...
                                    </Animated.Text>
                                </View>
                            </View>
                        </SafeAreaView>
                    </Animated.View>
                </View>
            </Modal>

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
                    onPress={handleJoinWithModal}
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
        paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalContent: {
        width: '100%',
        height: '100%',
    },
    sanctuaryContainer: {
        flex: 1,
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.xl,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sanctuaryHeader: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    sanctuaryWelcome: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.textMuted,
        letterSpacing: 3,
        marginBottom: 2,
    },
    sanctuaryBrand: {
        ...typography.h1,
        fontSize: 22,
        color: colors.text,
        letterSpacing: 5,
    },
    sanctuaryShowcase: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    sanctuaryItem: {
        alignItems: 'center',
        width: '100%',
    },
    prismGemStage: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    sanctuaryAura: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        opacity: 0.15,
    },
    prismBorder: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 45,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        opacity: 0.3,
    },
    prismGem: {
        width: 96,
        height: 96,
        borderRadius: 38,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.medium,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,1)',
    },
    sanctuaryTextFrame: {
        alignItems: 'center',
        width: '100%',
    },
    sanctuaryTitle: {
        ...typography.h1,
        fontSize: 34,
        textAlign: 'center',
        marginBottom: spacing.md,
        letterSpacing: -1,
    },
    sanctuaryDescWrapper: {
        height: 80,
        justifyContent: 'center',
        marginBottom: spacing.xxl,
    },
    sanctuaryDesc: {
        fontSize: 17,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 26,
        opacity: 0.6,
        paddingHorizontal: spacing.sm,
    },
    sanctuaryFooter: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: spacing.xl,
    },
    dotContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: spacing.xxl,
        alignItems: 'center',
    },
    sanctuaryDot: {
        height: 5,
        borderRadius: 3,
    },
    sanctuaryStatusArea: {
        alignItems: 'center',
    },
    sanctuaryUserName: {
        ...typography.h3,
        fontSize: 20,
        color: colors.text,
        marginBottom: 4,
        marginTop: spacing.xs
    },
    sanctuaryStatus: {
        ...typography.caption,
        color: colors.textMuted,
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontWeight: '900',
        fontSize: 10,
        opacity: 0.4,
    },
});
