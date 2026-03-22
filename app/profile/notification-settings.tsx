import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, ActivityIndicator, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
    ChevronLeft,
    Bell,
    Users,
    FileText,
    CheckSquare,
    BookOpen,
    Tag,
    Mail,
    Smartphone,
    Monitor
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth, supabase } from '../../contexts/AuthContext';
import { getImageUrl } from '@/utils/get-image-url';
import { CustomImage as Image } from '../../components/CustomImage';
import { UserNotificationSetting } from '../../types';
import { NotificationSettingsShimmer } from '../../components/shimmers/NotificationSettingsShimmer';

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserNotificationSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, [user]);

    const fetchSettings = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_notification_settings')
                .select('*')
                .eq('user_id', user.id)
                .order('category', { ascending: true })
                .order('action', { ascending: true });

            if (error) throw error;
            setSettings(data || []);
        } catch (error) {
            console.error('Error fetching settings:', error);
            Alert.alert('Error', 'Failed to load notification settings');
        } finally {
            setLoading(false);
        }
    };

    const toggleSetting = async (settingId: string, field: 'system_enabled' | 'push_enabled' | 'email_enabled', currentValue: boolean) => {
        // Only allow toggling system_enabled for now
        if (field !== 'system_enabled') return;

        setUpdating(settingId + field);
        // Optimistic update
        setSettings(prev => prev.map(s => s.id === settingId ? { ...s, [field]: !currentValue } : s));

        try {
            const { error } = await supabase
                .from('user_notification_settings')
                .update({ [field]: !currentValue })
                .eq('id', settingId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating setting:', error);
            // Revert on error
            setSettings(prev => prev.map(s => s.id === settingId ? { ...s, [field]: currentValue } : s));
            Alert.alert('Error', 'Failed to update setting');
        } finally {
            setUpdating(null);
        }
    };

    const SwitchIOS = ({ enabled, loading, onPress, disabled }: { enabled: boolean, loading: boolean, onPress: () => void, disabled?: boolean }) => {
        const [animatedValue] = useState(new Animated.Value(enabled ? 1 : 0));

        useEffect(() => {
            Animated.timing(animatedValue, {
                toValue: enabled ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        }, [enabled]);

        const translateX = animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [2, 20],
        });

        const backgroundColor = animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.borderLight, colors.primary],
        });

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                disabled={disabled || loading}
                style={styles.switchWrapper}
            >
                <Animated.View style={[styles.switchTrack, { backgroundColor }, disabled && styles.switchTrackDisabled]}>
                    <Animated.View style={[styles.switchThumb, { transform: [{ translateX }] }]} />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) acc[setting.category] = [];
        acc[setting.category].push(setting);
        return acc;
    }, {} as Record<string, UserNotificationSetting[]>);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'community': return <Users size={20} color={colors.primary} />;
            case 'post': return <FileText size={20} color={colors.primary} />;
            case 'task': return <CheckSquare size={20} color={colors.primary} />;
            case 'journal': return <BookOpen size={20} color={colors.primary} />;
            case 'tagging': return <Tag size={20} color={colors.primary} />;
            default: return <Bell size={20} color={colors.primary} />;
        }
    };

    const formatAction = (action: string) => {
        return action.charAt(0).toUpperCase() + action.slice(1);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.title}>Notifications</Text>
                        <Text style={styles.subtitle}>Manage your notification preferences</Text>
                    </View>
                    {/* <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.profileImageContainer}
                    >
                        <Image
                            source={{ uri: getImageUrl(user?.avatar_url) }}
                            style={styles.headerAvatar}
                        />
                    </TouchableOpacity> */}
                    <TouchableOpacity style={styles.iconBoxLarge}
                        onPress={() => router.back()}>
                        <Bell size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <NotificationSettingsShimmer />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {Object.entries(groupedSettings).map(([category, items]) => (
                        <View key={category} style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.categoryIconBox}>
                                    {getCategoryIcon(category)}
                                </View>
                                <Text style={styles.sectionTitle}>{category.toUpperCase()}</Text>
                                {category === 'tagging' && (
                                    <View style={styles.comingSoonBadge}>
                                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                                    </View>
                                )}
                            </View>

                            {items.map((setting, index) => (
                                <View key={setting.id}>
                                    <View style={styles.settingRow}>
                                        <View style={styles.settingInfo}>
                                            <Text style={styles.actionText}>{formatAction(setting.action)}</Text>
                                        </View>

                                        <View style={styles.togglesContainer}>
                                            <View style={styles.toggleItem}>
                                                <Monitor size={16} color={colors.textLight} />
                                                <SwitchIOS
                                                    enabled={setting.system_enabled}
                                                    loading={updating === setting.id + 'system_enabled'}
                                                    onPress={() => toggleSetting(setting.id, 'system_enabled', setting.system_enabled)}
                                                    disabled={!setting.is_editable}
                                                />
                                            </View>

                                            <View style={styles.toggleItem}>
                                                <Smartphone size={16} color={colors.textLight} />
                                                <SwitchIOS
                                                    enabled={setting.push_enabled}
                                                    loading={false}
                                                    onPress={() => { }}
                                                    disabled={true}
                                                />
                                            </View>

                                            <View style={styles.toggleItem}>
                                                <Mail size={16} color={colors.textLight} />
                                                <SwitchIOS
                                                    enabled={setting.email_enabled}
                                                    loading={false}
                                                    onPress={() => { }}
                                                    disabled={true}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                    {index < items.length - 1 && <View style={styles.rowDivider} />}
                                </View>
                            ))}
                        </View>
                    ))}

                    {/* Column Legend */}
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <Monitor size={14} color={colors.textMuted} />
                            <Text style={styles.legendText}>In-App</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <Smartphone size={14} color={colors.textMuted} />
                            <Text style={styles.legendText}>Push</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <Mail size={14} color={colors.textMuted} />
                            <Text style={styles.legendText}>Email</Text>
                        </View>
                    </View>
                </ScrollView>
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
    profileImageContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    headerAvatar: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    sectionContainer: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        ...shadows.small,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    categoryIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primaryLight + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: 1,
        flex: 1,
    },
    comingSoonBadge: {
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    comingSoonText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.primary,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
    },
    settingInfo: {
        flex: 1,
    },
    actionText: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
    },
    togglesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    toggleItem: {
        alignItems: 'center',
        gap: 12,
    },
    rowDivider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: 4,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xl,
        marginTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    switchWrapper: {
        width: 44,
        height: 24,
        justifyContent: 'center',
    },
    switchTrack: {
        width: 40,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
    },
    switchTrackDisabled: {
        opacity: 0.5,
    },
    switchThumb: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.surface,
        ...shadows.small,
    },
    switchLoaderOverlay: {
        position: 'absolute',
        right: -20,
    },
        iconBoxLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',

    }
});
