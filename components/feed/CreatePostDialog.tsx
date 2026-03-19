import { CustomImage as Image } from '@/components/CustomImage';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, ChevronDown, Check, X } from 'lucide-react-native';
import { colors } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { Community, Channel } from '../../types/database';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Toast } from '@/components/Toast';
import { getImageUrl } from '@/utils/get-image-url';


interface CreatePostDialogProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    communities: Community[];
    channels?: Channel[];
}

export const CreatePostDialog = ({ visible, onClose, onSubmit, communities, channels = [] }: CreatePostDialogProps) => {
    const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const [showCommunityPicker, setShowCommunityPicker] = useState(false);
    const [showChannelPicker, setShowChannelPicker] = useState(false);

    // Validation State
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Character Limit
    const MAX_TITLE_LENGTH = 50;

    // Filter channels based on community
    const filteredChannels = selectedCommunityId
        ? channels.filter(c => c.community_id === selectedCommunityId)
        : [];

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                setToastMsg('File should not be more than 10 MB.');
                return;
            }
            setImages([...images, asset.uri]);
        }
    };

    const handleClose = () => {
        onClose();
        resetForm();
    };

    const handleSubmit = async () => {
        if (!selectedCommunityId) {
            setToastMsg('Please select a community to post in.');
            return;
        }
        if (!selectedChannelId) {
            setToastMsg('Please select a channel to post in.');
            return;
        }
        if (title.trim().length < 10) {
            setToastMsg('Title must be at least 10 characters long.');
            return;
        }
        if (content.trim().length < 20) {
            setToastMsg('Description must be at least 20 characters long.');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                community_id: selectedCommunityId,
                channel_ids: selectedChannelId ? [selectedChannelId] : [],
                title,
                content,
                images,
            });

            handleClose();
        } catch (error) {
            setToastMsg('Failed to create post. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedCommunityId(null);
        setSelectedChannelId(null);
        setImages([]);
        setTitle('');
        setContent('');
        setShowCommunityPicker(false);
        setShowChannelPicker(false);
    };

    const selectedCommunity = communities.find(c => c.id === selectedCommunityId);
    const selectedChannel = channels.find(c => c.id === selectedChannelId);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose} statusBarTranslucent>
            <StatusBar style="dark" backgroundColor={colors.borderLight} translucent={false} />
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Create Post</Text>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
                            style={[styles.postButton, loading && styles.disabledButton]}
                        >
                            <Text style={styles.postButtonText}>
                                {loading ? 'Posting...' : 'Post'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={{ flex: 1 }}>
                        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

                            <View style={styles.topControls}>
                                {/* Community Selector */}
                                <TouchableOpacity
                                    style={styles.selector}
                                    onPress={() => {
                                        setShowCommunityPicker(!showCommunityPicker);
                                        setShowChannelPicker(false);
                                    }}
                                >
                                    <View style={styles.selectorMain}>
                                        {selectedCommunity?.logo_url ? (
                                            <Image source={{ uri: getImageUrl(selectedCommunity.logo_url) }} style={styles.commLogo} />
                                        ) : (
                                            <View style={styles.commPlaceholder} />
                                        )}
                                        <Text style={styles.selectorLabel} numberOfLines={1}>
                                            {selectedCommunity ? selectedCommunity.name : 'Select Community'}
                                        </Text>
                                    </View>
                                    <ChevronDown size={16} color={colors.textMuted} />
                                </TouchableOpacity>

                                {/* Pickers */}
                                {showCommunityPicker && (
                                    <View style={styles.pickerContainer}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                            {communities.map(comm => (
                                                <TouchableOpacity
                                                    key={comm.id}
                                                    style={styles.pickerItem}
                                                    onPress={() => {
                                                        setSelectedCommunityId(comm.id);
                                                        setSelectedChannelId(null);
                                                        setShowCommunityPicker(false);
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        {comm.logo_url ? (
                                                            <Image source={{ uri: getImageUrl(comm.logo_url) }} style={styles.communityPickerLogo} />
                                                        ) : (
                                                            <View style={styles.communityPickerPlaceholder} />
                                                        )}
                                                        <Text style={[styles.pickerText, selectedCommunityId === comm.id && styles.activeText]}>{comm.name}</Text>
                                                    </View>
                                                    {selectedCommunityId === comm.id && <Check size={16} color={colors.primary} />}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Selection Row: Channel + Add Image */}
                                {selectedCommunityId && (
                                    <View style={styles.rowControls}>
                                        {/* Channel Selector */}
                                        <TouchableOpacity
                                            style={[styles.selector, styles.halfSelector]}
                                            onPress={() => {
                                                setShowChannelPicker(!showChannelPicker);
                                                setShowCommunityPicker(false);
                                            }}
                                        >
                                            <Text style={styles.selectorLabel} numberOfLines={1}>
                                                {selectedChannel ? `#${selectedChannel.name}` : '# Channel'}
                                            </Text>
                                            <ChevronDown size={16} color={colors.textMuted} />
                                        </TouchableOpacity>

                                        {/* Image Add Button (Beside channel) */}
                                        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                                            <ImageIcon size={20} color={colors.primary} />
                                            <Text style={styles.imageButtonText}>Add Image</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {showChannelPicker && (
                                    <View style={styles.pickerContainer}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                            {filteredChannels.length > 0 ? filteredChannels.map(ch => (
                                                <TouchableOpacity
                                                    key={ch.id}
                                                    style={styles.pickerItem}
                                                    onPress={() => {
                                                        setSelectedChannelId(ch.id);
                                                        setShowChannelPicker(false);
                                                    }}
                                                >
                                                    <Text style={[styles.pickerText, selectedChannelId === ch.id && styles.activeText]}>#{ch.name}</Text>
                                                    {selectedChannelId === ch.id && <Check size={16} color={colors.primary} />}
                                                </TouchableOpacity>
                                            )) : (
                                                <Text style={styles.emptyText}>No channels available</Text>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Image Previews */}
                            {images.length > 0 && (
                                <ScrollView horizontal style={styles.smallPreviewContainer} showsHorizontalScrollIndicator={false}>
                                    {images.map((img, idx) => (
                                        <View key={idx} style={styles.smallImageWrapper}>
                                            <Image source={{ uri: getImageUrl(img) }} style={styles.smallPreviewImg} />
                                            <TouchableOpacity
                                                style={styles.smallRemoveBtn}
                                                onPress={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                            >
                                                <X size={12} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}

                            {/* Input Area */}
                            <View style={styles.inputContainer}>
                                <View style={styles.titleRow}>
                                    <TextInput
                                        style={styles.titleInput}
                                        placeholder="Title"
                                        placeholderTextColor={colors.textMuted}
                                        value={title}
                                        onChangeText={(t) => setTitle(t.slice(0, MAX_TITLE_LENGTH))}
                                        maxLength={MAX_TITLE_LENGTH}
                                    />
                                    <Text style={styles.charCount}>{title.length}/{MAX_TITLE_LENGTH}</Text>
                                </View>

                                <TextInput
                                    style={styles.bodyInput}
                                    placeholder="What do you want to share?"
                                    placeholderTextColor={colors.textMuted}
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </SafeAreaView>


            <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? 0 : 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background, // Ensure header background is white for status bar overlap
    },
    iconButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
    },
    postButton: {
        backgroundColor: colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    disabledButton: {
        opacity: 0.6,
    },
    postButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    topControls: {
        padding: 16,
        paddingBottom: 0,
        gap: 12,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        flex: 1,
    },
    selectorMain: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    commLogo: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: '#CCC',
    },
    commPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: colors.primary,
    },
    selectorLabel: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
        flexShrink: 1,
    },
    rowControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    halfSelector: {
        flex: 1,
    },
    imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        gap: 6,
    },
    imageButtonText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    pickerContainer: {
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 8,
        overflow: 'hidden', // Contain scrolling
    },
    pickerItem: {
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    pickerText: {
        fontSize: 15,
        color: colors.text,
    },
    activeText: {
        color: colors.primary,
        fontWeight: '600',
    },
    emptyText: {
        padding: 14,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    smallPreviewContainer: {
        paddingHorizontal: 16,
        marginTop: 12,
        paddingTop: 12, // Fix for clipped remove button
    },
    smallImageWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    smallPreviewImg: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F0F2F5',
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    smallRemoveBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#FFF',
        zIndex: 1
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 12,
    },
    titleInput: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        paddingVertical: 8,
        flex: 1,
    },
    charCount: {
        fontSize: 12,
        color: colors.textMuted,
        marginLeft: 8,
    },
    bodyInput: {
        fontSize: 16,
        color: colors.text,
        minHeight: 150,
        lineHeight: 24,
    },
    communityPickerLogo: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 10,
    },
    communityPickerPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: '#eee',
    },
    validationModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    validationModalContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    validationIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEE2E2', // Light red background
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    validationTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    validationMessage: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    validationButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        width: '100%',
        alignItems: 'center',
    },
    validationButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
