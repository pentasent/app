import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, DeviceEventEmitter, Alert, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { ArrowLeft, Trash2, Calendar, Clock, CheckCircle2, Circle, Save, Flag, Plus, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { UserTask } from '@/types/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskDetailShimmer } from '@/components/shimmers/TaskDetailShimmer';
import { Toast } from '@/components/Toast';
import { useApp } from '@/contexts/AppContext';

const MAX_TITLE_LENGTH = 50;
const AVAILABLE_TAGS = ['Work', 'Personal', 'Health', 'Diet', 'Learning', 'Shopping', 'Home', 'Finance'];

export default function TaskDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { addNotification } = useApp();

    const [task, setTask] = useState<UserTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Subtasks State
    const [subtasks, setSubtasks] = useState<UserTask[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newSubtaskDesc, setNewSubtaskDesc] = useState('');
    const [showSubtaskInput, setShowSubtaskInput] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const isReadOnly = task?.is_completed ?? false;

    useEffect(() => {
        if (id) {
            fetchTaskDetails();
            fetchSubtasks();
        }
    }, [id]);

    const fetchTaskDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_tasks')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setTask(data);
                setTitle(data.title);
                setDescription(data.description || '');
                setPriority(data.priority);
                setSelectedTags(data.tags || []);
                if (data.due_date) {
                    setDueDate(parseISO(data.due_date));
                }
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
            Alert.alert('Error', 'Could not load task details');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const fetchSubtasks = async () => {
        try {
            const { data, error } = await supabase
                .from('user_tasks')
                .select('*')
                .eq('parent_task_id', id)
                .is('is_active', true)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setSubtasks(data || []);
        } catch (error) {
            console.error('Error fetching subtasks:', error);
        }
    };

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

    const handleSave = async () => {
        if (!task || isReadOnly || !user) return; // Prevent save if read-only or no user

        if (!title.trim()) {
            setToastMsg('Task title cannot be empty');
            return;
        }

        try {
            setIsSaving(true);
            const updates = {
                title: title.trim(),
                description: description.trim() || null,
                priority,
                tags: selectedTags,
                due_date: dueDate ? dueDate.toISOString() : null,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('user_tasks')
                .update(updates)
                .eq('id', task.id);

            if (error) throw error;

            // Check notification settings
            const { data: settingsData } = await supabase
                .from('user_notification_settings')
                .select('system_enabled')
                .eq('user_id', user.id)
                .eq('category', 'task')
                .eq('action', 'update')
                .maybeSingle();

            if (!settingsData || settingsData.system_enabled !== false) {
                await addNotification({
                    title: 'Task Updated',
                    message: `Task "${title.trim()}" has been updated.`,
                    notification_type: 'task',
                    category: 'info'
                });
            }

            // Emit the specific updates to avoid full index page reloading
            DeviceEventEmitter.emit('task_update', { id: task.id, ...updates });
            router.back();
        } catch (error) {
            console.error('Error updating task:', error);
            Alert.alert('Error', 'Failed to update task');
        } finally {
            setIsSaving(false);
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
                .from('user_tasks')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;

            // Check notification settings
            const { data: settingsData } = await supabase
                .from('user_notification_settings')
                .select('system_enabled')
                .eq('user_id', user.id)
                .eq('category', 'task')
                .eq('action', 'delete')
                .maybeSingle();

            if (!settingsData || settingsData.system_enabled !== false) {
                await addNotification({
                    title: 'Task Deleted',
                    message: `Task "${task?.title}" has been deleted.`,
                    notification_type: 'task',
                    category: 'info'
                });
            }

            DeviceEventEmitter.emit('task_update');
            setShowDeleteModal(false);
            router.back();
        } catch (error) {
            console.error('Error deleting task:', error);
            setToastMsg('Failed to delete task');
            setIsDeleting(false); // Reset on error
            setShowDeleteModal(false);
        }
    };

    const setTaskCompletion = async (isCompleted: boolean) => {
        if (!task || !user) return;
        try {
            // Update DB
            const { error } = await supabase
                .from('user_tasks')
                .update({
                    is_completed: isCompleted,
                    completed_at: isCompleted ? new Date().toISOString() : null
                })
                .eq('id', task.id);

            if (error) throw error;

            // Check notification settings for completion
            if (isCompleted && !task.parent_task_id) {
                const { data: settingsData } = await supabase
                    .from('user_notification_settings')
                    .select('system_enabled')
                    .eq('user_id', user.id)
                    .eq('category', 'task')
                    .eq('action', 'complete')
                    .maybeSingle();

                if (!settingsData || settingsData.system_enabled !== false) {
                    await addNotification({
                        title: 'Task Completed',
                        message: `Great job! You've completed "${task.title}".`,
                        notification_type: 'task',
                        category: 'success'
                    });
                }
            }

            // Update Local State
            setTask({ ...task, is_completed: isCompleted });
            DeviceEventEmitter.emit('task_update');

            return true;
        } catch (error) {
            console.error('Error setting task completion:', error);
            return false;
        }
    };

    const toggleCompletion = async () => {
        if (!task) return;
        // If it's already completed, we don't allow un-completing it based on user request
        if (task.is_completed) {
            Alert.alert('Completed', 'This task is completed and cannot be edited.');
            return;
        }

        const newStatus = !task.is_completed;
        const success = await setTaskCompletion(newStatus);

        if (success && newStatus) {
            try {
                await supabase
                    .from('user_tasks')
                    .update({
                        is_completed: true,
                        completed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('parent_task_id', task.id);

                setSubtasks(prev => prev.map(st => ({ ...st, is_completed: true })));
            } catch (err) {
                console.error('Error auto-completing subtasks', err);
            }
        }
    };

    // Subtask Handlers
    const addSubtask = async () => {
        if (isReadOnly) return;
        if (!newSubtaskTitle.trim() || !user) {
            setToastMsg('Subtask title is required');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('user_tasks')
                .insert([{
                    user_id: user.id,
                    parent_task_id: id,
                    title: newSubtaskTitle.trim(),
                    description: newSubtaskDesc.trim() || null,
                    is_completed: false,
                    is_active: true
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setSubtasks([...subtasks, data]);
                setNewSubtaskTitle('');
                setNewSubtaskDesc('');
                setShowSubtaskInput(false);
            }
        } catch (error) {
            console.error('Error adding subtask:', error);
            Alert.alert('Error', 'Failed to add subtask');
        }
    };

    const toggleSubtaskCompletion = async (subtask: UserTask) => {
        if (isReadOnly) return; // Disable subtask toggling if main is done

        try {
            const newStatus = !subtask.is_completed;
            const updates = {
                is_completed: newStatus,
                completed_at: newStatus ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('user_tasks')
                .update(updates)
                .eq('id', subtask.id);

            if (error) throw error;

            // Update local state
            const updatedSubtasks = subtasks.map(t => t.id === subtask.id ? { ...t, ...updates } : t);
            setSubtasks(updatedSubtasks);

            // Logic: 
            // 1. If checking -> Check if ALL are done -> Complete Main
            // 2. If unchecking -> Ensure Main is Incomplete (though Main must be Incomplete to be here due to isReadOnly check)

            if (newStatus) {
                if (updatedSubtasks.every(st => st.is_completed)) {
                    await setTaskCompletion(true);
                }
            } else {
                // Enforce Main Incomplete if a subtask is unchecked
                // (Redundant if isReadOnly blocks access, but safe)
                if (task?.is_completed) {
                    await setTaskCompletion(false);
                }
            }

        } catch (error) {
            console.error('Error updating subtask:', error);
        }
    };

    const deleteSubtask = async (subtaskId: string) => {
        Alert.alert('Delete Subtask', 'Confirm delete?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const { error } = await supabase
                            .from('user_tasks')
                            .delete()
                            .eq('id', subtaskId);

                        if (error) throw error;
                        setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
                    } catch (error) {
                        console.error('Delete subtask error', error);
                    }
                }
            }
        ]);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDueDate(selectedDate);
        }
    };

    return (
        <>
            <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Task</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
                            <Trash2 size={22} color={colors.error} />
                        </TouchableOpacity>
                        {!isReadOnly && (
                            <TouchableOpacity onPress={handleSave} disabled={isSaving} style={[styles.iconButton, { marginLeft: 8 }]}>
                                {isSaving ? <ActivityIndicator size="small" color={colors.primary} /> : <Save size={24} color={colors.primary} />}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.iconButton, { marginLeft: 8 }, isReadOnly && { opacity: 0.8 }]}
                            onPress={toggleCompletion}
                            disabled={isReadOnly}
                        >
                            {task?.is_completed ? (
                                <CheckCircle2 size={24} color={colors.success} />
                            ) : (
                                <Circle size={24} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <TaskDetailShimmer />
                ) : (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        <ScrollView
                            contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Status Toggle */}
                            {/* <TouchableOpacity
                        style={[styles.statusRow, isReadOnly && { opacity: 0.8 }]}
                        onPress={toggleCompletion}
                        disabled={isReadOnly}
                    >
                        {task?.is_completed ? (
                            <CheckCircle2 size={24} color={colors.success} />
                        ) : (
                            <Circle size={24} color={colors.textLight} />
                        )}
                        <Text style={[styles.statusText, task?.is_completed && styles.completedText]}>
                            {task?.is_completed ? 'Completed' : 'Mark as Completed'}
                        </Text>
                    </TouchableOpacity> */}

                            {/* Title Input */}
                            <View style={[styles.inputGroup, isReadOnly && styles.disabledSection]}>
                                <TextInput
                                    style={[styles.titleInput, isReadOnly && { color: colors.textMuted }]}
                                    placeholder="Task Title"
                                    placeholderTextColor={colors.textLight}
                                    value={title}
                                    onChangeText={(text) => {
                                        if (text.length <= MAX_TITLE_LENGTH) setTitle(text);
                                    }}
                                    maxLength={MAX_TITLE_LENGTH}
                                    multiline
                                    editable={!isReadOnly}
                                />
                                <Text style={styles.charCount}>{title.length}/{MAX_TITLE_LENGTH}</Text>
                            </View>

                            {/* Priority Selection */}
                            <View style={[styles.section, isReadOnly && styles.disabledSection]}>
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
                                                },
                                                isReadOnly && { opacity: 0.6 }
                                            ]}
                                            onPress={() => !isReadOnly && setPriority(p)}
                                            disabled={isReadOnly}
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
                            <View style={[styles.section, isReadOnly && styles.disabledSection]}>
                                <Text style={styles.sectionLabel}>TAGS (MAX 3)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsContainer}>
                                    {AVAILABLE_TAGS.map(tag => {
                                        const isSelected = selectedTags.includes(tag);
                                        return (
                                            <TouchableOpacity
                                                key={tag}
                                                style={[
                                                    styles.tagChip,
                                                    isSelected && styles.tagChipActive,
                                                    isReadOnly && { opacity: 0.6 }
                                                ]}
                                                onPress={() => !isReadOnly && toggleTag(tag)}
                                                disabled={isReadOnly}
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

                            {/* Due Time */}
                            <View style={[styles.section, isReadOnly && styles.disabledSection]}>
                                <Text style={styles.sectionLabel}>DUE TIME</Text>
                                <TouchableOpacity
                                    style={[styles.dateSelector]}
                                    onPress={() => !isReadOnly && setShowDatePicker(true)}
                                    disabled={isReadOnly}
                                >
                                    <Clock size={20} color={isReadOnly ? colors.textMuted : colors.text} />
                                    <Text style={[styles.dateText, isReadOnly && { color: colors.textMuted }]}>
                                        {dueDate ? format(dueDate, 'p') : 'No Time Set'}
                                    </Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={dueDate || new Date()}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                    />
                                )}
                            </View>

                            {/* Description - Moved Here */}
                            <View style={[styles.section, isReadOnly && styles.disabledSection]}>
                                <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                                <TextInput
                                    style={[styles.descriptionInput, isReadOnly && { color: colors.textMuted }]}
                                    placeholder="Add details..."
                                    placeholderTextColor={colors.textLight}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    textAlignVertical="top"
                                    editable={!isReadOnly}
                                />
                            </View>

                            {/* Subtasks Section */}
                            <View style={[styles.section, isReadOnly && styles.disabledSection]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                                    <Text style={styles.sectionLabel}>SUBTASKS</Text>
                                    {!isReadOnly && (
                                        <TouchableOpacity onPress={() => setShowSubtaskInput(!showSubtaskInput)}>
                                            <Plus size={20} color={colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {subtasks.map((st, index) => (
                                    <View key={st.id} style={[styles.subtaskItem, isReadOnly && { opacity: 0.8 }]}>
                                        <TouchableOpacity onPress={() => toggleSubtaskCompletion(st)} style={{ marginRight: 10 }} disabled={isReadOnly}>
                                            {st.is_completed ? <CheckCircle2 size={20} color={colors.success} /> : <Circle size={20} color={colors.textLight} />}
                                        </TouchableOpacity>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.subtaskTitle, st.is_completed && styles.completedText]}>{st.title}</Text>
                                            {st.description ? <Text style={styles.subtaskDesc}>{st.description}</Text> : null}
                                        </View>
                                        {!isReadOnly && (
                                            <TouchableOpacity onPress={() => deleteSubtask(st.id)} style={{ padding: 4 }}>
                                                <X size={18} color={colors.textLight} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}

                                {/* Add Subtask Input */}
                                {!isReadOnly && showSubtaskInput && (
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

                                {!isReadOnly && !showSubtaskInput && subtasks.length === 0 && (
                                    <TouchableOpacity style={styles.addSubtaskBtn} onPress={() => setShowSubtaskInput(true)}>
                                        <Plus size={16} color={colors.textMuted} />
                                        <Text style={styles.addSubtaskText}>Add Subtask</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

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
                            <Text style={styles.modalTitle}>Delete Task</Text>
                            <Text style={styles.modalMessage}>Are you sure you want to delete this task?</Text>
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
    // statusRow: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     marginBottom: spacing.xl,
    //     gap: spacing.sm,
    //     padding: spacing.md,
    //     backgroundColor: colors.surface,
    //     borderRadius: borderRadius.md,
    //     borderWidth: 1,
    //     borderColor: colors.borderLight,
    // },
    statusText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    completedText: {
        color: colors.textMuted,
        textDecorationLine: 'line-through',
    },

    // Inputs shared
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
        // dynamic
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
        color: colors.text,
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
    disabledSection: {
        // opacity: 0.6,
        pointerEvents: 'none',
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
