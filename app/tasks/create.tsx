import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, DeviceEventEmitter, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import crashlytics from '@/lib/crashlytics';
import { useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { ArrowLeft, Save, Calendar, Clock, Tag, Flag, Plus, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Toast } from '@/components/Toast';
import { useApp } from '@/contexts/AppContext';
import { trackEvent } from '@/lib/analytics/track';
import { CustomTimePicker } from '@/components/CustomTimePicker';

const MAX_TITLE_LENGTH = 50;
const AVAILABLE_TAGS = ['Work', 'Personal', 'Health', 'Diet', 'Learning', 'Shopping', 'Home', 'Finance'];

interface SubtaskInput {
    title: string;
    description: string;
}

export default function CreateTaskScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { addNotification } = useApp();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState<Date | null>(new Date());
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Subtasks State
    const [subtasks, setSubtasks] = useState<SubtaskInput[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newSubtaskDesc, setNewSubtaskDesc] = useState('');
    const [showSubtaskInput, setShowSubtaskInput] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag));
        } else {
            if (selectedTags.length >= 3) {
                setToastMsg('You can select up to 3 tags.');
                return;
            }
            setSelectedTags(prev => [...prev, tag]);
        }
    };

    const addSubtask = () => {
        if (!newSubtaskTitle.trim()) {
            setToastMsg('Subtask title is required');
            return;
        }
        setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), description: newSubtaskDesc.trim() }]);
        setNewSubtaskTitle('');
        setNewSubtaskDesc('');
        // setShowSubtaskInput(false); // Removed to keep input open as per user request
    };

    const removeSubtask = (index: number) => {
        setSubtasks(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateOption = async () => {
        if (!title.trim()) {
            setToastMsg('Please enter a task title');
            return;
        }

        if (!user) {
            setToastMsg('User not authenticated');
            return;
        }

        try {
            setIsSubmitting(true);

            // 1. Create Main Task
            const { data: mainTaskData, error: mainTaskError } = await supabase
                .from('user_tasks')
                .insert([
                    {
                        user_id: user.id,
                        title: title.trim(),
                        description: description.trim() || null,
                        priority,
                        tags: selectedTags,
                        due_date: dueDate ? dueDate.toISOString() : null,
                        is_completed: false,
                        sort_order: 0,
                        is_active: true
                    }
                ])
                .select()
                .single();

            if (mainTaskError) throw mainTaskError;

            // 2. Create Subtasks if any
            if (subtasks.length > 0 && mainTaskData) {
                const subtaskPayloads = subtasks.map((st) => ({
                    user_id: user.id,
                    parent_task_id: mainTaskData.id,
                    title: st.title,
                    description: st.description || null,
                    is_completed: false,
                    is_active: true
                }));

                const { error: subtasksError } = await supabase
                    .from('user_tasks')
                    .insert(subtaskPayloads);

                if (subtasksError) throw subtasksError;
            }

            // Check notification settings
            const { data: settingsData } = await supabase
                .from('user_notification_settings')
                .select('system_enabled')
                .eq('user_id', user.id)
                .eq('category', 'task')
                .eq('action', 'create')
                .maybeSingle();

            if (!settingsData || settingsData.system_enabled !== false) {
                await addNotification({
                    title: 'Task Created',
                    message: `Task "${title.trim()}" has been created.`,
                    notification_type: 'task',
                    category: 'success'
                });
            }

            trackEvent('task_added', { title: title.trim(), priority });

            DeviceEventEmitter.emit('task_update');
            router.back();

        } catch (error) {
            console.log('[ERROR]:', 'Error creating task:', error);
            crashlytics().recordError(error as any);
            // @ts-ignore
            setToastMsg(`Failed to create task: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDateChange = (selectedDate: Date) => {
        setShowDatePicker(false);
        setDueDate(selectedDate);
    };

    return (
        <>
            <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Task</Text>
                    <TouchableOpacity
                        onPress={handleCreateOption}
                        disabled={isSubmitting}
                        style={styles.saveButton}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                            <Save size={24} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={{ flex: 1 }}
                >
                    <ScrollView 
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="always"
                    >

                        {/* Title Input */}
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={styles.titleInput}
                                placeholder="Task Title"
                                placeholderTextColor={colors.textLight}
                                value={title}
                                onChangeText={(text) => {
                                    if (text.length <= MAX_TITLE_LENGTH) setTitle(text);
                                }}
                                maxLength={MAX_TITLE_LENGTH}
                            />
                            <Text style={styles.charCount}>{title.length}/{MAX_TITLE_LENGTH}</Text>
                        </View>

                        {/* Priority Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>PRIORITY</Text>
                            <View style={styles.priorityContainer}>
                                {(['low', 'medium', 'high'] as const).map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[
                                            styles.priorityChip,
                                            priority === p && styles.priorityChipActive,
                                            priority === p && {
                                                backgroundColor: p === 'high' ? colors.error + '20' : p === 'medium' ? colors.warning + '20' : colors.success + '20',
                                                borderColor: p === 'high' ? colors.error : p === 'medium' ? colors.warning : colors.success
                                            }
                                        ]}
                                        onPress={() => setPriority(p)}
                                    >
                                        <Flag size={14} color={
                                            priority === p
                                                ? (p === 'high' ? colors.error : p === 'medium' ? colors.warning : colors.success)
                                                : colors.textMuted
                                        } />
                                        <Text style={[
                                            styles.priorityText,
                                            priority === p && {
                                                color: p === 'high' ? colors.error : p === 'medium' ? colors.warning : colors.success,
                                                fontWeight: '700'
                                            }
                                        ]}>
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Tags Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>TAGS (MAX 3)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsContainer}>
                                {AVAILABLE_TAGS.map(tag => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[
                                                styles.tagChip,
                                                isSelected && styles.tagChipActive
                                            ]}
                                            onPress={() => toggleTag(tag)}
                                        >
                                            <Text style={[
                                                styles.tagText,
                                                isSelected && styles.tagTextActive
                                            ]}>{tag}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Due Date */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>DUE TIME</Text>
                            <TouchableOpacity
                                style={styles.dateSelector}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Clock size={20} color={colors.textLight} />
                                <Text style={styles.dateText}>
                                    {dueDate ? format(dueDate, 'p') : 'No Time Set'}
                                </Text>
                            </TouchableOpacity>
                            <CustomTimePicker
                                visible={showDatePicker}
                                initialDate={dueDate}
                                onClose={() => setShowDatePicker(false)}
                                onSelect={onDateChange}
                            />
                        </View>

                        {/* Description - Moved Here */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                            <TextInput
                                style={styles.descriptionInput}
                                placeholder="Add details..."
                                placeholderTextColor={colors.textLight}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Subtasks Section */}
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                                <Text style={styles.sectionLabel}>SUBTASKS</Text>
                                <TouchableOpacity onPress={() => setShowSubtaskInput(!showSubtaskInput)}>
                                    <Plus size={20} color={colors.primary} />
                                </TouchableOpacity>
                            </View>

                            {/* List of added subtasks */}
                            {subtasks.map((st, index) => (
                                <View key={index} style={styles.subtaskItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.subtaskTitle}>{st.title}</Text>
                                        {st.description ? <Text style={styles.subtaskDesc}>{st.description}</Text> : null}
                                    </View>
                                    <TouchableOpacity onPress={() => removeSubtask(index)}>
                                        <X size={18} color={colors.textLight} />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Add Subtask Input */}
                            {showSubtaskInput && (
                                <View style={styles.subtaskInputContainer}>
                                    <TextInput
                                        style={styles.subtaskTitleInput}
                                        placeholder="Subtask Title"
                                        placeholderTextColor={colors.textLight}
                                        value={newSubtaskTitle}
                                        onChangeText={setNewSubtaskTitle}
                                        autoFocus
                                    />
                                    <TextInput
                                        style={styles.subtaskDescInput}
                                        placeholder="Description (optional)"
                                        placeholderTextColor={colors.textLight}
                                        value={newSubtaskDesc}
                                        onChangeText={setNewSubtaskDesc}
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                                        <TouchableOpacity onPress={() => setShowSubtaskInput(false)}>
                                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={addSubtask}>
                                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {!showSubtaskInput && subtasks.length === 0 && (
                                <TouchableOpacity style={styles.addSubtaskBtn} onPress={() => setShowSubtaskInput(true)}>
                                    <Plus size={16} color={colors.textMuted} />
                                    <Text style={styles.addSubtaskText}>Add Subtask</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
    saveButton: {
        padding: 8,
        marginRight: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    titleInput: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
        padding: 0,
    },
    charCount: {
        fontSize: 12,
        color: colors.textLight,
        textAlign: 'right',
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textLight,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    priorityContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    priorityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.card,
        gap: 6,
    },
    priorityChipActive: {
        // styles applied dynamically
    },
    priorityText: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },
    tagsContainer: {
        gap: spacing.sm,
        paddingRight: spacing.lg,
    },
    tagChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.card,
    },
    tagChipActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10', // 10% opacity hex
    },
    tagText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    tagTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
    },
    dateText: {
        fontSize: 16,
        color: colors.textLight,
        fontWeight: '500',
    },
    descriptionInput: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
        minHeight: 20,
        textAlignVertical: 'top',
        padding: 0,
    },

    // Subtasks
    subtaskInputContainer: {
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.sm,
    },
    subtaskTitleInput: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 8,
    },
    subtaskDescInput: {
        fontSize: 14,
        color: colors.text,
        marginBottom: 4,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    subtaskTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },
    subtaskDesc: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    addSubtaskBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
    },
    addSubtaskText: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },
});
