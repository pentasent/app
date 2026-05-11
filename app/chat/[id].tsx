import { CustomImage as Image } from '@/components/CustomImage';
import { Toast } from '@/components/Toast';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Animated,
  Easing
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { Send, ArrowLeft, MoreVertical, Edit2, Reply, X, Copy, Trash2, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityChat, CommunityChatMessage, User } from '@/types/database';
import { ChatMembersModal } from '@/components/chat/ChatMembersModal';
// @ts-ignore
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import KeyboardShiftView from '@/components/KeyboardShiftView';
import { CommunityChatDetailShimmer } from '@/components/shimmers/CommunityChatDetailShimmer';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';
import crashlytics from '@/lib/crashlytics';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MessageWithUser = CommunityChatMessage & {
  user: User;
  parent_message?: {
    id: string;
    message_text: string;
    user?: { name: string };
  };
  tempId?: string; // For optimistic updates
  isSending?: boolean; // For optimistic visual state
};

// Helper to render text with links
const renderTextWithLinks = (text: string, style: any, isMe: boolean, onLinkPress: (url: string) => void) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <Text
              key={index}
              style={[style, {
                color: isMe ? '#fff1f6' : colors.primary,
                textDecorationLine: 'underline',
              }]}
              onPress={() => onLinkPress(part)}
            >
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const chatId = Array.isArray(id) ? id[0] : (id as string);
  const router = useRouter();
  const isNavigating = useRef(false);

  const safePush = (route: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push(route as any);
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  const handleLinkPress = (url: string) => {
    if (url.includes('pentasent.com/post/')) {
      const postId = url.split('/post/')[1]?.split(/[?#]/)[0];
      if (postId) {
        safePush(`/post/${postId}`);
        return;
      }
    }
    if (url.includes('pentasent.com/articles/')) {
      const slug = url.split('/articles/')[1]?.split(/[?#]/)[0];
      if (slug) {
        safePush(`/articles/${slug}`);
        return;
      }
    }
    Linking.openURL(url);
  };

  const { user, isRealtimeReady } = useAuth();
  const [chat, setChat] = useState<CommunityChat | null>(null);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<MessageWithUser | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageWithUser | null>(null);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [unreadSeparatorId, setUnreadSeparatorId] = useState<string | null>(null);

  // Options Modal State
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Highlighting State
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const blinkAnim = useRef(new Animated.Value(0)).current;
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollToBottomAnim = useRef(new Animated.Value(0)).current;
  const isScrollingToBottom = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const userCache = useRef<Map<string, User>>(new Map());
  
  const handleRealtimeUpdateRef = useRef<any>(null);
  useEffect(() => {
    handleRealtimeUpdateRef.current = handleRealtimeUpdate;
  });

  const MESSAGES_PER_PAGE = 30;
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    if (!chatId) return;

    // Start everything in parallel for maximum speed
    const init = async () => {
        // 1. Try to get community info from cache first for instant header display
        loadCommunityFromCache();
        
        // 2. Fire all network requests concurrently
        await Promise.all([
            fetchChatDetails(),
            fetchMemberCount(),
            initializeChat()
        ]);
    };

    init();
  }, [chatId]);

  const loadCommunityFromCache = async () => {
    if (!user || chat) return;
    try {
        const cached = await AsyncStorage.getItem(`chats_${user.id}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            const cachedChat = parsed.find((c: any) => c.id === chatId);
            if (cachedChat) {
                setChat(cachedChat);
                // If we have cached community info, we can potentially hide the top-level loading
                // but we still want to show a loading state for messages if they aren't here yet.
            }
        }
    } catch (e) {
        console.log('[Chat Detail Cache] Error:', e);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user || !chatId || !isRealtimeReady) return;

    // console.log(`[Realtime Chat] User and Realtime ready. Subscribing to chat:${chatId}`);
    let lastStatus: string | null = null;
    const channelId = `chat:${chatId}:${Date.now()}`;
    const subscription = supabase
      .channel(channelId, {
        config: {
          broadcast: { self: true },
          presence: { key: user.id }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          // console.log('[Realtime Chat] Received payload:', payload);
          handleRealtimeUpdateRef.current(payload);
        }
      )
      .subscribe((status, err) => {
        if (status !== lastStatus) {
          // console.log(`[Realtime Chat] Status for chat:${chatId}:`, status);
          lastStatus = status;
        }
        if (err) console.error('[Realtime Chat] Subscription error:', err);
      });

    return () => {
      // console.log(`[Realtime Chat] Cleaning up: chat:${chatId}`);
      supabase.removeChannel(subscription);
      updateLastRead();
    };
  }, [chatId, user?.id, isRealtimeReady]);

  // Handle Blink Effect
  useEffect(() => {
    if (highlightedId) {
      Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(blinkAnim, { toValue: 0, duration: 1000, useNativeDriver: false })
      ]).start(() => setHighlightedId(null));
    }
  }, [highlightedId]);

  // Scroll to Bottom Button Animation
  useEffect(() => {
    Animated.timing(scrollToBottomAnim, {
      toValue: showScrollToBottom ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0, 0.2, 1)
    }).start();
  }, [showScrollToBottom]);

  const updateLastRead = async () => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('community_chat_read_status')
        .select('id')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('community_chat_read_status')
          .update({
            last_read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('community_chat_read_status')
          .insert({
            chat_id: chatId,
            user_id: user.id,
            last_read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (error: any) {
      console.log('[ERROR]:', 'Error updating read receipt:', error);
    }
  };

  const fetchChatDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('community_chats')
        .select('*, community:communities(*)')
        .eq('id', chatId)
        .single();
      if (error) throw error;
      setChat(data);
    } catch (error: any) {
      console.log('[ERROR]:', 'Error fetching chat details:', error);
    }
  };

  const fetchMemberCount = async () => {
    try {
      const { count } = await supabase
        .from('community_chat_members')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('is_active', true);
      setMemberCount(count || 0);
    } catch (error) {
      console.log('[ERROR]:', 'Error fetching member count:', error);
    }
  };

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchMessages = async (beforeId: string | null = null, readAt: string | null = null) => {
    if (beforeId && (isFetchingMore || !hasMore)) return;
    
    if (beforeId) setIsFetchingMore(true);

    try {
      let query = supabase
        .from('community_chat_messages')
        .select(`
            *,
            user:users(*),
            parent_message:community_chat_messages!parent_message_id(
                id,
                message_text,
                user:users(name)
            )
        `)
        .eq('chat_id', chatId)
        .is('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (beforeId) {
        const beforeMsg = messages.find(m => m.id === beforeId);
        if (beforeMsg) {
          query = query.lt('created_at', beforeMsg.created_at);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const msgs = data || [];
      if (msgs.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      }

      if (!beforeId && (readAt || lastReadAt)) {
        const checkReadAt = readAt || lastReadAt;
        const firstUnread = [...msgs].reverse().find(m => new Date(m.created_at) > new Date(checkReadAt!));
        if (firstUnread) {
          setUnreadSeparatorId(firstUnread.id);
        }
      }

      setMessages(prev => beforeId ? [...prev, ...msgs] : msgs);

      msgs.forEach(msg => {
        if (msg.user) userCache.current.set(msg.user.id, msg.user);
      });
    } catch (error: any) {
      console.log('[ERROR]:', 'Error fetching messages:', error);
    } finally {
      if (beforeId) setIsFetchingMore(false);
      if (!beforeId) setIsInitialLoading(false);
    }
  };

  const loadMoreMessages = () => {
    if (!isInitialLoading && !isFetchingMore && hasMore && messages.length >= MESSAGES_PER_PAGE) {
        fetchMessages(messages[messages.length - 1].id);
    }
  };

  const initializeChat = async () => {
    // setLoading(true); // Don't block here if we can help it
    
    // Fetch read status and first page of messages CONCURRENTLY
    const [readRes, msgRes] = await Promise.all([
      supabase
        .from('community_chat_read_status')
        .select('last_read_at')
        .eq('chat_id', chatId)
        .eq('user_id', user?.id)
        .maybeSingle(),
      supabase
        .from('community_chat_messages')
        .select(`
            *,
            user:users(*),
            parent_message:community_chat_messages!parent_message_id(
                id,
                message_text,
                user:users(name)
            )
        `)
        .eq('chat_id', chatId)
        .is('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)
    ]);

    const readAt = readRes.data?.last_read_at || null;
    setLastReadAt(readAt);

    const msgs = msgRes.data || [];
    if (msgs.length < MESSAGES_PER_PAGE) setHasMore(false);

    if (readAt) {
      const firstUnread = [...msgs].reverse().find(m => new Date(m.created_at) > new Date(readAt));
      if (firstUnread) setUnreadSeparatorId(firstUnread.id);
    }

    setMessages(msgs);
    msgs.forEach(msg => { if (msg.user) userCache.current.set(msg.user.id, msg.user); });

    setLoading(false);
    setIsInitialLoading(false);
    updateLastRead();
  };

  const handleRealtimeUpdate = async (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newMsg = payload.new;

      // Avoid fetching the newly inserted message directly to prevent replication lag issues.
      // Instead, fetch only the necessary related data (user and parent message).
      // const [{ data: userData }, parentRes] = await Promise.all([
      //   supabase.from('users').select('*').eq('id', newMsg.user_id).single(),
      //   newMsg.parent_message_id
      //     ? supabase
      //       .from('community_chat_messages')
      //       .select('id, message_text, user:users(name)')
      //       .eq('id', newMsg.parent_message_id)
      //       .single()
      //     : Promise.resolve({ data: null })
      // ]);
      let userData = userCache.current.get(newMsg.user_id);

      if (!userData) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', newMsg.user_id)
          .single();

        if (data) {
          userCache.current.set(newMsg.user_id, data);
          userData = data;
        }
      }

      const parentRes = newMsg.parent_message_id
        ? await supabase
          .from('community_chat_messages')
          .select('id, message_text, user:users(name)')
          .eq('id', newMsg.parent_message_id)
          .single()
        : { data: null };

      const data = {
        ...newMsg,
        user: userData || { name: 'Unknown User' },
        parent_message: parentRes.data
      };

      setMessages(prev => {
        const isMyMessage = data.user_id === user?.id;
        if (isMyMessage) {
          const existingTempIndex = prev.findIndex(m =>
            m.tempId &&
            m.message_text === data.message_text &&
            m.isSending
          );

          if (existingTempIndex !== -1) {
            const newMessages = [...prev];
            newMessages[existingTempIndex] = {
              ...data,
              tempId: prev[existingTempIndex].tempId,
            };
            return newMessages;
          }
        }

        if (prev.some(m => m.id === data.id)) return prev;

        if (!isMyMessage) updateLastRead();

        // Since list is inverted, new messages are prepended to the array (top of the screen)
        return [data, ...prev];
      });

      // For inverted list, no need to scroll to end, as index 0 is the bottom
    } else if (payload.eventType === 'UPDATE') {
      setMessages(prev => {
        if (payload.new.is_deleted) {
          return prev.filter(msg => msg.id !== payload.new.id);
        }
        return prev.map(msg => {
          if (msg.id === payload.new.id) {
            return { ...msg, ...payload.new };
          }
          return msg;
        });
      });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    const textToSend = inputText;
    let parentMsg = undefined;
    let parentId = null;
    let parentText = null;

    // Robustly capture parent details
    if (replyingTo) {
      parentId = replyingTo.id;
      parentText = replyingTo.message_text;
      parentMsg = {
        id: replyingTo.id,
        message_text: replyingTo.message_text,
        user: {
          name: replyingTo.user?.name || 'User',
          avatar_url: replyingTo.user?.avatar_url
        }
      };
    }

    const tempId = `temp-${Date.now()}`;

    try {
      if (editingMessage) {
        // Prevent editing a message that hasn't been saved to DB yet (temp ID)
        if (typeof editingMessage.id === 'string' && editingMessage.id.startsWith('temp-')) {
          setToastType('info');
          setToastMsg('Message is in queue, please try again in a second.');
          return;
        }

        // 1. Optimistic Update Real Message in local state
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, message_text: textToSend, is_edited: true } : m));

        // 2. Clear states
        setInputText('');
        setEditingMessage(null);

        // 3. DB Update
        const { error } = await supabase
          .from('community_chat_messages')
          .update({
            message_text: textToSend,
            is_edited: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMessage.id);

        if (error) throw error;
      } else {
        // --- NEW MESSAGE FLOW ---
        const optimisticMessage: MessageWithUser = {
          id: tempId as any,
          chat_id: chatId,
          user_id: user.id,
          message_text: textToSend,
          parent_message_id: parentId,
          parent_message_text: parentText,
          parent_message: parentMsg as any,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: user as any,
          tempId: tempId,
          isSending: true
        };

        // 1. Optimistic Add to UI (Prepended because inverted)
        setMessages(prev => [optimisticMessage, ...prev]);
        setInputText('');
        setReplyingTo(null);

        // 2. DB Insert
        const { data: savedData, error } = await supabase
          .from('community_chat_messages')
          .insert({
            chat_id: chatId,
            user_id: user.id,
            message_text: textToSend,
            parent_message_id: parentId || null,
            parent_message_text: parentText || null
          })
          .select()
          .single();

        if (error) {
          setMessages(prev => prev.filter(m => m.tempId !== tempId));
          throw error;
        }

        if (savedData) {
          setMessages(prev => prev.map(m => m.tempId === tempId ? {
            ...m,
            ...savedData,
            user: m.user,
            parent_message: m.parent_message,
            tempId: undefined,
            isSending: false
          } : m));
        }
      }
    } catch (error: any) {
      crashlytics().recordError(error);
      console.log('[ERROR]:', 'Error sending/updating message:', error);
      setToastType('error');
      setToastMsg('Failed to process message');
    }
  };

  const handleScrollToBottom = () => {
    isScrollingToBottom.current = true;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowScrollToBottom(false);
  };

  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightedId(messageId);
    } else {
      // Message might not be loaded if pagination was implemented, but for now we load all.
      // Or it could be deleted.
    }
  };

  const handleLongPress = (message: MessageWithUser) => {
    setSelectedMessage(message);
    setOptionsModalVisible(true);
  };

  const handleOptionSelect = (action: 'reply' | 'edit' | 'delete' | 'copy') => {
    setOptionsModalVisible(false);
    if (!selectedMessage) return;

    switch (action) {
      case 'reply':
        startReply(selectedMessage);
        break;
      case 'edit':
        startEdit(selectedMessage);
        break;
      case 'delete':
        deleteMessage(selectedMessage.id);
        break;
      case 'copy':
        Clipboard.setStringAsync(selectedMessage.message_text);
        break;
    }
  };

  const startEdit = (message: MessageWithUser) => {
    // Prevent editing a message that hasn't been saved to DB yet (temp ID)
    if (typeof message.id === 'string' && message.id.startsWith('temp-')) {
      setToastType('info');
      setToastMsg('Message is in queue, please try again in a second.');
      return;
    }
    setEditingMessage(message);
    setInputText(message.message_text);
    setReplyingTo(null);
  };

  const startReply = (message: MessageWithUser) => {
    // We ensure we have the user name here. If it's missing in message object (optimistic?), fallback to 'User'
    setReplyingTo(message);
    setEditingMessage(null);
  };

  const deleteMessage = (messageId: string) => {
    setOptionsModalVisible(false);
    setShowDeleteModal(true);
  };

  const confirmDeleteMessage = async () => {
    if (!selectedMessage || isDeletingMessage) return;
    const messageId = selectedMessage.id;
    // Prevent deleting a message that hasn't been saved to DB yet (temp ID)
    if (typeof messageId === 'string' && messageId.startsWith('temp-')) {
      setToastType('info');
      setToastMsg('Message is in queue, please try again in a second.');
      setShowDeleteModal(false);
      return;
    }

    setIsDeletingMessage(true);
    try {
      const { error } = await supabase
        .from('community_chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setShowDeleteModal(false);
    } catch (error: any) {
      crashlytics().recordError(error);
      console.log('[ERROR]:', "Error deleting message:", error);
      setToastType('error');
      setToastMsg('Failed to delete message');
      setShowDeleteModal(false);
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const cancelAction = () => {
    setEditingMessage(null);
    setReplyingTo(null);
    setInputText('');
  };

  const renderMessage = ({ item }: { item: MessageWithUser }) => {
    const isMe = item.user_id === user?.id;
    if (item.is_deleted) return null;

    // Use parent_message_text if available, fallback to relation, finally null
    const parentMsg = item.parent_message_id ? (item.parent_message || { message_text: item.parent_message_text, user: { name: 'User' } }) : null;

    // Correction: User said "store parent message... so we can show message two lines easily".
    // So we should prefer `item.parent_message_text` for the text.

    const replyText = item.parent_message_text || item.parent_message?.message_text || '';
    const replyUser = item.parent_message?.user?.name || 'Message';


    const isHighlighted = item.id === highlightedId;

    const backgroundColor = isHighlighted
      ? blinkAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isMe ? colors.primary : colors.surface, colors.warning + '40']
      })
      : (isMe ? colors.primary : colors.surface);

    return (
      <View>
        {/* Unread Separator */}
        {item.id === unreadSeparatorId && (
          <View style={styles.unreadSeparator}>
            <View style={styles.unreadLine} />
            <Text style={styles.unreadText}>Unread Messages</Text>
            <View style={styles.unreadLine} />
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => handleLongPress(item)}
          style={[
            styles.messageRow,
            isMe ? styles.myMessageRow : styles.theirMessageRow
          ]}
        >
          {!isMe && (
            <Image
              source={{ uri: getImageUrl(item.user?.avatar_url) }}
              style={styles.avatar}
            />
          )}

          <Animated.View style={[
            styles.bubble,
            isMe ? styles.myBubble : styles.theirBubble,
            { backgroundColor }
          ]}>
            {!isMe && (
              <Text style={styles.senderName}>{item.user?.name || 'Unknown'}</Text>
            )}

            {/* Reply Context Block */}
            {item.parent_message_id && (replyText || parentMsg) && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => scrollToMessage(item.parent_message_id!)}
                style={styles.replyContainer}
              >
                <View style={isMe ? styles.replyBar : styles.theirReplyBar} />
                <View style={styles.replyContent}>
                  <Text style={isMe ? styles.replyUser : styles.theirreplyUser}>{replyUser}</Text>
                  <Text style={isMe ? styles.myTimeText : styles.replyText} numberOfLines={2}>{replyText}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Message Text with Links */}
            {renderTextWithLinks(item.message_text, [
              styles.messageText,
              isMe ? styles.myMessageText : styles.theirMessageText
            ], isMe, handleLinkPress)}

            <View style={styles.metaRow}>
              <Text style={[
                styles.timeText,
                isMe ? styles.myTimeText : styles.theirTimeText
              ]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
              {item.is_edited && (
                <Text style={[
                  styles.editedText,
                  isMe ? styles.myTimeText : styles.theirTimeText
                ]}> • Edited</Text>
              )}
              {/* {item.isSending && (
                <Text style={[
                  styles.editedText,
                  isMe ? styles.myTimeText : styles.theirTimeText
                ]}> • Sending...</Text>
              )} */}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <CommunityChatDetailShimmer onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar style="dark" />
      <Toast
        message={toastMsg}
        onHide={() => setToastMsg(null)}
        type={toastType}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        {chat && (
          <TouchableOpacity
            style={styles.headerInfo}
            onPress={() => setMembersModalVisible(true)}
          >
            <Image
              source={{ uri: getImageUrl(chat.community?.logo_url) }}
              style={styles.headerLogo}
            />
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>{chat.community?.name}</Text>
              <Text style={styles.headerSubtitle}>
                {formatNumber(memberCount)} members • Created {new Date(chat.community?.created_at || new Date()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* <TouchableOpacity onPress={() => setMembersModalVisible(true)} style={styles.menuButton}>
          <MoreVertical size={24} color={colors.text} />
        </TouchableOpacity> */}
      </View>

      {/* Messages & Input wrapped in one KeyboardShiftView for unified behavior */}
      <KeyboardShiftView style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            showsVerticalScrollIndicator={false}
            renderItem={renderMessage}
            keyExtractor={(item, index) => item.id ?? item.tempId ?? `msg-${index}`}
            contentContainerStyle={styles.listContent}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.15}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'ios'}
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              if (isScrollingToBottom.current) {
                if (event.nativeEvent.contentOffset.y <= 10) {
                  isScrollingToBottom.current = false;
                }
                return;
              }
              const y = event.nativeEvent.contentOffset.y;
              if (y > 300 && !showScrollToBottom) {
                setShowScrollToBottom(true);
              } else if (y <= 300 && showScrollToBottom) {
                setShowScrollToBottom(false);
              }
            }}
            onMomentumScrollEnd={() => {
              isScrollingToBottom.current = false;
            }}
            scrollEventThrottle={16}
            ListFooterComponent={() => isFetchingMore ? (
                <View style={{ paddingVertical: spacing.md }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            ) : null}
            style={{ flex: 1 }}
          />
        )}

        {/* Input Area */}
        <ConfirmationModal
          visible={showDeleteModal}
          title="Delete Message"
          message="Are you sure you want to delete this message?"
          confirmText="Delete"
          isLoading={isDeletingMessage}
          onConfirm={confirmDeleteMessage}
          onCancel={() => setShowDeleteModal(false)}
        />
        <View>
          {/* Context Bar (Replying/Editing) */}
          {(replyingTo || editingMessage) && (
            <View style={styles.contextBar}>
              <View style={styles.contextContent}>
                {editingMessage ? (
                  <>
                    <Edit2 size={16} color={colors.primary} />
                    <Text style={styles.contextText}>Editing message</Text>
                  </>
                ) : (
                  <>
                    <Reply size={16} color={colors.primary} />
                    <Text style={styles.contextText}>Replying to {replyingTo?.user?.name || 'User'}</Text>
                  </>
                )}
              </View>
              <TouchableOpacity onPress={cancelAction}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity
              style={!inputText ? styles.sendButtonDisabled : styles.sendButton}
              onPress={handleSend}
              disabled={!inputText}
            >
              <Send size={20} color={!inputText ? colors.textMuted : '#FFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardShiftView>

      <ChatMembersModal
        visible={membersModalVisible}
        onClose={() => setMembersModalVisible(false)}
        chatId={chatId}

      />

      {/* Options Modal */}
      <Modal
        statusBarTranslucent transparent
        visible={optionsModalVisible}
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionItem} onPress={() => handleOptionSelect('reply')}>
              <Reply size={20} color={colors.text} />
              <Text style={styles.optionText}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={() => handleOptionSelect('copy')}>
              <Copy size={20} color={colors.text} />
              <Text style={styles.optionText}>Copy Text</Text>
            </TouchableOpacity>

            {selectedMessage?.user_id === user?.id && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.optionItem} onPress={() => handleOptionSelect('edit')}>
                  <Edit2 size={20} color={colors.text} />
                  <Text style={styles.optionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionItem} onPress={() => handleOptionSelect('delete')}>
                  <Trash2 size={20} color={colors.error} />
                  <Text style={[styles.optionText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Scroll to Bottom Button */}
      <Animated.View
        style={[
          styles.scrollToBottomBtn,
          {
            opacity: scrollToBottomAnim,
            transform: [
              { scale: scrollToBottomAnim },
              { translateY: scrollToBottomAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0]
                })
              }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.scrollToBottomInner}
          onPress={handleScrollToBottom}
          activeOpacity={0.8}
        >
          <ChevronDown size={24} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 50
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  menuButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: colors.borderLight,
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    minWidth: '30%'
  },
  myBubble: {
    // backgroundColor is animated inline
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    // backgroundColor is animated inline, default surface
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
  },
  editedText: {
    fontSize: 10,
    marginLeft: 4,
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirTimeText: {
    color: colors.textMuted,
  },
  contextBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  contextContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 0 : spacing.md, // Handle safe area padding through KeyboardShiftView
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: colors.text,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // New Styles
  replyContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
    minWidth: 200,
  },
  replyBar: {
    width: 4,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
  theirReplyBar: {
    width: 4,
    backgroundColor: colors.primary + "60",
    opacity: 0.7,
  },
  replyContent: {
    padding: 6,
    flex: 1
  },
  replyUser: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffe8d6',
    marginBottom: 2,
  },
  theirreplyUser: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary + "60",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#a7a1a1ff',
    opacity: 0.7,
  },
  // Unread Divider
  unreadSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  unreadLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  unreadText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  optionsContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    width: '80%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  scrollToBottomBtn: {
    position: 'absolute',
    bottom: 100, // Above input container approx
    right: 16,
    zIndex: 1000,
  },
  scrollToBottomInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
