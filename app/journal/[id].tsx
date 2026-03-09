import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, DeviceEventEmitter, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext'; // imports might vary based on your structure
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { ArrowLeft, Save, Trash2, Edit2, Smile, Frown, Meh } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { JournalDetailShimmer } from '@/components/shimmers/JournalDetailShimmer';
import { Toast } from '@/components/Toast';
import { useApp } from '@/contexts/AppContext';
import { trackEvent } from '@/lib/analytics/track';

const MOODS = [
    { label: 'Happy', emoji: '😊', value: 8 },
    { label: 'Calm', emoji: '😌', value: 6 },
    { label: 'Neutral', emoji: '😐', value: 5 },
    { label: 'Sad', emoji: '😔', value: 3 },
    { label: 'Anxious', emoji: '😰', value: 2 },
    { label: 'Excited', emoji: '🤩', value: 9 },
];

export default function JournalEntryScreen() {
    const { id } = useLocalSearchParams(); // 'new' or a UUID
    const router = useRouter();
    const { user } = useAuth();
    const { addNotification } = useApp();

    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('info');
    const [isEditing, setIsEditing] = useState(isNew);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedMood, setSelectedMood] = useState<any>(null); // { label, emoji }

    const [originalData, setOriginalData] = useState<any>(null);


    useEffect(() => {
        if (!isNew && id) {
            fetchJournal();
        }
    }, [id]);

    const fetchJournal = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_journals')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setOriginalData(data);
                setTitle(data.title || '');
                setContent(data.content || '');
                if (data.mood_label) {
                    const mood = MOODS.find(m => m.label === data.mood_label);
                    // Fallback if custom mood logic isn't strictly enforced
                    setSelectedMood(mood || { label: data.mood_label, emoji: data.mood_emoji });
                }
            }
        } catch (error) {
            console.error(error);
            setToastType('error');
            setToastMsg('Failed to load journal.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user || !user.id) {
            console.error('No authenticated user found!');
            setToastType('error');
            setToastMsg('You must be logged in to save a journal.');
            return;
        }

        if (!title.trim()) {
            setToastType('error');
            setToastMsg('Please enter a journal title');
            return;
        }

        if (title.length > 50) {
            setToastType('error');
            setToastMsg('Title must be 50 characters or less.');
            return;
        }

        if (!content.trim()) {
            setToastType('error');
            setToastMsg('Content cannot be empty.');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                user_id: user.id, // Ensure strict user.id usage
                title: title.trim() || null,
                content: content.trim(),
                mood_label: selectedMood?.label || null,
                mood_emoji: selectedMood?.emoji || null,
                mood_intensity: selectedMood?.value || null,
                is_active: true,
                updated_at: new Date().toISOString(),
            };

            let error;
            if (isNew) {
                const { error: insertError } = await supabase.from('user_journals').insert([payload]);
                error = insertError;
            } else {
                const { error: updateError } = await supabase
                    .from('user_journals')
                    .update(payload)
                    .eq('id', id);
                error = updateError;
            }

            if (error) throw error;

            // Check notification settings
            const { data: settingsData } = await supabase
                .from('user_notification_settings')
                .select('system_enabled')
                .eq('user_id', user.id)
                .eq('category', 'journal')
                .eq('action', isNew ? 'create' : 'update')
                .maybeSingle();

            if (!settingsData || settingsData.system_enabled !== false) {
                await addNotification({
                    title: isNew ? 'Journal Created' : 'Journal Updated',
                    message: isNew ? 'Your new journal entry has been saved.' : 'Your journal entry has been updated.',
                    notification_type: 'journal',
                    category: 'success'
                });
            }

            if (isNew) {
                trackEvent('journal_created', { title: title.trim() });
            }

            // Success
            DeviceEventEmitter.emit('journal_update');
            setToastType('success');
            setToastMsg(isNew ? 'Journal created successfully!' : 'Journal updated successfully!');

            if (isNew) {
                setTimeout(() => {
                    router.back();
                }, 1500);
            } else {
                setIsEditing(false);
                fetchJournal(); // Refresh
            }

        } catch (error) {
            console.error(error);
            setToastType('error');
            setToastMsg('Failed to save journal.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!user || isDeleting) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('user_journals')
                .update({ is_active: false }) // Soft delete
                .eq('id', id);

            if (error) throw error;

            // Check notification settings
            const { data: settingsData } = await supabase
                .from('user_notification_settings')
                .select('system_enabled')
                .eq('user_id', user.id)
                .eq('category', 'journal')
                .eq('action', 'delete')
                .maybeSingle();

            if (!settingsData || settingsData.system_enabled !== false) {
                await addNotification({
                    title: 'Journal Deleted',
                    message: 'Your journal entry has been deleted.',
                    notification_type: 'journal',
                    category: 'info'
                });
            }

            DeviceEventEmitter.emit('journal_update');
            setShowDeleteModal(false);
            router.back();
        } catch (error) {
            setToastType('error');
            setToastMsg('Failed to delete.');
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // ... (Loading state moved below Header)

    return (
        <>
            <Toast message={toastMsg} onHide={() => setToastMsg(null)} type={toastType} />
            <SafeAreaView style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>
                        {isNew ? 'New Entry' : (isEditing ? 'Edit Entry' : 'Journal Details')}
                    </Text>

                    <View style={styles.actions}>
                        {isEditing ? (
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={colors.primary} /> : <Save size={24} color={colors.primary} />}
                            </TouchableOpacity>
                        ) : (
                            <>
                                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.actionBtn}>
                                    <Edit2 size={22} color={colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
                                    <Trash2 size={22} color={colors.error} />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {loading ? (
                    <JournalDetailShimmer />
                ) : (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        style={{ flex: 1 }}
                    >
                        <ScrollView contentContainerStyle={styles.scrollContent}>

                            {/* View Mode Data */}
                            {!isEditing && (
                                <>
                                    <View style={styles.viewHeader}>
                                        <Text style={styles.viewDate}>
                                            {originalData ? new Date(originalData.created_at).toDateString() : ''}
                                        </Text>
                                        {selectedMood && (
                                            <View style={styles.moodChip}>
                                                <Text>{selectedMood.emoji} {selectedMood.label}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {title ? <Text style={styles.viewTitle}>{title}</Text> : null}

                                    <Text style={styles.viewContent}>{content}</Text>
                                </>
                            )}

                            {/* Edit Mode Inputs */}
                            {isEditing && (
                                <>
                                    <View>
                                        <TextInput
                                            style={styles.titleInput}
                                            placeholder="Title"
                                            placeholderTextColor={colors.textLight}
                                            value={title}
                                            onChangeText={setTitle}
                                            maxLength={50}
                                        />
                                        <Text style={styles.charCount}>{title.length}/50</Text>
                                    </View>

                                    <Text style={styles.label}>MOOD</Text>
                                    <View style={styles.moodScrollContainer}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodContainer}>
                                            {MOODS.map(m => (
                                                <TouchableOpacity
                                                    key={m.label}
                                                    style={[
                                                        styles.moodCard,
                                                        selectedMood?.label === m.label && styles.moodCardActive
                                                    ]}
                                                    onPress={() => setSelectedMood(m)}
                                                >
                                                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                                                    <Text style={[
                                                        styles.moodLabel,
                                                        selectedMood?.label === m.label && styles.moodLabelActive
                                                    ]}>{m.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <TextInput
                                        style={styles.contentInput}
                                        placeholder="What's on your mind?..."
                                        placeholderTextColor={colors.textLight}
                                        multiline
                                        textAlignVertical="top"
                                        value={content}
                                        onChangeText={setContent}
                                    />
                                </>
                            )}

                        </ScrollView>
                    </KeyboardAvoidingView>
                )}

                {/* Custom Delete Modal */}
                <Modal
                    visible={showDeleteModal}
                    transparent
                    statusBarTranslucent
                    animationType="fade"
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Delete Journal</Text>
                            <Text style={styles.modalMessage}>Are you sure you want to delete this journal entry?</Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalDeleteBtn, isDeleting && { opacity: 0.7 }]}
                                    onPress={confirmDelete}
                                    disabled={isDeleting}
                                >
                                    <Text style={styles.modalDeleteText}>
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.background,
    },
    iconButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
    },
    actionBtn: {
        padding: 4,
    },
    scrollContent: {
        padding: spacing.lg,
    },

    // Inputs
    titleInput: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    charCount: {
        fontSize: 12,
        color: colors.textLight,
        textAlign: 'right',
        marginBottom: spacing.md,
    },
    label: {
        fontSize: 12,
        color: colors.textLight,
        marginBottom: spacing.sm,
        fontWeight: '600',
    },
    moodScrollContainer: {
        marginHorizontal: -spacing.lg, // Bleed out
        marginBottom: spacing.lg,
    },
    moodContainer: {
        paddingHorizontal: spacing.lg,
        gap: 12,
    },
    moodCard: {
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.card,
        minWidth: 80,
        height: 80,
        justifyContent: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    moodCardActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10', // Light tint
        borderWidth: 2,
    },
    moodEmoji: {
        fontSize: 28,
        marginBottom: 8,
    },
    moodLabel: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },
    moodLabelActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    contentInput: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
        minHeight: 200,
    },

    // View Mode
    viewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    viewDate: {
        fontSize: 14,
        color: colors.textMuted,
    },
    moodChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    viewTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    viewContent: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 26,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    modalMessage: {
        ...typography.body,
        color: colors.textLight,
        marginBottom: spacing.xl,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
    },
    modalCancelBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
    },
    modalCancelText: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
    },
    modalDeleteBtn: {
        backgroundColor: colors.error + '20',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
    },
    modalDeleteText: {
        ...typography.body,
        color: colors.error,
        fontWeight: '600',
    },
});
