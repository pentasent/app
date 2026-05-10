import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Ticket, Calendar, CreditCard, CheckCircle2, Clock, ShieldCheck, Zap, Crown, Sparkles, ChevronLeft, History } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { useAuth, supabase } from '@/contexts/AuthContext';
import { UserSubscription } from '@/types/database';
import { format } from 'date-fns';
import { StatusBar } from 'expo-status-bar';
import { TicketShimmer } from '../../components/shimmers/TicketShimmer';

export default function SubscriptionHistoryScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [history, setHistory] = useState<UserSubscription[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('*, plan:plans(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching subscription history:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const getPlanIcon = (planName: string) => {
        switch (planName) {
            case 'Premium+': return <Crown size={20} color="#F59E0B" />;
            case 'Premium': return <Zap size={20} color="#8B5CF6" />;
            case 'Free': return <Sparkles size={20} color="#6B7280" />;
            default: return <Ticket size={20} color={colors.primary} />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'active': return { bg: colors.success + '15', text: colors.success };
            case 'expired': return { bg: colors.error + '15', text: colors.error };
            case 'canceled': return { bg: colors.textMuted + '15', text: colors.textMuted };
            default: return { bg: colors.primary + '15', text: colors.primary };
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.title}>Payment History</Text>
                        <Text style={styles.subtitle}>Track your wellness investment</Text>
                    </View>
                    <TouchableOpacity style={styles.iconBoxLarge} onPress={() => router.back()}>
                        <History size={22} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View>
                        {[1, 2, 3].map((i) => (
                            <TicketShimmer key={i} />
                        ))}
                    </View>
                ) : history.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ticket size={64} color={colors.border} />
                        <Text style={styles.emptyText}>No subscription history found</Text>
                        <Text style={styles.emptySub}>Your purchase records will appear here.</Text>
                    </View>
                ) : (
                    history.map((item) => {
                        const statusStyle = getStatusStyle(item.status);
                        const isComplementary = item.is_complementary;
                        const isActive = item.status === 'active';
                        
                        return (
                            <View key={item.id} style={styles.ticketContainer}>
                                <View style={styles.ticketMain}>
                                    <View style={styles.ticketHeader}>
                                        <View style={styles.planInfo}>
                                            <View style={[styles.iconCircle, { backgroundColor: statusStyle.text + '10' }]}>
                                                {getPlanIcon(item.plan?.name || '')}
                                            </View>
                                            <View>
                                                <Text style={styles.ticketPlanName}>{item.plan?.name}</Text>
                                                <Text style={styles.ticketId}>SERIAL: {item.id.slice(0, 8).toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        {!isActive && (
                                            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                                                    {item.status.toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.perforationRow}>
                                        <View style={styles.leftCutout} />
                                        <View style={styles.dashedLine} />
                                        <View style={styles.rightCutout} />
                                    </View>

                                    <View style={styles.ticketBody}>
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>DATE OF PURCHASE</Text>
                                                <Text style={styles.detailValue}>{format(new Date(item.created_at), 'MMM dd, yyyy')}</Text>
                                            </View>
                                            <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
                                                <Text style={styles.detailLabel}>PRICE</Text>
                                                <Text style={[styles.detailValue, { color: colors.primary }]}>
                                                    {isComplementary ? 'COMPLIMENTARY' : item.plan?.price_usd === 0 ? 'FREE TRIAL' : `$${item.plan?.price_usd}.00`}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.detailRow, { marginTop: 20 }]}>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>PLAN VALIDITY</Text>
                                                <Text style={styles.detailValue}>
                                                    {format(new Date(item.start_date || item.created_at), 'MMM d')} — {format(new Date(item.end_date || item.created_at), 'MMM d, yyyy')}
                                                </Text>
                                            </View>
                                            <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
                                                <Text style={styles.detailLabel}>AUTH BY</Text>
                                                <Text style={[styles.detailValue, { fontSize: 11 }]}>PENTASENT</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.footerBarcode}>
                                        <Text style={styles.barcodeText}>PENTA - {item.id.slice(0, 12).toUpperCase()} - SECURE</Text>
                                    </View>
                                </View>
                                
                                {isActive && (
                                    <View style={styles.stampContainer}>
                                        <View style={styles.stampCircle}>
                                            <Text style={styles.stampTextTop}>CURRENT PLAN</Text>
                                            <View style={styles.stampDivider} />
                                            <Text style={styles.stampTextBottom}>BY PENTASENT</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
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
        paddingTop: Platform.OS === 'android' ? spacing.xxl : spacing.md,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
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
    iconBoxLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
    center: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyState: {
        marginTop: 100,
        alignItems: 'center',
        gap: spacing.sm,
    },
    emptyText: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.md,
    },
    emptySub: {
        fontSize: 14,
        color: colors.textMuted,
    },
    ticketContainer: {
        marginBottom: spacing.xl,
        position: 'relative',
    },
    ticketMain: {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        ...shadows.medium,
    },
    ticketHeader: {
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    planInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ticketPlanName: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    ticketId: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '700',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
    },
    perforationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 24,
        backgroundColor: 'transparent',
    },
    leftCutout: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.background,
        marginLeft: -12,
    },
    rightCutout: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.background,
        marginRight: -12,
    },
    dashedLine: {
        flex: 1,
        height: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderStyle: 'dashed',
        marginHorizontal: 12,
    },
    ticketBody: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
        backgroundColor: 'transparent',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        gap: 6,
    },
    detailLabel: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '800',
        letterSpacing: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    footerBarcode: {
        padding: spacing.sm,
        backgroundColor: colors.surface,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    barcodeLine: {
        width: '80%',
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 4,
        opacity: 0.3,
    },
    barcodeText: {
        fontSize: 9,
        color: colors.textMuted,
        fontWeight: '600',
        letterSpacing: 2,
    },
    stampContainer: {
        position: 'absolute',
        top: '20%',
        right: '10%',
        zIndex: 10,
        transform: [{ rotate: '-12deg' }],
    },
    stampCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: colors.success + '80',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    stampTextTop: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.success,
        textAlign: 'center',
    },
    stampDivider: {
        width: '80%',
        height: 2,
        backgroundColor: colors.success + '80',
        marginVertical: 4,
    },
    stampTextBottom: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.success,
        textAlign: 'center',
    },
});
