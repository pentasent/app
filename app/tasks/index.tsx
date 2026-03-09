
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, DeviceEventEmitter, TextInput, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router'; // Correct import
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { Plus, CheckSquare, Calendar, ChevronRight, LayoutGrid, Circle, CheckCircle2, Search, Filter, ArrowUpDown, X } from 'lucide-react-native';
import { UserTask } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, parseISO, startOfDay, endOfDay } from 'date-fns';
import { TaskCardShimmer } from '@/components/shimmers/TaskCardShimmer';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '@/contexts/AppContext';
import KeyboardShiftView from '@/components/KeyboardShiftView';

type SortOption = 'latest' | 'oldest' | 'priority';
type FilterPriority = 'all' | 'high' | 'medium' | 'low';

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addNotification } = useApp();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      let query = supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('parent_task_id', null) // Only show main tasks
        .eq('is_active', true)
        .gte('due_date', todayStart)
        .lte('due_date', todayEnd);

      // 1. Text Search
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // 2. Priority Filter
      if (filterPriority !== 'all') {
        query = query.eq('priority', filterPriority);
      }

      // 3. Sorting
      if (sortBy === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'priority') {
        query = query.order('priority', { ascending: false }).order('created_at', { ascending: false });
      }

      query = query.order('is_completed', { ascending: true });

      // Execute
      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);

    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, sortBy, filterPriority]);

  // Debounce Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTasks();
    }, 500); // 500ms delay
    return () => clearTimeout(timeout);
  }, [searchQuery, filterPriority, sortBy]);

  // Initial & Event Listeners
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('task_update', (updatedTask?: UserTask) => {
      if (updatedTask && updatedTask.id) {
        // Optimistically update the single modified task without triggering a full page reload/fetch
        setTasks(current => current.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
      } else {
        // Fallback to full fetch (mostly for creations or deletions)
        fetchTasks();
      }
    });
    return () => subscription.remove();
  }, [fetchTasks]);

  const toggleTaskCompletion = async (task: UserTask) => {
    // Read-Only check for Completed tasks
    if (task.is_completed || !user) {
      return;
    }

    try {
      const newStatus = !task.is_completed;
      const updates = {
        is_completed: newStatus,
        completed_at: newStatus ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      setTasks(current =>
        current.map(t => t.id === task.id ? { ...t, ...updates } : t)
      );

      const { error } = await supabase
        .from('user_tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;

      // If marking as complete, also mark all subtasks as complete
      if (newStatus) {
        await supabase
          .from('user_tasks')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('parent_task_id', task.id);
      }

      // Check notification settings for completion
      if (newStatus && !task.parent_task_id) { // Only for main tasks
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

      DeviceEventEmitter.emit('task_update');

    } catch (error) {
      console.error('Error toggling task:', error);
      // Revert optimism if needed
      fetchTasks();
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('latest');
    setFilterPriority('all');
    setShowFilters(false);
  };

  const renderItem = ({ item }: { item: UserTask }) => {
    const isCompleted = item.is_completed;
    const priorityColor = item.priority === 'high' ? colors.error : item.priority === 'medium' ? colors.warning : colors.success;

    return (
      <TouchableOpacity
        style={[styles.card, isCompleted && styles.cardCompleted]}
        onPress={() => router.push(`/tasks/${item.id}`)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={[styles.checkboxContainer, isCompleted && { opacity: 0.5 }]}
          onPress={() => toggleTaskCompletion(item)}
          disabled={isCompleted} // Disable interaction if completed
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isCompleted ? (
            <CheckCircle2 size={24} color={colors.primary} />
          ) : (
            <Circle size={24} color={colors.textLight} />
          )}
        </TouchableOpacity>

        <View style={styles.contentColumn}>
          <Text style={[styles.titleText, isCompleted && styles.textCompleted]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.bodyText, isCompleted && styles.textCompleted]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[styles.badgeText, { color: priorityColor }]}>{item.priority}</Text>
            </View>
            {item.due_date && (
              <Text style={styles.dateText}>
                {format(parseISO(item.due_date), 'p')}
              </Text>
            )}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagDot} />
            )}
            {item.tags && item.tags.slice(0, 2).map((tag, i) => (
              <Text key={i} style={styles.dateText}>#{tag}</Text>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>{format(new Date(), 'EEEE, MMM d')}</Text>
            <Text style={styles.headerSubtitle}>
              {tasks.filter(t => !t.is_completed).length} items pending
            </Text>
          </View>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <LayoutGrid size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <ScrollView contentContainerStyle={styles.listContent} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {Array.from({ length: 10 }).map((_, index) => (
              <View key={index}>
                <TaskCardShimmer />
                {index < 9 && <View style={styles.separator} />}
              </View>
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <CheckSquare size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No matching tasks found.' : 'No tasks for today.'}
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => {
                    clearFilters();
                    router.push('/tasks/create');
                  }}
                >
                  <Text style={styles.emptyButtonText}>Add New Task</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* FAB */}
        <View style={styles.fabWrapper} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => router.push('/tasks/create')}
          >
            <Plus size={24} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <KeyboardShiftView style={styles.bottomContainer}>

          {/* Search & Filters */}
          <View style={styles.bottomBar}>
            {showFilters && (
              <View style={styles.filterOptions}>
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Sort:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                    {(['latest', 'oldest', 'priority'] as SortOption[]).map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.chip, sortBy === opt && styles.chipActive]}
                        onPress={() => setSortBy(opt)}
                      >
                        <Text style={[styles.chipText, sortBy === opt && styles.chipTextActive]}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Priority:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                    {(['all', 'high', 'medium', 'low'] as FilterPriority[]).map(p => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.chip, filterPriority === p && styles.chipActive]}
                        onPress={() => setFilterPriority(p)}
                      >
                        <Text style={[styles.chipText, filterPriority === p && styles.chipTextActive]}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={20} color={colors.textLight} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tasks..."
                  placeholderTextColor={colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color={colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.filterBtn, (showFilters || filterPriority !== 'all' || sortBy !== 'latest') && styles.filterBtnActive]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Filter size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardShiftView>
      </View>
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textLight,
  },
  homeButton: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 100,
  },
  fab: {
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },

  bottomContainer: {
    justifyContent: 'flex-end',
    width: '100%',
    backgroundColor: colors.card,
    zIndex: 110,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 20 : spacing.md,
  },

  // Search & Filters
  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background, // Contrast against surface bottom bar
    paddingHorizontal: spacing.md,
    paddingVertical: 10, // Restored original height
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: 24, // Fix for text input clipping if any
    padding: 0,
  },
  filterBtn: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterBtnActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },

  // Filter Options
  filterOptions: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    width: 60,
  },
  chipsContainer: {
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 20, // Reduced since FAB is handled outside
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    // shadowColor: colors.shadow,
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.05,
    // shadowRadius: 2,
    // elevation: 1,
  },
  cardCompleted: {
    opacity: 0.6,
    backgroundColor: colors.background,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: spacing.sm,
  },
  contentColumn: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    color: colors.textLight,
  },
  tagDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textLight,
  },
  separator: {
    height: spacing.sm,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
