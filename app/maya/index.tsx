import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, DeviceEventEmitter, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Sparkles, Plus, MessageCircle, ChevronRight, LayoutGrid, Clock, ArrowLeft, MoreVertical, Zap, Info } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/contexts/AuthContext';
import { MayaService } from '@/lib/maya/service';
import { MayaChat } from '@/types/database';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { StatusBar } from 'expo-status-bar';
import { MayaChatCardShimmer } from '@/components/shimmers/MayaChatCardShimmer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AlertCircle } from 'lucide-react-native';

export default function MayaHomeScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [chats, setChats] = useState<MayaChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const { subscription, isExpired, limits } = useSubscription();
    const [todayCount, setTodayCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const isNavigating = React.useRef(false);

    const safePush = (route: string) => {
        if (isNavigating.current) return;
        isNavigating.current = true;
        // @ts-ignore
        router.push(route);
        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };

    const fetchChats = useCallback(async (silent = false) => {
        if (!user) return;
        try {
            if (!silent) setLoading(true);
            const data = await MayaService.listChats(user.id);
            fetchTodayCount();
            fetchTotalCount();

            // Ensure absolute latest sorting (fallback created_at if last_message_at is null)
            const sortedData = (data ?? []).sort((a, b) => {
                const dateA = new Date(a.last_message_at || a.created_at).getTime();
                const dateB = new Date(b.last_message_at || b.created_at).getTime();
                return dateB - dateA;
            });

            setChats(sortedData);
        } catch (error) {
            console.error('Error fetching Maya data:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [user]);

    const fetchTodayCount = useCallback(async () => {
        if (!user) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { count, error } = await supabase
            .from('maya_chats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true)
            .gte('created_at', todayStart.toISOString());
            
        if (!error) {
            setTodayCount(count || 0);
        }
    }, [user]);

    const fetchTotalCount = useCallback(async () => {
        if (!user) return;
        
        const { count, error } = await supabase
            .from('maya_chats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true);
            
        if (!error) {
            setTotalCount(count || 0);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchChats(true);
        }, [fetchChats])
    );

    useEffect(() => {
        fetchChats();
        const sub = DeviceEventEmitter.addListener('maya_update', () => fetchChats(true));
        return () => sub.remove();
    }, [fetchChats]);

    const isLimitReached = limits ? todayCount >= limits.maya.chats_per_day && limits.maya.chats_per_day !== -1 : false;
    const isFeatureNotIncluded = limits ? (limits.maya.chats_per_day === 0) : false;
    
    // Trial is only for active subscribers who have 0 chats in history and 0 chats allowed in plan
    const canTryComplementary = !!subscription && !isExpired && isFeatureNotIncluded && totalCount === 0 && chats.length === 0;
    
    const canCreate = !isExpired && !!subscription && (!isLimitReached || canTryComplementary) && (!isFeatureNotIncluded || canTryComplementary);

    const handleNewChat = () => {
        if (!user || isNavigating.current) return;
        isNavigating.current = true;
        
        if (!canCreate) {
             router.push('/subscription/upgrade');
             setTimeout(() => {
                isNavigating.current = false;
             }, 500);
             return;
        }
        
        // Instant Navigation: Generate a valid UUID v4 and go there immediately 
        const tempId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        router.push(`/maya/${tempId}`);
        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };

    const renderSubscriptionCards = () => {
        if (loading) return null;

        const chatsPerDay = limits?.maya?.chats_per_day ?? 0;
        const remainingToday = limits ? chatsPerDay - todayCount : 0;

        return (
            <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
                {/* 1. Subscription Expired Card (Highest Priority) */}
                {(isExpired || !subscription) && (
                    <View style={styles.expiredCard}>
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.expiredIconContainer}>
                                <AlertCircle size={20} color={colors.error} />
                            </View>
                            <Text style={styles.expiredTitle}>Subscription Expired</Text>
                        </View>
                        <Text style={styles.expiredSubtitle}>Please renew your plan to continue your wellness journey with Maya AI.</Text>
                        <TouchableOpacity 
                            style={styles.renewButtonFull}
                            onPress={() => safePush('/subscription/upgrade')}
                        >
                            <Text style={styles.renewButtonText}>RENEW SUBSCRIPTION</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* 2. Active Plan Logic */}
                {!isExpired && !!subscription && (
                    <>
                        {/* Daily Limit Reached (Only if plan allows chats) */}
                        {isLimitReached && chatsPerDay > 0 && (
                            <View style={styles.limitCard}>
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.limitIconContainer}>
                                        <Sparkles size={20} color="#F59E0B" />
                                    </View>
                                    <Text style={styles.limitTitle}>Daily Limit Reached</Text>
                                </View>
                                <Text style={styles.limitSubtitle}>You've used all your Maya chats for today. Upgrade for more!</Text>
                                <TouchableOpacity 
                                    style={styles.upgradeButtonFull}
                                    onPress={() => safePush('/subscription/upgrade')}
                                >
                                    <Text style={styles.upgradeButtonText}>UPGRADE PLAN</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* 1 Chat Left for Today (Only if plan allows > 0 chats) */}
                        {!isLimitReached && chatsPerDay > 0 && remainingToday === 1 && (
                            <View style={styles.oneLeftCard}>
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.oneLeftIconContainer}>
                                        <Zap size={20} color={colors.primary} />
                                    </View>
                                    <Text style={styles.oneLeftTitle}>1 Chat Left for Today</Text>
                                </View>
                                <Text style={styles.oneLeftSubtitle}>You have one chat remaining for today. Upgrade for unlimited access!</Text>
                                <TouchableOpacity 
                                    style={styles.upgradeActionFull}
                                    onPress={() => safePush('/subscription/upgrade')}
                                >
                                    <Text style={styles.upgradeActionText}>GET UNLIMITED ACCESS</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Complementary Trial (Only if plan allows 0 chats) */}
                        {canTryComplementary && (
                            <View style={styles.complementaryCard}>
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.complementaryIconContainer}>
                                        <Sparkles size={20} color="#F59E0B" />
                                    </View>
                                    <Text style={styles.complementaryTitle}>Try Maya AI (Complementary)</Text>
                                </View>
                                <Text style={styles.complementarySubtitle}>Your plan doesn't include Maya, but you can try one session (2 messages) for free!</Text>
                                <TouchableOpacity 
                                    style={styles.tryButtonFull}
                                    onPress={handleNewChat}
                                >
                                    <Text style={styles.tryButtonText}>START TRIAL SESSION</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Feature Not Included (Fallback for 0 chats allowed users) */}
                        {isFeatureNotIncluded && !canTryComplementary && (
                            <View style={styles.notIncludedCard}>
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.notIncludedIconContainer}>
                                        <Zap size={20} color={colors.primary} />
                                    </View>
                                    <Text style={styles.notIncludedTitle}>Feature Not Included</Text>
                                </View>
                                <Text style={styles.notIncludedSubtitle}>Your current plan doesn't include Maya AI. Upgrade to unlock your AI companion!</Text>
                                <TouchableOpacity 
                                    style={styles.exploreButtonFull}
                                    onPress={() => safePush('/subscription/upgrade')}
                                >
                                    <Text style={styles.exploreButtonText}>EXPLORE PLANS</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </View>
        );
    };

    const groupChats = () => {
        const sections: { title: string; data: MayaChat[] }[] = [
            { title: 'Today', data: [] },
            { title: 'Yesterday', data: [] },
            { title: 'Earlier', data: [] }
        ];

        // Filter out empty chats (message_count === 0) and group the rest
        const activeChats = chats.filter(chat => (chat.message_count ?? 0) > 0);

        activeChats.forEach(chat => {
            const date = new Date(chat.last_message_at || chat.created_at);
            if (isToday(date)) {
                sections[0].data.push(chat);
            } else if (isYesterday(date)) {
                sections[1].data.push(chat);
            } else {
                sections[2].data.push(chat);
            }
        });

        // The chats are already sorted by MayaService.listChats (ORDER BY last_message_at DESC)
        // So the grouped data is naturally ordered with latest on top!
        return sections.filter(s => s.data.length > 0);
    };

    const renderItem = ({ item }: { item: MayaChat }) => {
        const activityDate = new Date(item.last_message_at || item.created_at);
        const day = format(activityDate, 'dd');
        const weekday = format(activityDate, 'EEE');

        return (
            <TouchableOpacity
                style={styles.chatCard}
                onPress={() => safePush(`/maya/${item.id}`)}
                activeOpacity={0.7}
            >
                <View style={styles.dateColumn}>
                    <Text style={styles.dayText}>{day}</Text>
                    <Text style={styles.weekdayText}>{weekday}</Text>
                </View>

                <View style={styles.chatInfo}>
                    <View style={styles.titleRow}>
                        <Text style={styles.chatTitle} numberOfLines={1}>{item.title || 'Wellness Chat'}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.chatDate}>
                             {item.last_message_at ? "Last active " : "Created "} 
                             {format(activityDate, 'MMM do, h:mm a')}
                        </Text>
                        <View style={styles.dot} />
                        <Text style={styles.msgCount}>{item.message_count} msgs</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor={colors.background} />
            
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Maya AI</Text>
                        <Text style={styles.headerSubtitle}>Personal wellness companion</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => safePush('/(tabs)/explore')}
                    >
                        <LayoutGrid size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ paddingHorizontal: spacing.lg }}>
                {renderSubscriptionCards()}
            </View>

            {loading ? (
                <View style={styles.list}>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <View key={index}>
                            <MayaChatCardShimmer />
                            {index < 4 && <View style={styles.separator} />}
                        </View>
                    ))}
                </View>
            ) : (
                <SectionList
                    sections={groupChats()}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.list}
                    stickySectionHeadersEnabled={false}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIconContainer}>
                                <Sparkles size={40} color={colors.primary} />
                            </View>
                            <Text style={styles.emptyText}>No conversations yet</Text>
                            <Text style={styles.emptySub}>Start a chat with Maya to explore your wellness journey.</Text>
                        </View>
                    }
                />
            )}

            {canCreate && (
                <TouchableOpacity 
                    style={[styles.fab, creating && { opacity: 0.7 }]} 
                    onPress={handleNewChat}
                    disabled={creating}
                >
                    {creating ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Plus size={28} color="#FFF" />
                    )}
                </TouchableOpacity>
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
        paddingTop: spacing.sm + 5,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textLight,
    },
    upgradeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        marginHorizontal: spacing.lg,
        marginVertical: 10,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.small,
    },
    upgradeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    upgradeContent: {
        flex: 1,
    },
    upgradeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    upgradeSub: {
        fontSize: 12,
        color: colors.textLight,
        lineHeight: 18,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    complementaryCard: {
        backgroundColor: '#F59E0B' + '10',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#F59E0B' + '20',
        marginTop: spacing.sm,
    },
    complementaryIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F59E0B' + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    complementaryTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F59E0B',
    },
    complementarySubtitle: {
        fontSize: 13,
        color: colors.textLight,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    tryButtonFull: {
        backgroundColor: '#F59E0B',
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tryButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    notIncludedCard: {
        backgroundColor: colors.primary + '10',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.primary + '20',
        marginTop: spacing.sm,
    },
    notIncludedIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    notIncludedTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
    },
    notIncludedSubtitle: {
        fontSize: 13,
        color: colors.textLight,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    exploreButtonFull: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exploreButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    oneLeftCard: {
        backgroundColor: colors.primary + '10',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.primary + '20',
        marginTop: spacing.sm,
    },
    oneLeftIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    oneLeftTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
    },
    oneLeftSubtitle: {
        fontSize: 13,
        color: colors.textLight,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    upgradeActionFull: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    upgradeActionText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    expiredCard: {
        backgroundColor: colors.error + '10',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.error + '20',
        marginTop: spacing.sm,
    },
    expiredIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    expiredTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.error,
    },
    expiredSubtitle: {
        fontSize: 13,
        color: colors.textLight,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    renewButtonFull: {
        backgroundColor: colors.error,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    renewButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    limitCard: {
        backgroundColor: '#F59E0B' + '10',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#F59E0B' + '20',
        marginTop: spacing.sm,
    },
    limitIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F59E0B' + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    limitTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F59E0B',
    },
    limitSubtitle: {
        fontSize: 13,
        color: colors.textLight,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    upgradeButtonFull: {
        backgroundColor: '#F59E0B',
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    upgradeButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    iconButton: {
        padding: 8,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.small,
    },
    list: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 120,
    },
    sectionHeader: {
        paddingTop: spacing.lg,
        paddingBottom: spacing.xs,
        backgroundColor: colors.background,
        marginBottom: spacing.xs,
    },
    sectionTitle: {
        ...typography.caption,
        fontWeight: 'bold',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    chatCard: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    dateColumn: {
        alignItems: 'center',
        marginRight: spacing.md,
        backgroundColor: colors.card,
        padding: 10,
        borderRadius: 12,
        width: 52,
        height: 56,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    dayText: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 24,
    },
    weekdayText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    chatInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textMuted,
    },
    chatDate: {
        fontSize: 12,
        color: colors.textLight,
    },
    msgCount: {
        fontSize: 12,
        color: colors.textMuted,
    },
    separator: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginLeft: 68,
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyIconContainer: {
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
    emptyText: {
        ...typography.h3,
        color: colors.text,
    },
    emptySub: {
        fontSize: 14,
        color: colors.textLight,
        textAlign: 'center',
        marginTop: spacing.sm,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        bottom: spacing.xl,
        right: spacing.xl,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.medium,
        shadowColor: colors.primary,
    },
});
