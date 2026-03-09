import { CustomImage as Image } from '@/components/CustomImage';
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
  Alert,
  Modal,
  Pressable,
  LayoutAnimation,
  Linking,
  Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { Send, ArrowLeft, MoreVertical, Edit2, Reply, X, Copy, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityChat, CommunityChatMessage, User } from '@/types/database';
import { ChatMembersModal } from '@/components/chat/ChatMembersModal';
// @ts-ignore
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import KeyboardShiftView from '@/components/KeyboardShiftView';
import { CommunityChatDetailShimmer } from '@/components/shimmers/CommunityChatDetailShimmer';
import { formatNumber } from '@/utils/format';

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
const renderTextWithLinks = (text: string, style: any, isMe: boolean, router: any) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          const handlePress = () => {
            if (part.includes('pentasent.com/post/') || part.includes('pentasent.com/post/')) {
              const postId = part.split('/post/')[1]?.split(/[?#]/)[0];
              if (postId) {
                router.push(`/post/${postId}`);
                return;
              }
            }
            Linking.openURL(part);
          };

          return (
            <Text
              key={index}
              style={[style, {
                color: isMe ? colors.primaryDark : colors.primary, // 👈 changed
                textDecorationLine: 'underline',
              }]}
              onPress={handlePress}
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
  const router = useRouter();
  const { user } = useAuth();
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

  // Highlighting State
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const blinkAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);

  const chatId = Array.isArray(id) ? id[0] : id;

  const handleRealtimeUpdateRef = useRef<any>(null);
  useEffect(() => {
    handleRealtimeUpdateRef.current = handleRealtimeUpdate;
  });

  useEffect(() => {
    fetchChatDetails();
    fetchMemberCount();
    initializeChat();

    // Subscription for real-time updates
    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[Realtime Chat] Received payload:', payload);
          handleRealtimeUpdateRef.current(payload);
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime Chat] Subscription status for chat:${chatId}:`, status);
        if (err) console.error('[Realtime Chat] Subscription error:', err);
      });

    return () => {
      supabase.removeChannel(subscription);
      updateLastRead(); // Update read receipt on exit
    };
  }, [chatId]);

  // Handle Blink Effect
  useEffect(() => {
    if (highlightedId) {
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        })
      ]).start(() => setHighlightedId(null));
    }
  }, [highlightedId]);

  const initializeChat = async () => {
    setLoading(true);
    // 1. Get last read time from new table
    const { data: readStatus } = await supabase
      .from('community_chat_read_status')
      .select('last_read_at')
      .eq('chat_id', chatId)
      .eq('user_id', user?.id)
      .single();

    const readAt = readStatus?.last_read_at || null;
    setLastReadAt(readAt);

    // 2. Fetch messages
    await fetchMessages(readAt);
    setLoading(false);

    // 3. Update read time to now (after initial load)
    updateLastRead();
  };

  const updateLastRead = async () => {
    if (!user) return;
    try {
      // Upsert into community_chat_read_status
      const { error } = await supabase
        .from('community_chat_read_status')
        .upsert({
          chat_id: chatId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'chat_id,user_id' });

      if (error) console.error('Error updating read status:', error);
    } catch (error) {
      console.error('Error updating read receipt:', error);
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
    } catch (error) {
      console.error('Error fetching chat details:', error);
    }
  };

  const fetchMemberCount = async () => {
    try {
      const { count, error } = await supabase
        .from('community_chat_members')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('is_active', true);

      if (error) throw error;
      setMemberCount(count || 0);
    } catch (error) {
      console.error('Error fetching member count:', error);
    }
  };

  const fetchMessages = async (readAt: string | null) => {
    try {
      const { data, error } = await supabase
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
        .order('created_at', { ascending: true });

      if (error) throw error;

      const msgs = data || [];
      if (readAt) {
        // Find first message AFTER readAt
        const firstUnread = msgs.find(m => new Date(m.created_at) > new Date(readAt));
        if (firstUnread) {
          setUnreadSeparatorId(firstUnread.id);
        }
      } else if (msgs.length > 0) {
        // If never read, maybe mark all as unread? Or just start fresh.
        // For now, let's not show separator if never read to avoid clutter on first join.
      }

      setMessages(msgs);

      // Scroll logic: if unread found, maybe scroll to it? 
      // Standard behavior: scroll to bottom, show toast "Unread messages".
      // Implementation: Scroll to bottom for now.
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 500);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleRealtimeUpdate = async (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const { data, error } = await supabase
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
        .eq('id', payload.new.id)
        .single();

      if (!error && data) {
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
              newMessages[existingTempIndex] = data;
              return newMessages;
            }
          }
          return [...prev, data];
        });

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
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
    const optimisticMessage: MessageWithUser = {
      id: tempId as any,
      chat_id: chatId,
      user_id: user.id,
      message_text: textToSend,
      parent_message_id: parentId,
      parent_message_text: parentText, // Store text directly
      parent_message: parentMsg as any,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: user as User,
      tempId: tempId,
      isSending: true
    };

    // UI Update
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    setReplyingTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      if (editingMessage) {
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, message_text: inputText, is_edited: true } : m));
        setEditingMessage(null);

        const { error } = await supabase
          .from('community_chat_messages')
          .update({
            message_text: inputText,
            is_edited: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMessage.id);

        if (error) throw error;
      } else {
        // Ensure parent_message_id is explicitly passed as null if undefined
        const { error } = await supabase
          .from('community_chat_messages')
          .insert({
            chat_id: chatId,
            user_id: user.id,
            message_text: textToSend,
            parent_message_id: parentId || null,
            parent_message_text: parentText || null
          });

        if (error) {
          setMessages(prev => prev.filter(m => m.tempId !== tempId));
          throw error;
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
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
    setEditingMessage(message);
    setInputText(message.message_text);
    setReplyingTo(null);
  };

  const startReply = (message: MessageWithUser) => {
    // We ensure we have the user name here. If it's missing in message object (optimistic?), fallback to 'User'
    setReplyingTo(message);
    setEditingMessage(null);
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('community_chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      Alert.alert('Error', 'Failed to delete message');
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
              source={{ uri: item.user?.avatar_url || 'https://via.placeholder.com/30' }}
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
                <View style={styles.replyBar} />
                <View style={styles.replyContent}>
                  <Text style={styles.replyUser}>{replyUser}</Text>
                  <Text style={isMe ? styles.myTimeText : styles.replyText} numberOfLines={2}>{replyText}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Message Text with Links */}
            {renderTextWithLinks(item.message_text, [
              styles.messageText,
              isMe ? styles.myMessageText : styles.theirMessageText
            ], isMe, router)}

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
              source={{ uri: chat.community?.logo_url || 'https://via.placeholder.com/40' }}
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

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id || item.tempId || Math.random().toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          style={{ flex: 1 }}
        />
      )}

      {/* Input Area */}
      <KeyboardShiftView>
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
            {/* Always show Send icon, no loader */}
            <Send size={20} color={!inputText ? colors.textMuted : '#FFF'} />
          </TouchableOpacity>
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
    paddingBottom: spacing.lg,
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: colors.text,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  replyContent: {
    padding: 6,
    flex: 1
  },
  replyUser: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accentDark,
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
});
