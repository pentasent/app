import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { MessageSquare, Users, ChevronRight } from 'lucide-react-native';
import { CommunityChat, Community } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { ChatCardShimmer } from '../../components/shimmers/ChatCardShimmer';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';
import crashlytics from '@/lib/crashlytics';

// Combined type for display
type ChatItem = CommunityChat & {
    community: Community;
    last_message?: {
        message_text: string;
        created_at: string;
        user?: { name: string };
    } | null;
    unread_count?: number;
};

const ChatCard = ({ item, onPress, index, isLast }: { item: ChatItem, onPress: () => void, index: number, isLast: boolean }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(15)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: Math.min(index * 60, 600),
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                tension: 40,
                friction: 8,
                delay: Math.min(index * 60, 600),
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
            <TouchableOpacity
                style={styles.chatCard}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: getImageUrl(item.community.logo_url) }}
                    style={styles.communityLogo}
                />

                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.communityName} numberOfLines={2}>{item.community.name}</Text>
                        {item.last_message && (
                            <Text style={styles.timeText}>
                                {new Date(item.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </Text>
                        )}
                    </View>

                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.last_message
                            ? `${item.last_message.user?.name}: ${item.last_message.message_text}`
                            : 'Tap to start chatting...'}
                    </Text>
                </View>

                {item.unread_count && item.unread_count > 0 ? (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{formatNumber(item.unread_count)}</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
            {!isLast && <View style={{ height: 1.5, backgroundColor: colors.borderLight, marginLeft: 80 }} />}
        </Animated.View>
    );
};

export default function ChatListScreen() {
    const { user, isRealtimeReady } = useAuth();
    const router = useRouter();
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const chatsRef = useRef<ChatItem[]>([]);

    // Keep ref in sync
    useEffect(() => {
        chatsRef.current = chats;
    }, [chats]);

    const fetchChats = useCallback(async (silent = false) => {
        if (!user) return;
        try {
            // Only show shimmer if we have NO data at all (not even in cache)
            if (!silent && chatsRef.current.length === 0) setLoading(true);

            // 1. Combined Query: Get active chats user is a member of WITH community details in one request
            const { data: memberData, error: memberError } = await supabase
                .from('community_chat_members')
                .select(`
                    chat_id,
                    community_chats!inner(
                        *,
                        community:communities(*)
                    )
                `)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .eq('community_chats.is_active', true);

            if (memberError) throw memberError;

            if (!memberData || memberData.length === 0) {
                setChats([]);
                setLoading(false);
                return;
            }

            // Extract the chat objects
            const chatIds = memberData.map(m => m.chat_id);
            const basicChats: ChatItem[] = memberData.map(m => {
                const chat = (m as any).community_chats;
                return {
                    ...chat,
                    community: chat.community,
                    last_message: null,
                    unread_count: 0
                };
            });

            // FAST PASS: Show the cards immediately with community logos/names
            // This makes the UI feel instant even on slow connections.
            if (chatsRef.current.length === 0) {
                setChats(basicChats);
                setLoading(false);
            }

            // 2. Details Fetch: Now fetch unread counts and last messages in the background
            const { data: allReadStatuses } = await supabase
                .from('community_chat_read_status')
                .select('chat_id, last_read_at')
                .in('chat_id', chatIds)
                .eq('user_id', user.id);

            const readStatusMap = new Map(allReadStatuses?.map(s => [s.chat_id, s.last_read_at]));

            // 3. Parallel fetch for details
            const chatsWithDetails = await Promise.all(basicChats.map(async (chat: any) => {
                const lastReadTime = readStatusMap.get(chat.id);

                const [msgResult, unreadResult] = await Promise.all([
                    supabase
                        .from('community_chat_messages')
                        .select('*, user:users(name)')
                        .eq('chat_id', chat.id)
                        .is('is_deleted', false)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle(),
                    lastReadTime ? supabase
                        .from('community_chat_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('chat_id', chat.id)
                        .gt('created_at', lastReadTime)
                        .neq('user_id', user.id)
                        .is('is_deleted', false)
                        : Promise.resolve({ count: 0 })
                ]);

                const msgData = msgResult.data;
                const unreadCount = unreadResult.count || 0;

                return {
                    ...chat,
                    last_message: msgData ? {
                        message_text: msgData.message_text,
                        created_at: msgData.created_at,
                        user: msgData.user
                    } : null,
                    last_message_id: msgData?.id || null,
                    unread_count: unreadCount
                };
            }));

            // Sort by last message time (descending)
            const sortedChats = chatsWithDetails.sort((a, b) => {
                const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
                const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
                return timeB - timeA;
            });

            setChats(sortedChats);
            // Save to cache
            await AsyncStorage.setItem(`chats_${user.id}`, JSON.stringify(sortedChats));

        } catch (error: any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', 'Error fetching chats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    // Load from cache on mount
    useEffect(() => {
        const loadCache = async () => {
            if (!user) return;
            try {
                const cached = await AsyncStorage.getItem(`chats_${user.id}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setChats(parsed);
                    setLoading(false);
                }
            } catch (e) {
                console.log('[ERROR]:', 'Error loading chat cache:', e);
            }
        };
        loadCache();
    }, [user]);

    useEffect(() => {
        if (!user || !(user as any).is_onboarded) return;
        fetchChats();
    }, [fetchChats, user?.id]);

    useFocusEffect(
        useCallback(() => {
            if (user && (user as any).is_onboarded) {
                fetchChats(true);
            }
        }, [fetchChats, user?.id])
    );

    // Real-time subscription for main chat list
    useEffect(() => {
        if (!user || !(user as any).is_onboarded || !isRealtimeReady) return;
        // console.log('[Chat List Realtime] Realtime ready. Starting subscription...');

        const handleChatMessageChange = async (payload: any) => {
            const currentChats = chatsRef.current;
            const eventType = payload.eventType;
            const message = eventType === 'DELETE' ? payload.old : payload.new;

            const chatIndex = currentChats.findIndex((c: ChatItem) => c.id === message.chat_id);
            if (chatIndex === -1) return;

            if (eventType === 'INSERT') {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', message.user_id)
                    .single();

                const isMyMessage = message.user_id === user.id;

                setChats(prev => {
                    const updatedChats = [...prev];
                    const targetChat = { ...updatedChats[chatIndex] };

                    targetChat.last_message = {
                        message_text: message.message_text,
                        created_at: message.created_at,
                        user: { name: userData?.name || 'User' }
                    };

                    if (!isMyMessage) {
                        targetChat.unread_count = (targetChat.unread_count || 0) + 1;
                    }

                    updatedChats[chatIndex] = targetChat;
                    return updatedChats.sort((a, b) => {
                        const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
                        const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
                        return timeB - timeA;
                    });
                });
            } else if (eventType === 'UPDATE') {
                // If it's a soft delete (is_deleted: true), treat as DELETE
                if (message.is_deleted) {
                    await handleChatMessageChange({ ...payload, eventType: 'DELETE' });
                    return;
                }

                setChats(prev => {
                    const updatedChats = [...prev];
                    const targetChat = { ...updatedChats[chatIndex] };

                    // Only update if this WAS the last message
                    if (targetChat.last_message && (targetChat as any).last_message_id === message.id) {
                        targetChat.last_message = {
                            ...targetChat.last_message,
                            message_text: message.message_text
                        };
                        updatedChats[chatIndex] = targetChat;
                    } else {
                        // Fallback: If it's a newer message than what we have, just refresh this chat's last message info
                        // (Optional, fetchChats(true) would also handle it)
                    }
                    return updatedChats;
                });
            } else if (eventType === 'DELETE') {
                // If the deleted message was the last message, we need to find the new last message
                // AND we should re-fetch the unread count to be accurate
                const [msgRes, statusRes] = await Promise.all([
                    supabase
                        .from('community_chat_messages')
                        .select('*, user:users(name)')
                        .eq('chat_id', message.chat_id)
                        .is('is_deleted', false)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle(),
                    supabase
                        .from('community_chat_read_status')
                        .select('last_read_at')
                        .eq('chat_id', message.chat_id)
                        .eq('user_id', user.id)
                        .maybeSingle()
                ]);

                const newLastMsg = msgRes.data;
                const lastReadTime = statusRes.data?.last_read_at || null;

                const { count: newUnreadCount } = lastReadTime ? await supabase
                    .from('community_chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('chat_id', message.chat_id)
                    .gt('created_at', lastReadTime)
                    .neq('user_id', user.id)
                    .is('is_deleted', false)
                    : { count: 0 };

                setChats(prev => {
                    const updatedChats = [...prev];
                    const targetChat = { ...updatedChats[chatIndex] };

                    targetChat.last_message = newLastMsg ? {
                        message_text: newLastMsg.message_text,
                        created_at: newLastMsg.created_at,
                        user: newLastMsg.user
                    } : null;
                    
                    targetChat.unread_count = newUnreadCount || 0;

                    updatedChats[chatIndex] = targetChat;
                    return updatedChats.sort((a, b) => {
                        const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
                        const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
                        return timeB - timeA;
                    });
                });
            }
        };

        let lastStatus: string | null = null;
        const rtToken = (supabase.realtime as any).accessToken;
        const channel = supabase
            .channel('public:community_chat_messages:list', {
                config: {
                    broadcast: { self: true }
                },
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'community_chat_messages'
                },
                (payload) => {
                    handleChatMessageChange(payload);
                }
            )
            .subscribe((status, err) => {
                if (status !== lastStatus) {
                    // console.log('[Chat List Realtime] Status:', status);
                    lastStatus = status;
                }
                if (err) console.error('[Chat List Realtime] Error:', err);
            });

        return () => {
            // console.log('[Chat List Realtime] Cleaning up');
            supabase.removeChannel(channel);
        };
    }, [user?.id, isRealtimeReady]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchChats();
    };

    const isNavigating = useRef(false);
    const handleChatPress = (chatId: string) => {
        if (isNavigating.current) return;
        isNavigating.current = true;

        // Optimistically clear unread count for immediate UI feedback
        setChats(prev => prev.map(chat => 
            chat.id === chatId ? { ...chat, unread_count: 0 } : chat
        ));
        router.push(`/chat/${chatId}`);

        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Community Chats</Text>
                <Text style={styles.subtitle}>Join discussions that move with you</Text>
            </View>


            <FlatList
                data={(loading && !refreshing ? [1, 2, 3, 4, 5] : chats) as any[]}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => (typeof item === 'number' ? `shimmer-${item}` : item.id)}
                renderItem={({ item, index }) => (
                    loading && !refreshing ? (
                        <ChatCardShimmer />
                    ) : (
                        <ChatCard
                            item={item as ChatItem}
                            onPress={() => handleChatPress((item as ChatItem).id)}
                            index={index}
                            isLast={index === (chats.length - 1)}
                        />
                    )
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Users size={48} color={colors.textLight} style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyText}>No communities joined yet</Text>
                            <Text style={styles.emptySubtext}>Join a community to start chatting!</Text>
                        </View>
                    ) : null
                }
            />
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
    iconButton: {
        padding: 8,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    listContent: {
        // padding: spacing.md,
    },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        // backgroundColor: colors.surface,
        // marginBottom: spacing.sm,
        // borderRadius: borderRadius.md,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.05,
        // shadowRadius: 2,
        // elevation: 2,
        // borderBottomWidth: 2,
        // borderColor: colors.borderLight,
    },
    communityLogo: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.borderLight,
    },
    chatContent: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    communityName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        paddingRight: 50
    },
    timeText: {
        fontSize: 12,
        color: colors.textLight,
        position: 'absolute',
        right: 0,
        top: 2,
        paddingLeft: 30
    },
    lastMessage: {
        fontSize: 14,
        color: colors.textMuted,
    },
    unreadBadge: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textLight,
    },
});
