import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Platform,
    Animated,
    DeviceEventEmitter,
    StatusBar,
    Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, ArrowLeft, Sparkles, ThumbsUp, ThumbsDown, Info, AlertCircle, Heart, BookOpen, Music, Share2, ChevronRight } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { useAuth, supabase } from '@/contexts/AuthContext';
import { MayaService } from '@/lib/maya/service';
import { MayaMessage, MayaChat } from '@/types/database';
import { format } from 'date-fns';
import KeyboardShiftView from '@/components/KeyboardShiftView';
import { MayaAgentThinking } from '@/components/shimmers/MayaAgentThinking';
import { DotsLoader } from '@/components/DotsLoader';
import { Toast } from '@/components/Toast';

const SUGGESTION_CARDS = [
    "How can I boost my mood today?",
    "I feel stressed, what should I do?",
    "Suggest a 5-minute meditation",
    "How can I sleep better?",
    "I feel anxious",
    "Give me a motivation boost",
    "How to manage work stress?",
    "Tips for digital detox",
    "Morning routine for energy",
    "Evening yoga for focus"
];

const SAFETY_MESSAGES: Record<string, string> = {
  abuse: "Let's keep this space respectful.",
  self_harm: "This sounds really important.",
  medical: "This may need professional support.",
  sexual: "Let's keep things appropriate here.",
  violence: "I can't help with harm-related topics.",
  illegal: "I can't support that request.",
  out_of_scope: "Let's focus on your wellbeing."
};

