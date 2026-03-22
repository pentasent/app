import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform,
    Dimensions,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import {
    ArrowLeft,
    MessageSquare,
    ThumbsUp,
    ThumbsDown,
    Send
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth, supabase } from '../../contexts/AuthContext';
import { getImageUrl } from '@/utils/get-image-url';
import { CustomImage as Image } from '../../components/CustomImage';
import { Toast } from '@/components/Toast';

import KeyboardShiftView from '@/components/KeyboardShiftView';

export default function FeedbackScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [message, setMessage] = useState('');
    const [rating, setRating] = useState<'liked' | 'disliked' | null>('liked');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const getMetadata = () => {
        const { width, height } = Dimensions.get('window');
        return {
            browser: "Mobile App",
            os: Platform.OS === 'ios' ? 'iOS' : 'Android',
            app_version: "1.0.0",
            os_version: Platform.Version,
            viewport: `${Math.round(width)}x${Math.round(height)}`,
            language: "en" // In a real app we'd use Localization
        };
    };

    const handleSubmit = async () => {
        if (!message.trim() || message.trim().length < 20) {
            setToastMsg('Please provide at least 20 characters of feedback.');
            return;
        }

        setIsSubmitting(true);

        try {
            const metadata = getMetadata();

            const { error } = await supabase.from('feedback').insert([
                {
                    user_id: user?.id || null,
                    name: user?.name || 'Authenticated User',
                    email: user?.email || null,
                    message: message.trim(),
                    rating: rating,
                    page_url: 'app://profile/feedback',
                    source: 'app',
                    metadata: metadata,
                    status: 'new',
                }
            ]);

            if (error) throw error;

            setToastMsg('Feedback sent! Thank you for helping us improve.');
            setMessage('');
            setRating(null);

            // Navigate back after a short delay so they see the toast
            setTimeout(() => {
                router.back();
            }, 2000);
        } catch (error: any) {
            console.error("Feedback submission error:", error);
            setToastMsg(error.message || "Failed to send feedback. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.title}>Feedback</Text>
                        <Text style={styles.subtitle}>Help us build a better Pentasent</Text>
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
                        <MessageSquare size={24} color={colors.primary} />
                    </TouchableOpacity>

                </View>
            </View>

            <KeyboardShiftView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.sectionContainer}>
                        {/* <View style={styles.iconHeader}>
                            <View style={styles.iconBoxLarge}>
                                <MessageSquare size={28} color={colors.primary} />
                            </View>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.sectionTitle}>Your Feedback Matters</Text>
                                <Text style={styles.descriptionText}>
                                    Tell us what's working and what's not. Every bit of input helps us grow.
                                </Text>
                            </View>
                        </View>
                         */}
                        {/* <View style={styles.divider} /> */}

                        {/* Rating Selection */}
                        <Text style={styles.label}>How was your experience?</Text>
                        <View style={styles.ratingRow}>
                            <TouchableOpacity
                                style={[
                                    styles.ratingButton,
                                    rating === 'liked' && styles.ratingButtonSelected
                                ]}
                                onPress={() => setRating('liked')}
                                activeOpacity={0.7}
                            >
                                <ThumbsUp
                                    size={20}
                                    color={rating === 'liked' ? '#FFF' : colors.textMuted}
                                />
                                <Text style={[
                                    styles.ratingButtonText,
                                    rating === 'liked' && styles.ratingButtonTextSelected
                                ]}>Love it</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.ratingButton,
                                    rating === 'disliked' && styles.ratingButtonSelected
                                ]}
                                onPress={() => setRating('disliked')}
                                activeOpacity={0.7}
                            >
                                <ThumbsDown
                                    size={20}
                                    color={rating === 'disliked' ? '#FFF' : colors.textMuted}
                                />
                                <Text style={[
                                    styles.ratingButtonText,
                                    rating === 'disliked' && styles.ratingButtonTextSelected
                                ]}>Needs work</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Message Input */}
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Message <Text style={{ color: colors.primary }}>*</Text></Text>
                            <Text style={[
                                styles.charCount,
                                message.length >= 20 ? styles.charCountValid : null
                            ]}>
                                {message.length}/500 (min 20)
                            </Text>
                        </View>

                        <TextInput
                            style={styles.textarea}
                            placeholder="How can we improve? (Minimum 20 characters)"
                            placeholderTextColor={colors.textMuted}
                            value={message}
                            onChangeText={setMessage}
                            maxLength={500}
                            multiline
                            textAlignVertical="top"
                        />

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (isSubmitting || message.length < 20) && styles.submitButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={isSubmitting || message.length < 20}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Text style={styles.submitButtonText}>Send Feedback</Text>
                                    <Send size={18} color="#FFF" style={{ marginLeft: 8 }} />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={() => router.back()}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity> */}
                    </View>
                </ScrollView>
            </KeyboardShiftView>

            <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
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
    title: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textLight,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    sectionContainer: {
        // backgroundColor: colors.card,
        // borderWidth: 1,
        // borderColor: colors.borderLight,
        // borderRadius: borderRadius.lg,
        // padding: spacing.xl,
        marginBottom: spacing.lg,
    },
    iconHeader: {
        // flexDirection: 'column',
        // alignItems: 'flex-start',
        // marginBottom: spacing.lg,
        // gap: 12,
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

    },
    headerTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    descriptionText: {
        fontSize: 14,
        color: colors.textLight,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginBottom: spacing.lg,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textLight,
        // letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    charCount: {
        fontSize: 10,
        color: colors.textLight + "90",
        marginBottom: spacing.sm,
    },
    charCountValid: {
        color: '#10B981', // Green 600
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 12,
        marginVertical: spacing.md,
    },
    ratingButton: {
        flex: 1,
        // width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: 8,
    },
    ratingButtonSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    ratingButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
    },
    ratingButtonTextSelected: {
        color: '#FFF',
    },
    textarea: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 16,
        padding: 16,
        height: 140,
        fontSize: 15,
        color: colors.text,
        marginBottom: spacing.xl,
    },
    submitButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        marginTop: spacing.md,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.textLight,
        fontSize: 15,
        fontWeight: '600',
    },
});
