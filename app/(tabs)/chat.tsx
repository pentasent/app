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
    SafeAreaView
} from 'react-native';
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

export default function ChatListScreen() {
    const router = useRouter();
    const { user } = useAuth();
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
            if (!silent) setLoading(true);
            // 1. Get chats user is a member of
            const { data: memberData, error: memberError } = await supabase
                .from('community_chat_members')
                .select('chat_id')
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (memberError) throw memberError;

            if (!memberData || memberData.length === 0) {
                setChats([]);
                setLoading(false);
                return;
            }

            const chatIds = memberData.map(m => m.chat_id);

            // 2. Fetch details for these chats
            const { data: chatData, error: chatError } = await supabase
                .from('community_chats')
                .select(`
                    *,
                    community:communities(*)
                `)
                .in('id', chatIds)
                .eq('is_active', true);

            if (chatError) throw chatError;

            // 3. For each chat, fetch last message and unread count
            const chatsWithDetails = await Promise.all(chatData.map(async (chat: any) => {
                // Fetch last message
                const { data: msgData } = await supabase
                    .from('community_chat_messages')
                    .select('*, user:users(name)')
                    .eq('chat_id', chat.id)
                    .is('is_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // Fetch last read status
                const { data: readStatus } = await supabase
                    .from('community_chat_read_status')
                    .select('last_read_at')
                    .eq('chat_id', chat.id)
                    .eq('user_id', user.id)
                    .single();

                let unreadCount = 0;
                // Get member info for fallback (joined_at)
                const memberInfo = memberData.find((m: any) => m.chat_id === chat.id); // memberData only has chat_id, need to re-fetch if we want joined_at? 
                // Actually, let's just default to 'now' if no status exists (new user) or 0?
                // Better logic: If no status, check joined_at. 
                // But memberData above only selected chat_id. Let's rely on readStatus.
                // If no readStatus, user hasn't opened chat since feature launch. 
                // To avoid showing ALL messages as unread, let's treat as 0 or maybe fetch joined_at?
                // Let's keep it simple: if no read status, count 0 for now to avoid noise, or maybe 1?
                // User spec: "When User Opens Chat... Upsert". So initially it might be empty.

                const lastReadTime = readStatus?.last_read_at;

                if (lastReadTime) {
                    const { count } = await supabase
                        .from('community_chat_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('chat_id', chat.id)
                        .gt('created_at', lastReadTime)
                        .neq('user_id', user.id); // Don't count own messages
                    unreadCount = count || 0;
                }

                return {
                    ...chat,
                    community: chat.community,
                    last_message: msgData ? {
                        message_text: msgData.message_text,
                        created_at: msgData.created_at,
                        user: msgData.user
                    } : null,
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

        } catch (error:any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', 'Error fetching chats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user || !user.is_onboarded) return;
        fetchChats();
    }, [fetchChats, user]);

    useFocusEffect(
        useCallback(() => {
            if (user && user.is_onboarded) {
                fetchChats(true);
            }
        }, [fetchChats, user])
    );

    // Real-time subscription for main chat list
    useEffect(() => {
        if (!user || !user.is_onboarded) return;

        const handleNewMessage = async (payload: any) => {
            const currentChats = chatsRef.current;
            const newMsg = payload.new;

            // Check if this message belongs to a chat the user is in
            const chatIndex = currentChats.findIndex((c: ChatItem) => c.id === newMsg.chat_id);
            if (chatIndex === -1) return; // User is not part of this chat

            // Fetch user info for the message preview
            const { data: userData } = await supabase
                .from('users')
                .select('name')
                .eq('id', newMsg.user_id)
                .single();

            const isMyMessage = newMsg.user_id === user.id;

            setChats(prev => {
                const updatedChats = [...prev];
                const targetChat = { ...updatedChats[chatIndex] };

                targetChat.last_message = {
                    message_text: newMsg.message_text,
                    created_at: newMsg.created_at,
                    user: { name: userData?.name || 'User' }
                };

                // Increment unread count if it's not my message
                if (!isMyMessage) {
                    targetChat.unread_count = (targetChat.unread_count || 0) + 1;
                }

                updatedChats[chatIndex] = targetChat;

                // Sort again to bring the updated chat to the top
                return updatedChats.sort((a, b) => {
                    const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
                    const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
                    return timeB - timeA;
                });
            });
        };

        let lastStatus: string | null = null;
        const channel = supabase
            .channel('public:community_chat_messages:list')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'community_chat_messages'
                },
                handleNewMessage
            )
            .subscribe((status, err) => {
                if (status !== lastStatus) {
                    console.log('[Chat List Realtime] Status:', status);
                    lastStatus = status;
                }
                if (err) console.log('[ERROR]:', '[Chat List Realtime] Error:', err);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchChats();
    };

    const handleChatPress = (chatId: string) => {
        router.push(`/chat/${chatId}`);
    };

    const renderItem = ({ item }: { item: ChatItem }) => (
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() => handleChatPress(item.id)}
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
            ) : (
                // <ChevronRight size={20} color={colors.textLight} />
                <></>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Community Chats</Text>
                <Text style={styles.subtitle}>Join discussions that move with you</Text>
            </View>


            {loading && !refreshing ? (
                <View style={styles.listContent}>
                    <ChatCardShimmer />
                    <ChatCardShimmer />
                    <ChatCardShimmer />
                    <ChatCardShimmer />
                    <ChatCardShimmer />
                </View>
            ) : (
                <FlatList
                    data={chats}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => (
                        <View style={{ height: 2, backgroundColor: colors.borderLight }} />
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Users size={48} color={colors.textLight} style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyText}>No communities joined yet</Text>
                            <Text style={styles.emptySubtext}>Join a community to start chatting!</Text>
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
