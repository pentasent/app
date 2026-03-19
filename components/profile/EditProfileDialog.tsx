import { CustomImage as Image } from '@/components/CustomImage';
import { Toast } from '@/components/Toast';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert, Platform, FlatList, KeyboardAvoidingView } from 'react-native';
import { useState, useEffect } from 'react';
import { ArrowLeft, Camera, X, ChevronDown, Check } from 'lucide-react-native';
import { colors, borderRadius, spacing } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase, useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/database';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { COUNTRIES } from '@/lib/country';
import { getImageUrl } from '@/utils/get-image-url';

interface EditProfileDialogProps {
    visible: boolean;
    onClose: () => void;
    currentUser: User | null;
    onUpdate: () => void; // Trigger refresh in parent
}

// const COUNTRIES = [
//     { label: 'United States', flag: '🇺🇸' },
//     { label: 'United Kingdom', flag: '🇬🇧' },
//     { label: 'India', flag: '🇮🇳' },
//     { label: 'Canada', flag: '🇨🇦' },
//     { label: 'Australia', flag: '🇦🇺' },
//     { label: 'Germany', flag: '🇩🇪' },
//     { label: 'France', flag: '🇫🇷' },
//     { label: 'Japan', flag: '🇯🇵' },
//     { label: 'Brazil', flag: '🇧🇷' },
//     { label: 'South Africa', flag: '🇿🇦' },
// ];

export const EditProfileDialog = ({ visible, onClose, currentUser, onUpdate }: EditProfileDialogProps) => {
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [country, setCountry] = useState<{ label: string; flag: string } | null>(null);
    const [showCountryModal, setShowCountryModal] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    useEffect(() => {
        if (visible && currentUser) {
            setName(currentUser.name || '');
            setBio(currentUser.bio || '');
            if (currentUser.country) {
                const found = COUNTRIES.find(c => c.label === currentUser.country);
                setCountry(found || { label: currentUser.country, flag: '🌍' });
            } else {
                setCountry(null);
            }
            setAvatarUrl(currentUser.avatar_url || null);
        }
    }, [visible, currentUser]);

    const handleClose = () => {
        onClose();
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                setToastMsg('File should not be more than 10 MB.');
                return;
            }
            setAvatarUrl(asset.uri);
        }
    };

    const { updateProfile } = useAuth();

    const handleSubmit = async () => {
        if (!currentUser) return;
        if (!name.trim()) {
            setToastMsg('Name cannot be empty.');
            return;
        }
        if (bio.trim().length < 20) {
            setToastMsg('Bio must be at least 20 characters.');
            return;
        }
        if (!country) {
            setToastMsg('Please select a country.');
            return;
        }

        setLoading(true);
        try {
            await updateProfile({
                name: name.trim(),
                bio: bio.trim(),
                country: country.label,
                avatar_uri: avatarUrl === currentUser.avatar_url ? undefined : avatarUrl || undefined
            });

            setToastMsg('Profile updated successfully.');
            onUpdate(); // Refresh stats in parent

            setTimeout(() => {
                onClose();
            }, 1000);

        } catch (error: any) {
            setToastMsg(error.message || 'Failed to update profile.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose} statusBarTranslucent>
                <StatusBar style="dark" backgroundColor={colors.borderLight} translucent={false} />
                <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <View style={styles.container}>
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
                                    <ArrowLeft size={24} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>Edit Profile</Text>
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    style={[styles.saveButton, loading && styles.disabledButton]}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {loading ? 'Saving...' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

                                {/* Avatar Upload */}
                                <View style={styles.avatarSection}>
                                    <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                                        <Image
                                            source={{ uri: getImageUrl(avatarUrl) }}
                                            style={styles.avatar}
                                        />
                                        <View style={styles.cameraIcon}>
                                            <Camera size={20} color="#FFF" />
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                                </View>

                                {/* Form */}
                                <View style={styles.form}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Your Name"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Location</Text>
                                        <TouchableOpacity
                                            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                                            onPress={() => setShowCountryModal(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[!country && { color: colors.textMuted }, { fontSize: 16 }]}>
                                                {country ? `${country.flag}  ${country.label}` : 'Select your country'}
                                            </Text>
                                            <ChevronDown size={20} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Bio</Text>
                                        <TextInput
                                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                            value={bio}
                                            onChangeText={setBio}
                                            placeholder="Share a little about yourself (20+ chars)..."
                                            placeholderTextColor={colors.textMuted}
                                            multiline
                                            numberOfLines={4}
                                            maxLength={500}
                                            autoCapitalize="sentences"
                                        />
                                        <Text style={{ alignSelf: 'flex-end', fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{bio.length}/500</Text>
                                    </View>
                                </View>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

            {/* Country Selection Modal */}
            <Modal
                visible={showCountryModal}
                animationType="slide"
                transparent={true}
                statusBarTranslucent
                onRequestClose={() => setShowCountryModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '80%' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={styles.headerTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setShowCountryModal(false)} style={styles.iconButton}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={COUNTRIES}
                            keyExtractor={(item) => item.label}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                                    onPress={() => {
                                        setCountry(item);
                                        setShowCountryModal(false);
                                    }}
                                >
                                    <Text style={{ fontSize: 24, marginRight: spacing.md }}>{item.flag}</Text>
                                    <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>{item.label}</Text>
                                    {country?.label === item.label && <Check size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    iconButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    changePhotoText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '500',
    },
    form: {
        paddingHorizontal: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textLight,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.card,
    },
});
