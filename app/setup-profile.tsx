import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Modal,
    FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, supabase } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CustomImage as Image } from '../components/CustomImage';
import { Camera, ChevronDown, Check, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadImage } from '../utils/image-upload';
import { COUNTRIES } from '@/lib/country';
import { getImageUrl } from '@/utils/get-image-url';

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

export default function SetupProfileScreen() {
    const { user, refreshUser } = useAuth();
    const router = useRouter();

    const capitalizeWords = (text: string) =>
        text
            ? text
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            : '';

    const [name, setName] = useState(capitalizeWords(user?.name || ''));
    const [bio, setBio] = useState('');
    const [country, setCountry] = useState<{ label: string; flag: string } | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const [showCountryModal, setShowCountryModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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
                setErrorMsg('File should not be more than 10 MB.');
                return;
            }
            setAvatarUrl(asset.uri);
        }
    };

    const isFormValid = name.trim().length > 0 && bio.trim().length >= 20 && country !== null && avatarUrl !== null;

    const handleSubmit = async () => {
        setErrorMsg(null);
        if (!isFormValid) {
            setErrorMsg('All fields are required, and bio must be at least 20 characters.');
            return;
        }
        if (!user) {
            setErrorMsg('Critical error: auth session missing.');
            return;
        }

        setLoading(true);
        try {
            let finalAvatarUrl = avatarUrl;

            // Upload Image if it's a local URI
            if (avatarUrl && (avatarUrl.startsWith('file') || avatarUrl.startsWith('content'))) {
                const filename = `avatars/${user.id}_${Date.now()}.jpg`;
                const uploadResult = await uploadImage(avatarUrl, filename);
                
                if (!uploadResult) {
                    throw new Error('Failed to upload avatar.');
                }

                // Store only the relative path
                finalAvatarUrl = filename;
            }

            // Upsert into public.users
            const { error } = await supabase.from('users').upsert({
                id: user.id,
                email: user.email,
                name: name.trim(),
                country: country.label,
                bio: bio.trim(),
                avatar_url: finalAvatarUrl,
                is_verified: true, // Should be true since they got past OTP
                is_active: true
            }, { onConflict: 'id' });

            if (error) throw error;

            // Welcome Notification
            await supabase.from('notifications').insert({
                user_id: user.id,
                notification_type: 'system_announcement',
                category: 'success',
                title: 'Welcome to Pentasent!',
                message: 'Your account is fully set up. Dive into your new communities and explore!',
                is_seen: false,
                is_active: true
            });

            // Update local context
            await refreshUser();

            // Explicitly route instead of relying on layout race conditions
            const { data: comms } = await supabase
                .from('community_followers')
                .select('community_id')
                .eq('user_id', user.id);

            if (!comms || comms.length === 0) {
                router.replace('/onboarding-communities');
            } else {
                router.replace('/(tabs)');
            }

        } catch (error: any) {
            setErrorMsg(error.message || 'Failed to finish setting up your profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SafeAreaView style={styles.container}>
                <StatusBar style="dark" backgroundColor={colors.background} />
                <Toast message={errorMsg} onHide={() => setErrorMsg(null)} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardContainer}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.header}>
                            <Text style={styles.title}>Complete Profile</Text>
                            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
                        </View>

                        <View style={styles.formContainer}>
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
                            </View>

                            <Input
                                label="Email Address"
                                value={user?.email || ''}
                                editable={false}
                                style={styles.disabledInput}
                            />

                            <Input
                                label="Full Name"
                                placeholder="Enter your name"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Location (Country)</Text>
                                <TouchableOpacity
                                    style={styles.countryPicker}
                                    onPress={() => setShowCountryModal(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.countryText, !country && { color: colors.textMuted }]}>
                                        {country ? `${country.flag}  ${country.label}` : 'Select your country'}
                                    </Text>
                                    <ChevronDown size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.inputContainer]}>
                                <Text style={styles.label}>Bio</Text>
                                <Input
                                    placeholder="Share a little about yourself..."
                                    value={bio}
                                    onChangeText={setBio}
                                    multiline
                                    numberOfLines={4}
                                    maxLength={500}
                                    style={styles.bioInput}
                                    autoCapitalize="sentences"
                                />
                                <Text style={styles.charCount}>{bio.length}/500</Text>
                            </View>

                            <Button
                                title="Complete Setup"
                                onPress={handleSubmit}
                                loading={loading}
                                disabled={!isFormValid || loading}
                                style={styles.submitButton}
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Country Selection Modal */}
            <Modal
                visible={showCountryModal}
                animationType="slide"
                transparent={true}
                statusBarTranslucent
                onRequestClose={() => setShowCountryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setShowCountryModal(false)} style={styles.closeIcon}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={COUNTRIES}
                            keyExtractor={(item) => item.label}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.countryOption}
                                    onPress={() => {
                                        setCountry(item);
                                        setShowCountryModal(false);
                                    }}
                                >
                                    <Text style={styles.countryOptionFlag}>{item.flag}</Text>
                                    <Text style={styles.countryOptionText}>{item.label}</Text>
                                    {country?.label === item.label && <Check size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    keyboardContainer: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        // paddingHorizontal: spacing.lg,
        // paddingTop: spacing.xxl,
        // paddingBottom: spacing.xl,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        // marginBottom: spacing.xl,
        // paddingTop: spacing.md, // adjust since safeareaview handles top
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
    formContainer: {
        // backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 4,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: colors.borderLight,
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
        borderColor: colors.surface,
    },
    disabledInput: {
        // backgroundColor: colors.background,
        color: colors.textMuted,
    },
    inputContainer: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.bodySmall,
        color: colors.text,
        marginBottom: spacing.xs,
        fontWeight: '500',
    },
    countryPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 50,
        backgroundColor: colors.card,
    },
    countryText: {
        ...typography.body,
        color: colors.text,
    },
    bioInput: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: spacing.sm,
    },
    charCount: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'right',
        marginTop: 4,
    },
    submitButton: {
        marginTop: spacing.xl,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        marginBottom: spacing.sm,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.text,
    },
    closeIcon: {
        padding: spacing.xs,
    },
    countryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    countryOptionFlag: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    countryOptionText: {
        ...typography.body,
        color: colors.text,
        flex: 1,
    },
});
