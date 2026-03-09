import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, CheckCircle, Circle, Camera } from 'lucide-react-native';
import { useApp } from '../../contexts/AppContext';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function RoutineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { routines, updateRoutineTask } = useApp();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const routine = routines.find((r) => r.id === id);

  if (!routine) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Routine not found</Text>
      </SafeAreaView>
    );
  }

  const allTasksComplete = routine.tasks.every((task) => task.completed);

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    updateRoutineTask(routine.id, taskId, completed);

    const updatedRoutine = routines.find((r) => r.id === id);
    if (updatedRoutine) {
      const allComplete = updatedRoutine.tasks.every((t) =>
        t.id === taskId ? completed : t.completed
      );
      if (allComplete) {
        setTimeout(() => setShowUpload(true), 500);
      }
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setTimeout(() => {
        setUploadComplete(true);
        Alert.alert('Great Progress!', 'Keep going, your skin will thank you! This will be improved in the next update.');
      }, 1000);
    }
  };

  const calculateProgress = () => {
    const completedTasks = routine.tasks.filter((t) => t.completed).length;
    return {
      completed: completedTasks,
      total: routine.tasks.length,
      percentage: (completedTasks / routine.tasks.length) * 100,
    };
  };

  const progress = calculateProgress();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{routine.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Your Progress</Text>
          <Text style={styles.progressSubtitle}>
            {progress.completed} of {progress.total} tasks completed
          </Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress.percentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressPercentage}>
            {progress.percentage.toFixed(0)}% Complete
          </Text>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>About this routine</Text>
          <Text style={styles.descriptionText}>{routine.description}</Text>
        </View>

        <Text style={styles.tasksTitle}>Daily Tasks</Text>

        {routine.tasks.map((task, index) => (
          <Animated.View key={task.id} entering={FadeIn.delay(index * 50)}>
            <TouchableOpacity
              style={[
                styles.taskCard,
                task.completed && styles.taskCardCompleted,
              ]}
              onPress={() => handleTaskToggle(task.id, !task.completed)}
              activeOpacity={0.7}
            >
              <View style={styles.taskCheckbox}>
                {task.completed ? (
                  <CheckCircle size={24} color={colors.secondary} strokeWidth={2} />
                ) : (
                  <Circle size={24} color={colors.textMuted} strokeWidth={2} />
                )}
              </View>
              <View style={styles.taskContent}>
                <Text
                  style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleCompleted,
                  ]}
                >
                  {task.title}
                </Text>
                <Text style={styles.taskDay}>Day {task.day}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {showUpload && !uploadComplete && (
          <Animated.View entering={FadeIn} style={styles.uploadCard}>
            <Text style={styles.uploadTitle}>All tasks completed!</Text>
            <Text style={styles.uploadText}>
              Upload a progress photo to track your improvement
            </Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickImage}
            >
              <Camera size={24} color={colors.surface} strokeWidth={2} />
              <Text style={styles.uploadButtonText}>Upload Photo</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {uploadComplete && (
          <Animated.View entering={FadeIn} style={styles.completeCard}>
            <CheckCircle size={48} color={colors.secondary} strokeWidth={2} />
            <Text style={styles.completeTitle}>Excellent Work!</Text>
            <Text style={styles.completeText}>
              Keep going, your skin will thank you! This will be improved in the next update.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    // paddingVertical: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  progressTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  progressSubtitle: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
  },
  progressPercentage: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  descriptionCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  descriptionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  descriptionText: {
    ...typography.bodySmall,
    color: colors.textLight,
    lineHeight: 20,
  },
  tasksTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  taskCardCompleted: {
    backgroundColor: colors.secondaryLight,
  },
  taskCheckbox: {
    marginRight: spacing.md,
    paddingTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  taskTitleCompleted: {
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  taskDay: {
    ...typography.caption,
    color: colors.textMuted,
  },
  uploadCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  uploadTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  uploadText: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  uploadButtonText: {
    ...typography.button,
    color: colors.surface,
    marginLeft: spacing.sm,
  },
  completeCard: {
    backgroundColor: colors.secondaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  completeTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  completeText: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
  },
});
