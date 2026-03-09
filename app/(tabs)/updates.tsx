import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShoppingBag, Calendar, UserCheck, Heart, MessageCircle, MessageSquare, Users, Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { useApp } from '../../contexts/AppContext';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { Notification } from '../../types';
import { Toast } from '../../components/Toast';

export default function NotificationsScreen() {
    const router = useRouter();
    const { notifications, markNotificationRead, markAllNotificationsRead, unreadCount } = useApp();
    const [isUpdating, setIsUpdating] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('success');

    const getIcon = (type: Notification['notification_type'], category: Notification['category']) => {
        switch (type) {
            case 'post_like':
                return <Heart size={24} color={colors.error} fill={colors.error} />;
            case 'post_comment':
            case 'comment_reply':
                return <MessageCircle size={24} color={colors.primary} />;
            case 'chat_message':
                return <MessageSquare size={24} color={colors.secondary} />;
            case 'community_follow':
                return <Users size={24} color={colors.primary} />;
            case 'account_warning':
                return <AlertTriangle size={24} color={colors.warning} />;
            case 'system_announcement':
                return <Bell size={24} color={colors.accent} />;
            default:
                // Fallback to category based icons
                switch (category) {
                    case 'success': return <CheckCircle size={24} color={colors.success} />;
                    case 'warning': return <AlertTriangle size={24} color={colors.warning} />;
                    case 'error': return <AlertTriangle size={24} color={colors.error} />;
                    default: return <Info size={24} color={colors.primary} />;
                }
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const handleNotificationPress = async (notification: Notification) => {
        if (!notification.is_seen) {
            await markNotificationRead(notification.id);
        }
        if (notification.redirect_url) {
            // router.push(notification.redirect_url); 
        }
    };

    const handleMarkAllRead = async () => {
        if (isUpdating || unreadCount === 0) return;
        setIsUpdating(true);
        try {
            await markAllNotificationsRead();
            setToastType('success');
            setToastMsg('All notifications marked as read');
        } catch (error) {
            console.error(error);
            setToastType('error');
            setToastMsg('Failed to mark all as read');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Updates</Text>
                        <Text style={styles.headerSubtitle}>Stay updated with actions</Text>
                    </View>
                    {unreadCount > 0 && (
                        <TouchableOpacity
                            onPress={handleMarkAllRead}
                            disabled={isUpdating}
                            style={[styles.markReadBtn, isUpdating && { opacity: 0.7 }]}
                        >
                            <Text style={styles.markReadText}>
                                {isUpdating ? 'Updating...' : 'Mark all as read'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No notifications yet</Text>
                    </View>
                ) : (
                    notifications.map((notification, index) => {
                        const isLastItem = index === notifications.length - 1;

                        return (
                            <TouchableOpacity
                                key={notification.id}
                                style={[
                                    styles.notificationCard,
                                    !notification.is_seen && styles.unreadCard,
                                    isLastItem && { borderBottomWidth: 0 }
                                ]}
                                onPress={() => handleNotificationPress(notification)}
                                activeOpacity={0.7}
                            >

                                <View style={styles.iconContainer}>{getIcon(notification.notification_type, notification.category)}</View>
                                <View style={styles.notificationContent}>
                                    <View style={styles.notificationHeader}>
                                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                                        {!notification.is_seen && <View style={styles.unreadDot} />}
                                    </View>
                                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                                    <Text style={styles.notificationDate}>{formatDate(notification.created_at)}</Text>
                                </View>
                            </TouchableOpacity>
                        )
                    })
                )}
            </ScrollView>
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.sm,
        zIndex: 1,
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
    headerTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    markReadBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primaryLight + "40",
    },
    markReadText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    content: {
        flex: 1,
        // paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyText: {
        ...typography.body,
        color: colors.textMuted,
    },
    notificationCard: {
        flexDirection: 'row',
        // backgroundColor: colors.surface,
        // borderRadius: borderRadius.md,
        padding: spacing.md,
        // marginBottom: spacing.md,
        // ...shadows.small,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    unreadCard: {
        backgroundColor: colors.primaryLight + "30", // Ensure this color exists or use a hardcoded one if needed. 
        // Assuming primaryLight is defined in theme, otherwise fallback to standard light color
        // borderBottomColor: colors.primary,
        // borderBottomWidth: 0,
        // borderRadius: borderRadius.md,
        // marginHorizontal: spacing.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    notificationTitle: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginLeft: spacing.sm,
    },
    notificationMessage: {
        ...typography.bodySmall,
        color: colors.textLight,
        marginBottom: spacing.xs,
        lineHeight: 20,
    },
    notificationDate: {
        ...typography.caption,
        color: colors.textMuted,
    },
});
