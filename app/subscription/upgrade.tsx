import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Linking, Dimensions, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Sparkles, Zap, Crown, Info, X, ChevronLeft, CreditCard } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { useAuth, supabase } from '@/contexts/AuthContext';
import { MayaService } from '@/lib/maya/service';
import { Plan, UserSubscription } from '@/types/database';
import { StatusBar } from 'expo-status-bar';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { SubscriptionCardShimmer } from '../../components/shimmers/SubscriptionCardShimmer';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function UpgradeScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { subscription, refreshSubscription, loading: subLoading } = useSubscription();
    
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [errorModalConfig, setErrorModalConfig] = useState<{ visible: boolean; title: string; message: string } | null>(null);
    const { showToast, addNotification } = useApp();
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

    const fetchData = useCallback(async (silent = false) => {
        if (!user) return;
        try {
            if (!silent) setLoading(true);
            const allPlans = await MayaService.getPlans();
            setPlans(allPlans);
            
            if (subscription) {
                setSelectedPlanId(subscription.plan_id);
            } else if (allPlans.length > 0) {
                const free = allPlans.find(p => p.name === 'Free');
                setSelectedPlanId(free ? free.id : allPlans[0].id);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [user, subscription]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const performAction = (plan: Plan) => {
        if (plan.price_usd === 0) {
            activateFreePlan();
        } else {
            // Map plan name to slug (Free -> free, Premium -> premium, Premium+ -> premium_plus)
            const planSlug = plan.name.toLowerCase().replace('+', '_plus');
            const helpUrl = `https://pentasent.com/help/billing?user_id=${user?.id}&plan=${planSlug}`;
            Linking.openURL(helpUrl);
        }
    };

    const activateFreePlan = async () => {
        try {
            setIsUpdating(true);
            const freePlan = plans.find(p => p.name === 'Free');
            if (!freePlan) return;

            const now = new Date();
            const oneYearLater = new Date();
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

            // 1. Deactivate current active subscription if exists
            if (subscription && subscription.status === 'active') {
                await supabase
                    .from('user_subscriptions')
                    .update({ 
                        status: 'canceled', 
                        updated_at: now.toISOString()
                    })
                    .eq('id', subscription.id);
            }

            // 2. Create a new Free plan entry for 1 year
            const { error: insertError } = await supabase
                .from('user_subscriptions')
                .insert({ 
                    user_id: user?.id,
                    plan_id: freePlan.id, 
                    status: 'active',
                    start_date: now.toISOString(),
                    end_date: oneYearLater.toISOString(),
                    is_complementary: false,
                    offered_by: null,
                    updated_at: now.toISOString()
                });

            if (insertError) throw insertError;
            
            // 3. Send Billing/Success Notification
            await addNotification({
                title: 'Subscription Renewed',
                message: `Your ${freePlan.name} plan has been activated successfully. Valid until ${format(oneYearLater, 'MMM do, yyyy')}.`,
                notification_type: 'subscription_alert',
                category: 'success'
            });

            showToast('Plan renewed successfully');
            // Refresh global subscription context
            await refreshSubscription();
        } catch (e) {
            console.error(e);
            setErrorModalConfig({
                visible: true,
                title: 'Activation Failed',
                message: 'Failed to activate free plan. Please contact the support or send us email at payment@pentasent.com'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const currentPlan = subscription?.plan;
    const isExpired = subscription?.status === 'expired';

    const renderPlanCard = (plan: Plan) => {
        const isSelected = selectedPlanId === plan.id;
        const isCurrent = currentPlan?.id === plan.id && !isExpired;
        
        let Icon = Zap;
        let color = colors.primary;
        if (plan.name === 'Premium') { Icon = Zap; color = '#8B5CF6'; }
        else if (plan.name === 'Premium+') { Icon = Crown; color = '#F59E0B'; }
        else if (plan.name === 'Free') { Icon = Sparkles; color = '#6B7280'; }

        return (
            <TouchableOpacity 
                key={plan.id}
                style={[
                    styles.planCard, 
                    isSelected && { borderColor: color, borderWidth: 1.5 }
                ]}
                onPress={() => setSelectedPlanId(plan.id)}
                activeOpacity={0.9}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                            <Icon size={24} color={color} />
                        </View>
                        <View>
                            <Text style={styles.planName}>{plan.name}</Text>
                            <Text style={styles.planPrice}>
                                {plan.price_usd === 0 ? 'Free entry plan' : `$${plan.price_usd} / Monthly billing`}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.badgeColumn}>
                        {isCurrent && (
                            <View style={[styles.statusChip, { backgroundColor: colors.success + '15' }]}>
                                <Text style={[styles.statusText, { color: colors.success }]}>ACTIVE</Text>
                            </View>
                        )}
                        {isExpired && currentPlan?.id === plan.id && (
                            <View style={[styles.statusChip, { backgroundColor: colors.error + '15' }]}>
                                <Text style={[styles.statusText, { color: colors.error }]}>EXPIRED</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBody}>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                    <View style={styles.featuresList}>
                        <FeatureItem text={`${plan.limits.maya.chats_per_day === -1 ? 'Unlimited' : plan.limits.maya.chats_per_day} Daily Maya Sessions`} />
                        <FeatureItem text={`${plan.limits.journal.entries_per_day === -1 ? 'Unlimited' : plan.limits.journal.entries_per_day} Daily Journal Entries`} />
                        <FeatureItem text={`${plan.limits.tasks.tasks_per_day === -1 ? 'Unlimited' : plan.limits.tasks.tasks_per_day} Daily Tasks Allowed`} />
                        {plan.limits.yoga.premium_access && <FeatureItem text="Unlock All Premium Yoga Classes" />}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    let actionType: 'Manage' | 'Renew' | 'Downgrade' | 'Current' = 'Manage';
    
    if (selectedPlan && currentPlan) {
        if (isExpired) {
            // If plan is expired, we allow switching to Free or managing any Paid plan
            if (selectedPlan.name === 'Free') actionType = 'Renew';
            else actionType = 'Manage';
        } else {
            // Active plan logic
            if (selectedPlan.id === currentPlan.id) {
                actionType = 'Current';
            } else if (selectedPlan.price_usd > currentPlan.price_usd) {
                actionType = 'Manage';
            } else {
                actionType = 'Downgrade';
            }
        }
    } else if (selectedPlan && selectedPlan.price_usd === 0) {
        actionType = 'Renew'; // Handle case where user has no plan yet
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.title}>Subscriptions</Text>
                        <Text style={styles.subtitle}>Unlock your premium wellness potential</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.iconBoxLarge} 
                        onPress={() => {
                            if (isNavigating.current) return;
                            isNavigating.current = true;
                            router.back();
                            setTimeout(() => {
                                isNavigating.current = false;
                            }, 500);
                        }}
                    >
                        <CreditCard size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {loading ? (
                    [1, 2, 3].map((i) => <SubscriptionCardShimmer key={i} />)
                ) : (
                    plans.map(renderPlanCard)
                )}

                {!loading && (
                  <View style={styles.footer}>
                      {actionType === 'Renew' && (
                          <TouchableOpacity 
                              style={styles.mainBtn}
                              onPress={() => performAction(selectedPlan!)}
                          >
                              <Text style={styles.mainBtnText}>Renew Free Plan</Text>
                          </TouchableOpacity>
                      )}

                      {actionType === 'Manage' && (
                          <TouchableOpacity 
                              style={styles.mainBtn}
                              onPress={() => performAction(selectedPlan!)}
                          >
                              <Text style={styles.mainBtnText}>Manage Subscription</Text>
                          </TouchableOpacity>
                      )}

                      {actionType === 'Downgrade' && (
                          <View style={styles.warningBox}>
                            <Info size={16} color={colors.error} />
                            <Text style={styles.warningText}>
                                Active plan cannot be downgraded. Please manage your subscription on our web dashboard.
                            </Text>
                          </View>
                      )}

                      <View style={styles.footerInfo}>
                          <Text style={styles.webNote}>
                              Subscriptions are handled on web dashboard, visit our website for subscription or plan management.
                          </Text>
                          <Text style={styles.disclaimer}>
                              Limit reset at midnight. High-fidelity data protection included with all plans.
                          </Text>
                          <TouchableOpacity 
                              style={styles.historyBtn} 
                              onPress={() => safePush('/subscription/history')}
                          >
                              <Text style={styles.historyBtnText}>View Payment History</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
                )}
            </ScrollView>

            <ConfirmationModal
                visible={!!errorModalConfig}
                title={errorModalConfig?.title || 'Notification'}
                message={errorModalConfig?.message || ''}
                confirmText="Close"
                cancelText="Support"
                onConfirm={() => setErrorModalConfig(null)}
                onCancel={() => {
                    setErrorModalConfig(null);
                    Linking.openURL('mailto:payment@pentasent.com');
                }}
                isDestructive={false}
            />

            {isUpdating && (
                <View style={styles.updatingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.updatingText}>Updating your plan...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <View style={styles.featureItem}>
            <Check size={14} color={colors.primary} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'android' ? spacing.xxl : spacing.md,
        paddingBottom: spacing.md,
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl * 2,
    },
    planCard: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    cardHeader: {
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    planName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    planPrice: {
        fontSize: 13,
        color: colors.textLight,
        fontWeight: '500',
        marginTop: 2,
    },
    badgeColumn: {
        alignItems: 'flex-end',
    },
    statusChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    cardDivider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginHorizontal: spacing.md,
    },
    cardBody: {
        padding: spacing.md,
    },
    planDescription: {
        fontSize: 13,
        color: colors.textLight,
        marginBottom: spacing.lg,
        lineHeight: 18,
    },
    featuresList: {
        gap: 14,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 14,
        color: colors.textLight,
        fontWeight: '500',
    },
    footer: {
        marginTop: spacing.md,
        gap: spacing.lg,
    },
    mainBtn: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    mainBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: colors.error + '10',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: 10,
        alignItems: 'flex-start',
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        color: colors.error,
        lineHeight: 18,
        fontWeight: '500',
    },
    webNote: {
        fontSize: 13,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '600',
        paddingHorizontal: spacing.md,
    },
    disclaimer: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
    footerInfo: {
        alignItems: 'center',
        gap: spacing.md,
    },
    historyBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    historyBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
        textDecorationLine: 'underline',
    },
    updatingOverlay: {
        ...StyleSheet.absoluteFillObject, // Covering the whole screen
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    updatingText: {
        marginTop: spacing.md,
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
});