export default function MayaChatDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const chatId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const { user } = useAuth();
    const { subscription, isExpired, limits } = useSubscription();

    const [chat, setChat] = useState<MayaChat | null>(null);
    const [messages, setMessages] = useState<MayaMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
    const [randomSuggestions, setRandomSuggestions] = useState<string[]>([]);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'error' | 'success'>('error');
    const [isTyping, setIsTyping] = useState(false);
    const [typingText, setTypingText] = useState('');
    const isNavigating = useRef(false);

    const safePush = (route: string) => {
        if (isNavigating.current) return;
        isNavigating.current = true;
        // @ts-ignore
        router.push(route);
        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };
    
    const feedbackFadeAnim = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
    const skipFetchRef = useRef(false);

    useEffect(() => {
        const shuffled = [...SUGGESTION_CARDS].sort(() => 0.5 - Math.random());
        setRandomSuggestions(shuffled.slice(0, 3));
    }, []);

    const fetchChatData = useCallback(async () => {
        if (!chatId || !user) return;
        
        // Redirection Guard: If we JUST created this chat manually, don't re-fetch!
        if (skipFetchRef.current) {
            skipFetchRef.current = false;
            return;
        }

        try {
            const [msgs, { data }] = await Promise.all([
                MayaService.getMessages(chatId as string),
                supabase.from('maya_chats').select('*').eq('id', chatId).single()
            ]);
            setMessages(msgs);
            if (data) {
                setChat(data);
                setFeedback(data.feedback as any);
            }
        } catch (error: any) {
             // If we can't find it (like for a fresh temp session), stay here as New Chat
             setChat(null);
             setMessages([]);
        } finally {
            setLoading(false);
        }
    }, [chatId, user]);

    useEffect(() => {
        fetchChatData();
    }, [fetchChatData]);

    useEffect(() => {
        if (messages.length > 0) {
            Animated.timing(feedbackFadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [messages.length]);

    const simulateTyping = (fullText: string, onComplete: (text: string) => void) => {
        setIsTyping(true);
        setTypingText('');
        let charIndex = 0;
        
        const interval = setInterval(() => {
            if (charIndex < fullText.length) {
                const chunk = 4;
                setTypingText(fullText.slice(0, charIndex + chunk));
                charIndex += chunk;
            } else {
                clearInterval(interval);
                setIsTyping(false);
                onComplete(fullText);
            }
        }, 30);
    };

    const handleSend = async (text: string = inputText) => {
        const msgText = text.trim();
        if (!msgText || !user || sending || isTyping) return;
        
        // Apply 5-char minimum to typed input (already handled by button state, but this is for safety)
        if (msgText.length < 5) return;

        setInputText('');
        setSending(true);
        Keyboard.dismiss(); // Clean UI: Hide keyboard as Maya starts thinking

        const tempUserMsg: any = {
            id: 'temp-' + Date.now(),
            sender: 'user',
            message_text: msgText,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempUserMsg]);
        
        // Ensure user is at the bottom to see their message and Maya's upcoming response
        setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);

        try {
            let activeChatId = chat?.id;

            // Late Sync: Only create the Database record if this is our first ever message
            if (!chat) {
                const newChat = await MayaService.createChat(user.id, chatId as string);
                setChat(newChat);
                activeChatId = newChat.id;
            }

            const mayaMsg = await MayaService.sendMessage(activeChatId!, user.id, msgText);
            
            if (chat?.message_count === 0) {
                 const { data } = await supabase.from('maya_chats').select('*').eq('id', activeChatId!).single();
                 if (data) setChat(data);
            } else {
                setChat(prev => prev ? { ...prev, message_count: prev.message_count + 1 } : null);
            }

            setSending(false);
            DeviceEventEmitter.emit('maya_update');

            simulateTyping(mayaMsg.message_text, (finalText) => {
                setMessages(prev => {
                    const filtered = prev.filter(m => m.id !== tempUserMsg.id);
                    const realUserMsg: any = { 
                        ...tempUserMsg, 
                        id: (Date.now() - 1).toString(),
                        flagged: mayaMsg.flagged,
                        message_json: mayaMsg.flagged ? mayaMsg.message_json : undefined
                    };
                    return [...filtered, realUserMsg, { ...mayaMsg, message_text: finalText }];
                });

                // URL is already set to the real ID (from index), so no reload/replace happens!
            });

        } catch (error: any) {
            setSending(false);
            if (error.message === 'UPGRADE_REQUIRED_MESSAGES') {
                safePush('/subscription/upgrade');
            } else {
                setToastMsg(error.message || 'Failed to send message');
                setToastType('error');
            }
            setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
        }
    };

    const handleFeedback = async (val: 'up' | 'down') => {
        if (!chat || feedback === val) return;
        try {
            await MayaService.submitFeedback(chat.id, val);
            setFeedback(val);
            DeviceEventEmitter.emit('maya_update');
        } catch (e) {
            console.error(e);
        }
    };

    const renderFormattedText = (text: string, isMaya: boolean) => {
        if (!isMaya) return <Text style={styles.userText}>{text}</Text>;

        const lines = text.split('\n');
        return lines.map((line, i) => {
            if (!line.trim() && lines.length > 1) return <View key={i} style={{ height: 8 }} />;
            
            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
            const cleanLine = isBullet ? line.trim().substring(2) : line;

            const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);
            const formattedParts = parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <Text key={index} style={styles.boldText}>{part.slice(2, -2)}</Text>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <Text key={index} style={styles.italicText}>{part.slice(1, -1)}</Text>;
                }
                return part;
            });

            return (
                <View key={i} style={[styles.textLine, isBullet && styles.bulletLine]}>
                    {isBullet && <Text style={styles.bullet}>{'\u2022'}</Text>}
                    <Text style={styles.mayaText}>{formattedParts}</Text>
                </View>
            );
        });
    };

    const renderActionCard = (mayaMsg: MayaMessage, userMsg: MayaMessage | null) => {
        const mood = mayaMsg.mood_detected || userMsg?.mood_detected;
        const intent = mayaMsg.intent || userMsg?.intent;
        
        // Don't show cards for neutral/general chatter to avoid noise
        if (!mood || !intent || (mood === 'neutral' && intent === 'general_chat')) return null;

        let action = null;

        // 1. Beats (Stress/Sleep/Anxiety)
        if (intent === 'stress' || intent === 'sleep' || intent === 'breathing' || mood === 'stressed' || mood === 'anxious' || mood === 'tired') {
            action = {
                title: 'Listen to Calming Beats',
                subtitle: 'Find focus or better sleep now',
                icon: <Music size={20} color={colors.primary} />,
                route: '/beats'
            };
        } 
        // 2. Journal (Reflection/Sadness)
        else if (intent === 'journaling' || mood === 'sad' || mood === 'lonely') {
            action = {
                title: 'Write a Journal Entry',
                subtitle: 'Reflect on your thoughts further',
                icon: <BookOpen size={20} color={colors.primary} />,
                route: '/journal/new'
            };
        } 
        // 3. Community (Excitement/Happiness)
        else if (mood === 'happy' || mood === 'motivated') {
            action = {
                title: 'Share with Community',
                subtitle: 'Inspire others with your progress',
                icon: <Share2 size={20} color={colors.primary} />,
                route: '/posts/new'
            };
        }
        // 4. Detailed Mood Log (General emotional signal)
        else if (mood && mood !== 'neutral') {
             action = {
                title: 'Log your detailed Mood',
                subtitle: 'Track your emotional patterns',
                icon: <Heart size={20} color={colors.primary} />,
                route: '/mood/new'
            };
        }

        if (!action) return null;

        return (
            <TouchableOpacity 
                style={styles.actionCard} 
                onPress={() => safePush(action.route as any)}
                activeOpacity={0.7}
            >
                <View style={styles.actionIconContainer}>
                    {action.icon}
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </View>
                {/* <ChevronRight size={16} color={colors.textMuted} /> */}
            </TouchableOpacity>
        );
    };

    const renderMessage = ({ item, index }: { item: MayaMessage; index: number }) => {
        const isMaya = item.sender === 'maya';
        const isFlagged = !!item.flagged;
        const safetyCategory = item.message_json?.safety_category;
        const safetyLabel = safetyCategory ? SAFETY_MESSAGES[safetyCategory] : 'Potential safety violation flagged';
        
        // Dynamic fallback: If maya message doesn't have metadata, check the user message it responded to
        // messages are [Maya(N), User(N), Maya(N-1), User(N-1)...]
        const sortedMsgs = [...messages].reverse();
        const userMsgContext = (isMaya && sortedMsgs[index + 1]) ? sortedMsgs[index + 1] : null;

        return (
            <View style={styles.itemContainer}>
                <View style={[styles.messageRow, isMaya ? styles.mayaRow : styles.userRow]}>
                    {isMaya && (
                        <View style={styles.mayaAvatarContainer}>
                             <Sparkles size={16} color={colors.primary} fill={colors.primary} />
                        </View>
                    )}
                    <View style={styles.bubbleContainer}>
                        <View style={[
                            styles.bubble, 
                            isMaya ? styles.mayaBubble : styles.userBubble
                        ]}>
                            {renderFormattedText(item.message_text, isMaya)}
                            <Text style={[styles.messageTime, isMaya ? styles.mayaTime : styles.userTime]}>
                                {format(new Date(item.created_at), 'hh:mm a')}
                            </Text>
                        </View>
                        
                        {isFlagged && !isMaya && (
                            <View style={[styles.flaggedChip, { alignSelf: 'flex-end', marginTop: 6 }]}>
                                <AlertCircle size={10} color={colors.error} />
                                <Text style={styles.flaggedTextChip}>
                                    {safetyLabel}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                {isMaya && renderActionCard(item, userMsgContext)}
            </View>
        );
    };

    const sortedMessages = [...messages].reverse();
    const isFeatureNotIncluded = limits ? limits.maya.chats_per_day === 0 : false;
    
    // User messages only for counting
    const userMessageCount = messages.filter(m => m.sender === 'user').length;

    // Only use 2-message trial limit if the user's plan actually excludes Maya (chats_per_day: 0)
    // Otherwise, use the messages_per_chat from their plan (fallback to 50)
    const messageLimit = isFeatureNotIncluded ? 2 : (limits?.maya?.messages_per_chat ?? 50);
    const isChatLimitReached = userMessageCount >= messageLimit && messageLimit !== -1;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => {
                        if (isNavigating.current) return;
                        isNavigating.current = true;
                        router.back();
                        setTimeout(() => {
                            isNavigating.current = false;
                        }, 500);
                    }} 
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{chat?.title || 'Maya AI Session'}</Text>
                    <Text style={styles.headerSubtitle}>Wellness Companion</Text>
                </View>

                {messages.length > 0 && (
                    <Animated.View style={[styles.headerActions, { opacity: feedbackFadeAnim }]}>
                        {(!feedback || feedback === 'up') && (
                            <TouchableOpacity 
                                style={[styles.feedbackBtn, feedback === 'up' && styles.feedbackActive]}
                                onPress={() => handleFeedback('up')}
                                disabled={!!feedback}
                            >
                                <ThumbsUp size={18} color={feedback === 'up' ? colors.primary : colors.textMuted} />
                            </TouchableOpacity>
                        )}
                        {(!feedback || feedback === 'down') && (
                            <TouchableOpacity 
                                style={[styles.feedbackBtn, feedback === 'down' && styles.feedbackActive]}
                                onPress={() => handleFeedback('down')}
                                disabled={!!feedback}
                            >
                                <ThumbsDown size={18} color={feedback === 'down' ? colors.error : colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}
            </View>

            <KeyboardShiftView style={{ flex: 1 }}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <View style={styles.loadingMayaLogo}>
                            <Sparkles size={40} color={colors.primary} fill={colors.primary} />
                        </View>
                        <Text style={styles.loadingText}>Making your space ready...</Text>
                        <DotsLoader color={colors.primary} size={8} />
                    </View>
                ) : (
                    <>
                        <FlatList
                            ref={flatListRef}
                            data={sortedMessages}
                            inverted
                            keyExtractor={(item) => item.id}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.messageList}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={
                                <>
                                    {sending && <MayaAgentThinking />}
                                    {isTyping && (
                                        <View style={[styles.messageRow, styles.mayaRow]}>
                                            <View style={styles.mayaAvatarContainer}>
                                                <Sparkles size={16} color={colors.primary} fill={colors.primary} />
                                            </View>
                                            <View style={styles.bubbleContainer}>
                                                <View style={[styles.bubble, styles.mayaBubble]}>
                                                    {renderFormattedText(typingText, true)}
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                    
                                    {chat && isChatLimitReached && !isTyping && !sending && (
                                        <View style={styles.sessionDoneCard}>
                                            <View style={styles.limitBadge}>
                                                <View style={styles.limitIndicator} />
                                                <Text style={styles.limitBadgeText}>{userMessageCount}/{messageLimit} messages used.</Text>
                                            </View>
                                            <Text style={styles.sessionDoneTitle}>Session Completed</Text>
                                            <Text style={styles.sessionDoneSub}>
                                                {messageLimit === -1 
                                                    ? "You've had a great conversation! You can start a new one anytime."
                                                    : "You've reached the message limit for this chat based on your plan."
                                                }
                                            </Text>
                                            <TouchableOpacity 
                                                style={styles.newChatAltBtn}
                                                onPress={() => {
                                                    if (isNavigating.current) return;
                                                    isNavigating.current = true;
                                                    router.replace('/maya');
                                                    setTimeout(() => {
                                                        isNavigating.current = false;
                                                    }, 500);
                                                }}
                                            >
                                                <Text style={styles.newChatAltBtnText}>Browse Other Chats</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {messages.length > 0 && !sending && !isTyping && (
                                        <View style={styles.disclaimerContainer}>
                                            <Text style={styles.disclaimerText}>
                                                I'm here to support your wellbeing, but I'm not a medical professional. Please consult a doctor for medical concerns.
                                            </Text>
                                        </View>
                                    )}
                                </>
                            }
                            ListFooterComponent={
                                messages.length === 0 && !sending && !isTyping ? (
                                    <View style={styles.welcomeSection}>
                                        <View style={styles.mayaLogoBig}>
                                            <Sparkles size={32} color={colors.primary} fill={colors.primary} />
                                        </View>
                                        <Text style={styles.welcomeTitle}>Hello! I'm Maya</Text>
                                        <Text style={styles.welcomeSub}>I'm here to support your journey with wellness, stress management, and emotional guidance.</Text>
                                        <View style={styles.divider} />
                                    </View>
                                ) : null
                            }
                        />

                        {messages.length === 0 && !sending && !isTyping && (
                            <View style={styles.suggestionsContainer}>
                                <FlatList
                                    data={randomSuggestions}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={i => i}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity 
                                            style={styles.suggestionCard}
                                            onPress={() => handleSend(item)}
                                        >
                                            <Text style={styles.suggestionText}>{item}</Text>
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={styles.suggestionList}
                                />
                            </View>
                        )}

                        {(!chat || !isChatLimitReached) && !isExpired && (
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
                                    style={[styles.sendButton, (inputText.trim().length < 5 || sending || isTyping) && styles.sendButtonDisabled]}
                                    onPress={() => handleSend()}
                                    disabled={inputText.trim().length < 5 || sending || isTyping}
                                >
                                    <Send size={20} color={inputText.trim().length < 5 || sending || isTyping ? colors.textMuted : "#FFF"} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </KeyboardShiftView>

            <Toast message={toastMsg} onHide={() => setToastMsg(null)} type={toastType} />
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
        justifyContent: 'center',
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
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    feedbackBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    feedbackActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary + '30',
    },
    messageList: {
        padding: spacing.md,
    },
    welcomeSection: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: spacing.xl,
    },
    mayaLogoBig: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    welcomeTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 10,
    },
    welcomeSub: {
        fontSize: 16,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 24,
    },
    divider: {
        width: 100,
        height: 3,
        backgroundColor: colors.primary + '30',
        borderRadius: 2,
        marginTop: 40,
    },
    itemContainer: {
        width: '100%',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'flex-end',
    },
    mayaRow: {
        justifyContent: 'flex-start',
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    mayaAvatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    bubbleContainer: {
        flex: 1,
    },
    bubble: {
        padding: 16,
        borderRadius: 20,
        ...shadows.small,
        minWidth: 120,
    },
    mayaBubble: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignSelf: 'flex-start',
        marginRight: 40, 
    },
    userBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
        alignSelf: 'flex-end',
        marginLeft: 40,
    },
    mayaText: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#FFF',
        fontSize: 15,
        lineHeight: 22,
    },
    boldText: {
        fontWeight: 'bold',
        color: colors.primaryDark,
    },
    italicText: {
        fontStyle: 'italic',
        color: colors.text,
    },
    textLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bulletLine: {
        paddingLeft: 4,
    },
    bullet: {
        fontSize: 18,
        color: colors.primary,
        marginRight: 6,
        lineHeight: 22,
    },
    messageTime: {
        fontSize: 10,
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    mayaTime: {
        color: colors.textMuted,
    },
    userTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    flaggedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        // backgroundColor: colors.error + '10',
        borderRadius: 8,
        alignSelf: 'flex-start',
        // borderWidth: 0.5,
        // borderColor: colors.error + '30',
    },
    flaggedTextChip: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.error,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    disclaimerContainer: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        opacity: 0.5,
    },
    disclaimerText: {
        fontSize: 10,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 14,
        fontStyle: 'italic',
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        // backgroundColor: colors.surface,
        marginTop: -10,
        marginBottom: 20,
        marginLeft: 42,
        marginRight: 40,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        gap: 12,
    },
    actionIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionInfo: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    actionSubtitle: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    suggestionsContainer: {
        paddingVertical: spacing.md,
    },
    suggestionList: {
        paddingHorizontal: spacing.md,
    },
    suggestionCard: {
        backgroundColor: colors.surface,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginHorizontal: 6,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.small,
    },
    suggestionText: {
        fontSize: 14,
        color: colors.primaryDark,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
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
        backgroundColor: colors.border,
    },
    limitWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 6,
    },
    limitText: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '500',
    },
    sessionDoneCard: {
        backgroundColor: colors.surface,
        margin: spacing.lg,
        padding: spacing.xl,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.medium,
        marginBottom: spacing.xl + 10,
    },
    limitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: 8,
    },
    limitIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    limitBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textLight,
        letterSpacing: 0.5,
    },
    sessionDoneTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: 8,
    },
    sessionDoneSub: {
        fontSize: 14,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    newChatAltBtn: {
        backgroundColor: colors.primary + '10',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    newChatAltBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingMayaLogo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textLight,
        marginBottom: 20,
        fontWeight: '500',
    }
});
