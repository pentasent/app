import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, DeviceEventEmitter } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Search, ArrowLeft, Trash2, UserPlus, Shield } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { CommunityMemberShimmer } from '@/components/shimmers/CommunityMemberShimmer';

type Member = {
    id: string; // Follower ID (not user ID directly in this context if we want to delete relation)
    user_id: string;
    joined_at: string;
    user: {
        id: string;
        name: string;
        avatar_url: string | null;
        email?: string;
    };
    is_moderator: boolean;
};

export default function CommunityMembersScreen() {
    const { id, mode } = useLocalSearchParams(); // mode='add' for add member screen
    const router = useRouter();
    const { user } = useAuth();

    const [members, setMembers] = useState<Member[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModerator, setIsModerator] = useState(false);

    // For 'Add Member' mode
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [adding, setAdding] = useState<Set<string>>(new Set());

    const isAddMode = mode === 'add';

    const fetchData = useCallback(async (showLoader = true) => {
        if (!user || !id) return;
        try {
            if (showLoader) setLoading(true);

            // FETCH MEMBERS & MODERATORS TOGETHER FIRST
            // This ensures we have the list to check against for "isModerator" status

            if (isAddMode) {
                // Fetch all users to add (filtering out existing members later or in query)
                // This is simple for now, might need pagination for large userbases
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('*');

                if (usersError) throw usersError;

                // Fetch existing members IDs to filter
                const { data: existingMembers } = await supabase
                    .from('community_followers')
                    .select('user_id')
                    .eq('community_id', id);

                const existingIds = new Set(existingMembers?.map(m => m.user_id));

                // Filter out existing members
                const potentialMembers = usersData.filter(u => !existingIds.has(u.id));
                setAllUsers(potentialMembers);

            } else {
                // Fetch Community Members
                const { data: followersData, error: followersError } = await supabase
                    .from('community_followers')
                    .select('user_id, user:users(id, name, avatar_url)')
                    .eq('community_id', id);

                if (followersError) throw followersError;

                // Check which are moderators
                const { data: modsData } = await supabase
                    .from('community_moderators')
                    .select('user_id')
                    .eq('community_id', id);

                const modIds = new Set(modsData?.map(m => m.user_id));

                const formattedMembers = followersData.map((f: any) => ({
                    id: f.user_id,
                    user_id: f.user_id,
                    joined_at: new Date().toISOString(), // Fallback
                    user: f.user,
                    is_moderator: modIds.has(f.user_id)
                }));

                setMembers(formattedMembers);

                // Set isModerator state based on the fetched list
                // This guarantees consistency with the badges
                const currentUserIsMod = modIds.has(user.id);
                setIsModerator(currentUserIsMod);
            }

        } catch (error) {
            console.error('Error fetching members:', error);
            Alert.alert('Error', 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    }, [id, user, isAddMode]);

    useEffect(() => {
        fetchData();

        const sub = DeviceEventEmitter.addListener('refresh_community_members', (communityId) => {
            if (communityId === id && !isAddMode) {
                fetchData(false);
            }
        });

        return () => sub.remove();
    }, [fetchData, id, isAddMode]);

    const handleRemoveMember = async (userId: string, memberName: string) => {
        Alert.alert(
            "Remove Member",
            `Are you sure you want to remove ${memberName} from the community?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('community_followers')
                                .delete()
                                .eq('community_id', id)
                                .eq('user_id', userId);

                            if (error) throw error;

                            // Also remove from channels? ideally backend trigger, but we can try
                            // For now just removing from community wrapper

                            setMembers(prev => prev.filter(m => m.user_id !== userId));
                            Alert.alert("Success", "Member removed.");
                        } catch (err) {
                            Alert.alert("Error", "Failed to remove member.");
                        }
                    }
                }
            ]
        );
    };

    const handleAddMember = async (userId: string) => {
        setAdding(prev => new Set(prev).add(userId));
        try {
            // Add to Community
            const { error } = await supabase
                .from('community_followers')
                .insert({
                    community_id: id,
                    user_id: userId
                });

            if (error) throw error;

            // Auto-join Default and Public Channels
            // Logic: fetch channels where is_default=true OR (is_private=false AND is_active=true)
            // Ideally, we might only want to auto-join DEFAULT channels. 
            // User request: "make them follow default all public channels" -> slightly ambiguous.
            // "make them follow default all public channels" -> likely means "start following default channels, AND all public channels?"
            // Usually "default" implies auto-join. "Public" just means *can* join.
            // But let's follow the user's phrasing: "make them follow default all public channels".
            // I will interpret this as: Join all channels that are (Default OR Public).

            const { data: channelsData } = await supabase
                .from('channels')
                .select('id')
                .eq('community_id', id)
                .eq('is_active', true)
                .or('is_default.eq.true,is_private.eq.false');

            if (channelsData && channelsData.length > 0) {
                const channelInserts = channelsData.map(c => ({
                    channel_id: c.id,
                    user_id: userId
                }));
                const { error: channelError } = await supabase.from('channel_followers').insert(channelInserts);
                if (channelError) console.error("Error auto-joining channels:", channelError);
            }

            DeviceEventEmitter.emit('refresh_community_members', id);
            Alert.alert("Success", "Member added successfully.");
            setAllUsers(prev => prev.filter(u => u.id !== userId)); // Remove from list
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to add member.");
        } finally {
            setAdding(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    const filteredData = isAddMode
        ? allUsers.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : members.filter(m => m.user.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const renderItem = ({ item }: { item: any }) => {
        if (isAddMode) {
            return (
                <View style={styles.memberCard}>
                    <Image
                        source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
                        style={styles.avatar}
                    />
                    <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{item.name}</Text>
                        <Text style={styles.memberDetail}>User</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleAddMember(item.id)}
                        disabled={adding.has(item.id)}
                    >
                        {adding.has(item.id) ? <ActivityIndicator color="white" size="small" /> : <UserPlus size={20} color="white" />}
                    </TouchableOpacity>
                </View>
            );
        }

        const isMe = item.user_id === user?.id;

        return (
            <View style={styles.memberCard}>
                <Image
                    source={{ uri: item.user.avatar_url || 'https://via.placeholder.com/50' }}
                    style={styles.avatar}
                />
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.user.name} {isMe && "(You)"}</Text>
                    <Text style={styles.memberDetail}>Joined {new Date(item.joined_at).toLocaleDateString()}</Text>
                </View>

                {item.is_moderator && (
                    <View style={styles.modBadge}>
                        <Shield size={12} color={colors.primary} />
                        <Text style={styles.modText}>MOD</Text>
                    </View>
                )}

                {isModerator && !isMe && !item.is_moderator && (
                    <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveMember(item.user_id, item.user.name)}>
                        <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <View style={styles.header}>
                {/* Left */}
                <View style={styles.headerSide}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Center */}
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                        {isAddMode ? 'Add Members' : 'Community Members'}
                    </Text>
                </View>

                {/* Right */}
                <View style={styles.headerSide}>
                    {isModerator && !isAddMode ? (
                        <TouchableOpacity
                            style={styles.headerAddButton}
                            onPress={() => router.push(`/community/members/${id}?mode=add`)}
                        >
                            <UserPlus size={18} color={colors.surface} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 36 }} />   // Placeholder to keep balance
                    )}
                </View>
            </View>


            {/* {isModerator && !isAddMode && (
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerAddButton} onPress={() => router.push(`/community/members/${id}?mode=add`)}>
                        <UserPlus size={24} color={colors.primary} />
                        <Text style={styles.headerAddButtonText}>Add Member</Text>
                    </TouchableOpacity>
                </View>
            )} */}

            <View style={styles.searchContainer}>
                <Search size={20} color={colors.textLight} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search members..."
                    placeholderTextColor={colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <View style={[styles.listContent, { paddingTop: spacing.md }]}>
                    {Array.from({ length: 10 }).map((_, index) => (
                        <View key={index}>
                            <CommunityMemberShimmer />
                            {index < 9 && <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md }} />}
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    keyExtractor={(item) => isAddMode ? item.id : item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No users found.</Text>
                        </View>
                    }
                    ItemSeparatorComponent={() => (
                        <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md }} />
                    )}
                />
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.sm,
    },

    headerSide: {
        width: 50,
        alignItems: 'flex-start',
    },

    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },

    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
    },

    iconButton: {
        padding: 8,
        marginLeft: -8, // Align with padding
    },
    // headerActions: {
    //     padding: spacing.md,
    //     borderBottomWidth: 1,
    //     borderBottomColor: colors.borderLight,
    //     alignItems: 'flex-end',
    // },
    headerAddButton: {
        // flexDirection: 'row',
        // alignItems: 'center',
        // gap: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    headerAddButtonText: {
        color: colors.surface,
        fontWeight: '600',
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        margin: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        height: 48,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.md,
        color: colors.text,
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        // backgroundColor: colors.surface,
        // padding: spacing.md,
        // paddingBottom: spacing.lg,
        // borderRadius: borderRadius.md,
        // marginBottom: spacing.lg,
        // borderBottomWidth: 1,
        // borderBottomColor: colors.borderLight,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: spacing.md,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    memberDetail: {
        fontSize: 12,
        color: colors.textMuted,
    },
    modBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    modText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.primary,
    },
    removeButton: {
        padding: 8,
    },
    addButton: {
        backgroundColor: colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        textAlign: 'center',
    },
});
