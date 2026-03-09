import { CustomImage as Image } from '@/components/CustomImage';

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { colors, borderRadius, spacing } from '../../constants/theme';
import { X, Hash, UserPlus, LogOut, Users, FileText, Globe, Lock, Info, Calendar } from 'lucide-react-native';
import { Channel } from '../../types/database';
import { formatNumber } from '@/utils/format';

interface ChannelDetailDialogProps {
    visible: boolean;
    channel: Channel | null;
    isJoined: boolean;
    isModerator: boolean;
    onClose: () => void;
    onJoin: (channelId: string) => Promise<void>;
    onLeave: (channelId: string) => Promise<void>;
    loading?: boolean;
    postsCount?: number;
}

export const ChannelDetailDialog = ({
    visible,
    channel,
    isJoined,
    isModerator,
    onClose,
    onJoin,
    onLeave,
    loading = false,
    postsCount = 0
}: ChannelDetailDialogProps) => {
    if (!channel) return null;

    const isDefault = channel.is_default;
    const isPrivate = channel.is_private;

    // Logic to determine buttons
    const canLeave = !isDefault && !isModerator && !isPrivate && isJoined;
    const canJoin = !isDefault && !isPrivate && !isJoined;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.contentContainer} onStartShouldSetResponder={() => true}>
                    <View style={styles.header}>
                        <View style={styles.iconWrapper}>
                            <Hash size={32} color={colors.primary} />
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
                        <Text style={styles.title}>{channel.name}</Text>

                        <View style={styles.badgesRow}>
                            {isDefault && (
                                <View style={[styles.badge, styles.defaultBadge]}>
                                    <Globe size={12} color={colors.primary} />
                                    <Text style={styles.badgeText}>Default Channel</Text>
                                </View>
                            )}
                            {isPrivate ? (
                                <View style={[styles.badge, styles.privateBadge]}>
                                    <Lock size={12} color={colors.textMuted} />
                                    <Text style={[styles.badgeText, styles.privateText]}>Private</Text>
                                </View>
                            ) : (
                                <View style={[styles.badge, styles.publicBadge]}>
                                    <Globe size={12} color={colors.success} />
                                    <Text style={[styles.badgeText, styles.publicText]}>Public</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.description}>
                            {channel.description || "No description provided for this channel."}
                        </Text>

                        <View style={styles.divider} />

                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Users size={20} color={colors.textMuted} style={{ marginBottom: 4 }} />
                                <Text style={styles.statValue}>{formatNumber(channel.followers_count)}</Text>
                                <Text style={styles.statLabel}>Followers</Text>
                            </View>
                            <View style={styles.statItem}>
                                <FileText size={20} color={colors.textMuted} style={{ marginBottom: 4 }} />
                                <Text style={styles.statValue}>{formatNumber(postsCount)}</Text>
                                <Text style={styles.statLabel}>Posts</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Calendar size={20} color={colors.textMuted} style={{ marginBottom: 4 }} />
                                <Text style={styles.statValue}>{new Date(channel.created_at).getFullYear()}</Text>
                                <Text style={styles.statLabel}>Created</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Actions / Info */}
                        <View style={styles.footer}>
                            {isDefault ? (
                                <View style={styles.infoBox}>
                                    <Info size={18} color={colors.primary} />
                                    <Text style={styles.infoText}>
                                        This is a default channel. All community members are automatically joined.
                                    </Text>
                                </View>
                            ) : isPrivate ? (
                                <View style={styles.infoBox}>
                                    <Lock size={18} color={colors.warning} />
                                    <Text style={[styles.infoText, { color: '#B45309' }]}>
                                        This is a private channel. Only admins can add you to this channel.
                                    </Text>
                                </View>
                            ) : isModerator && isJoined ? (
                                <View style={styles.infoBox}>
                                    <Info size={18} color={colors.primary} />
                                    <Text style={styles.infoText}>
                                        As a moderator, you cannot leave community channels.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {canJoin && (
                                        <TouchableOpacity
                                            style={[styles.button, styles.joinButton]}
                                            onPress={() => onJoin(channel.id)}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <>
                                                    <UserPlus size={20} color="#FFF" />
                                                    <Text style={styles.buttonText}>Join Channel</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    {canLeave && (
                                        <TouchableOpacity
                                            style={[styles.button, styles.leaveButton]}
                                            onPress={() => onLeave(channel.id)}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color={colors.error} />
                                            ) : (
                                                <>
                                                    <LogOut size={20} color={colors.error} />
                                                    <Text style={[styles.buttonText, styles.leaveText]}>Leave Channel</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    contentContainer: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        // shadowColor: "#000",
        // shadowOffset: {
        //     width: 0,
        //     height: 4,
        // },
        // shadowOpacity: 0.25,
        // shadowRadius: 10,
        // elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        paddingBottom: spacing.sm,
    },
    iconWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        padding: spacing.sm,
        backgroundColor: colors.background,
        borderRadius: borderRadius.full,
    },
    scrollContent: {
        maxHeight: 500, // Approximate limit
    },
    scrollInner: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    defaultBadge: {
        borderColor: colors.primary + '40',
        backgroundColor: colors.primary + '10',
    },
    privateBadge: {
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    privateText: {
        color: colors.textMuted,
    },
    publicBadge: {
        borderColor: colors.success + '40',
        backgroundColor: colors.success + '10',
    },
    publicText: {
        color: colors.success,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text,
    },
    description: {
        fontSize: 16,
        color: colors.textLight,
        lineHeight: 24,
        marginBottom: spacing.lg,
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
        marginBottom: spacing.xs,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    footer: {
        marginTop: spacing.md,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: borderRadius.lg,
        gap: 8,
    },
    joinButton: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    leaveButton: {
        backgroundColor: '#FEE2E2', // light red
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    leaveText: {
        color: colors.error,
    },
    infoBox: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: colors.background,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: colors.textLight,
        lineHeight: 20,
    },
});
