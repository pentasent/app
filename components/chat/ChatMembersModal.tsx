import { CustomImage as Image } from '@/components/CustomImage';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { X, Shield } from 'lucide-react-native';
import { supabase } from '../../contexts/AuthContext';
import { CommunityChatMember } from '@/types/database';
import { StatusBar } from 'expo-status-bar';
import { CommunityMemberShimmer } from '../shimmers/CommunityMemberShimmer';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';

interface ChatMembersModalProps {
    visible: boolean;
    onClose: () => void;
    chatId: string;
}

export const ChatMembersModal: React.FC<ChatMembersModalProps> = ({ visible, onClose, chatId }) => {
    const [members, setMembers] = useState<CommunityChatMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [moderators, setModerators] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (visible) {
            fetchMembers();
            fetchModerators();
        }
    }, [visible, chatId]);

    const fetchModerators = async () => {
        try {
            // First get community_id from chat if we don't have it (or just fetch it)
            // Ideally passed as prop, but here we fetch to be safe
            const { data: chatData, error: chatError } = await supabase
                .from('community_chats')
                .select('community_id')
                .eq('id', chatId)
                .single();

            if (chatError || !chatData) return;

            const { data, error } = await supabase
                .from('community_moderators')
                .select('user_id')
                .eq('community_id', chatData.community_id);

            if (error) throw error;

            const modSet = new Set(data?.map(m => m.user_id) || []);
            setModerators(modSet);
        } catch (error) {
            console.log('[ERROR]:', 'Error fetching moderators:', error);
        }
    };

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('community_chat_members')
                .select('*, user:users(*)')
                .eq('chat_id', chatId)
                .eq('is_active', true);

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.log('[ERROR]:', 'Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderMember = ({ item }: { item: CommunityChatMember }) => {
        const isModerator = moderators.has(item.user_id);

        return (
            <View style={styles.memberRow}
            >
                <Image
                    source={{ uri: getImageUrl(item.user?.avatar_url) }}
                    style={styles.avatar}
                />
                <View style={styles.memberInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.memberName}>{item.user?.name || 'Unknown User'}</Text>
                        {isModerator && (
                            <View style={styles.moderatorBadge}>
                                <Shield size={12} color={colors.primary} fill={colors.primary} />
                                <Text style={styles.moderatorText}>Mod</Text>
                            </View>
                        )}
                    </View>
                    {/* <Text style={styles.memberRole}>{isModerator ? 'Moderator' : 'Member'}</Text> */}
                    <View style={styles.nameRow}>
                        <Text style={styles.memberRole}>
                            {isModerator ? 'Moderator' : 'Member'}
                        </Text>

                        <Text style={styles.memberRole}>
                            {'•  '}Joined {new Date(item.joined_at).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>

                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            statusBarTranslucent transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Members ({members.length ? formatNumber(members.length) : 0})</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.listContent}>
                            {Array.from({ length: 6 }).map((_, index) => (
                                <View key={index}>
                                    <CommunityMemberShimmer />
                                    {index < 5 && <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: 15 }} />}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <FlatList
                            data={members}
                            keyExtractor={item => item.id}
                            renderItem={renderMember}
                            contentContainerStyle={styles.listContent}
                            ItemSeparatorComponent={() => (
                                <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: 15 }} />
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No members found</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: colors.borderLight,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    closeButton: {
        padding: 4,
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
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        // marginBottom: 16,
        // borderBottomWidth: 1,
        // borderBottomColor: colors.borderLight,
        // paddingBottom: 16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: colors.borderLight,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    memberRole: {
        fontSize: 12,
        color: colors.textMuted,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    moderatorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface, // or a light tint
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        gap: 4,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    moderatorText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.primary,
    },
    roleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    joinDate: {
        fontSize: 12,
        color: colors.textMuted,
    },
    separator: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: 12,
        marginLeft: 52, // Indent to align with text
    }
});
