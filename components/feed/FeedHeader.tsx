import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import { colors } from '../../constants/theme';
import { User, Community } from '../../types/database';
import { MapPin, ChevronDown, Check } from 'lucide-react-native'; // Assuming lucide-react-native is available
import { SafeAreaView } from 'react-native-safe-area-context';

interface FeedHeaderProps {
    user: User | null;
    communities: Community[];
    selectedCommunityId: string | null;
    onSelectCommunity: (communityId: string | null) => void;
    onProfilePress: () => void;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({
    user,
    communities,
    selectedCommunityId,
    onSelectCommunity,
    onProfilePress
}) => {
    const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);

    const selectedCommunity = communities.find(c => c.id === selectedCommunityId);

    const renderCommunityItem = ({ item }: { item: Community | null }) => {
        const isSelected = item ? item.id === selectedCommunityId : selectedCommunityId === null;
        return (
            <TouchableOpacity
                style={[styles.communityItem, isSelected && styles.communityItemActive]}
                onPress={() => {
                    onSelectCommunity(item?.id || null);
                    setIsCommunityModalOpen(false);
                }}
            >
                {item?.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.communityLogoSmall} />
                ) : (
                    <View style={[styles.communityLogoPlaceholder, { backgroundColor: isSelected ? colors.primary : '#eee' }]} />
                )}
                <Text style={[styles.communityItemText, isSelected && styles.communityItemTextActive]}>
                    {item ? item.name : 'All Communities'}
                </Text>
                {isSelected && <Check size={18} color={colors.primary} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.contentRow}>
                {/* Left: User Profile */}
                <TouchableOpacity style={styles.profileSection} onPress={onProfilePress}>
                    <Image
                        source={{ uri: user?.avatar_url || 'https://via.placeholder.com/50' }}
                        style={styles.avatar}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {user?.name || 'Guest'}
                        </Text>
                        <View style={styles.locationRow}>
                            <MapPin size={12} color={colors.textMuted} />
                            <Text style={styles.userLocation} numberOfLines={1}>
                                {user?.country || 'Location'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Right: Community Filter */}
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setIsCommunityModalOpen(true)}
                >
                    {selectedCommunity && selectedCommunity.logo_url && (
                        <Image source={{ uri: selectedCommunity.logo_url }} style={styles.selectedCommunityLogo} />
                    )}
                    <Text style={styles.filterButtonText} numberOfLines={1}>
                        {selectedCommunity ? selectedCommunity.name : 'All Communities'}
                    </Text>
                    <ChevronDown size={16} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Community Selection Modal */}
            <Modal
                statusBarTranslucent transparent
                visible={isCommunityModalOpen}
                animationType="fade"
                onRequestClose={() => setIsCommunityModalOpen(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsCommunityModalOpen(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Select Community</Text>
                                <View style={styles.divider} />
                                <FlatList
                                    data={[null, ...communities]} // null for 'All Communities'
                                    keyExtractor={(item) => item?.id || 'all'}
                                    renderItem={renderCommunityItem}
                                    style={styles.list}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.background, // Ensure it blends with the screen
        // backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    contentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#eee',
    },
    profileInfo: {
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    userLocation: {
        fontSize: 12,
        color: colors.textMuted,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.borderLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        maxWidth: '55%',
    },
    selectedCommunityLogo: {
        width: 18,
        height: 18,
        borderRadius: 9,
        marginRight: 6,
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginRight: 6,
        flexShrink: 1,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.surface,
        width: '100%',
        maxHeight: '60%',
        borderRadius: 24,
        padding: 20,
        // shadowColor: "#000",
        // shadowOffset: {
        //     width: 0,
        //     height: 2,
        // },
        // shadowOpacity: 0.25,
        // shadowRadius: 3.84,
        // elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 10,
    },
    list: {
        marginTop: 5,
    },
    communityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    communityItemActive: {
        backgroundColor: '#F0F9FF', // Light blue tint
    },
    communityLogoSmall: {
        width: 24,
        height: 24,
        borderRadius: 8,
        marginRight: 12,
    },
    communityLogoPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 8,
        marginRight: 12,
    },
    communityItemText: {
        fontSize: 15,
        color: colors.text,
        flex: 1,
        fontWeight: '500',
    },
    communityItemTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
});
