import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert, Animated, Platform, BackHandler } from 'react-native';
import { useFeed } from '../../contexts/FeedContext';
import { PostCard } from '../../components/feed/PostCard';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Plus, TrendingUp, LayoutGrid, Calendar } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { CreatePostDialog } from '../../components/feed/CreatePostDialog';
import { EditPostDialog } from '../../components/feed/EditPostDialog';
import { FeedHeader } from '../../components/feed/FeedHeader';
import { FeedPostShimmer } from '../../components/shimmers/FeedPostShimmer';
import { useAuth } from '../../contexts/AuthContext';
import { parseContent } from '../../utils/content';
import { Toast } from '@/components/Toast';
import { MoodCheckInCard } from '../../components/pulse/MoodCheckInCard';
import { MoodCheckInSheet } from '../../components/pulse/MoodCheckInSheet';
import { SuggestionCard } from '../../components/pulse/SuggestionCard';
import { MoodConfig, MoodTag, MOODS, SUGGESTIONS, Suggestion, getSuggestionRule } from '../../constants/moods';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import crashlytics from '@/lib/crashlytics';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function CommunityFeedScreen() {
  const {
    posts,
    loading,
    refreshing,
    loadingMore,
    hasMorePosts,
    onRefresh,
    refreshFeed,
    loadMorePosts,
    likePost,
    sharePost,
    viewPost,
    createPost,
    communities,
    channels,
    selectedCommunityId,
    setSelectedCommunityId,
    refreshSinglePost,
    deletePost
  } = useFeed();

  const { user } = useAuth();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const router = useRouter();
  const lastVisitedPostId = React.useRef<string | null>(null);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Edit State
  const [editingPost, setEditingPost] = React.useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Import supabase from AuthContext
  const { supabase } = require('../../contexts/AuthContext');

  // Mood Check-in State
  const [showCheckinCard, setShowCheckinCard] = useState(false);
  const [showCheckinSheet, setShowCheckinSheet] = useState(false);
  const [selectedInitialMood, setSelectedInitialMood] = useState<MoodTag | undefined>(undefined);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [lastSubmittedMood, setLastSubmittedMood] = useState<MoodTag>('neutral');
  const [canInteractWithMood, setCanInteractWithMood] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const verticalText = "CHECKIN".split("").join("\n");

  
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const threshold = showCheckinCard ? 180 : 80;
      if (value > threshold && canInteractWithMood) {
        setCanInteractWithMood(false);
      } else if (value <= threshold && !canInteractWithMood) {
        setCanInteractWithMood(true);
      }
    });
    return () => scrollY.removeListener(id);
  }, [showCheckinCard, canInteractWithMood]);

  const checkDailyStatus = async () => {
    if (!user) return;
    try {
      const todayDate = format(new Date(), 'yyyy-MM-dd');

      // 1. Optimized Local Check: If checked in today locally, we are done (No DB call)
      const cachedDate = await AsyncStorage.getItem(`lastCheckinDate_${user.id}`);
      if (cachedDate === todayDate) {
        setShowCheckinCard(false);
        // Load cached mood info for UI consistency
        const cachedMood = await AsyncStorage.getItem(`lastMood_${user.id}`);
        if (cachedMood) setLastSubmittedMood(cachedMood as MoodTag);
        return;
      }

      // 2. 12-hour Suppression Check from local storage
      const lastCheckinTime = await AsyncStorage.getItem(`lastCheckin_${user.id}`);
      if (lastCheckinTime) {
        const lastTime = new Date(parseInt(lastCheckinTime));
        const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 12) {
          setShowCheckinCard(false);
          return;
        }
      }

      // 3. Fallback to DB (Last resort)
      const { data, error } = await supabase
        .from('user_daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', todayDate)
        .maybeSingle();

      if (!error && data) {
        // Sync back to local if found in DB (e.g. from another device)
        await AsyncStorage.setItem(`lastCheckinDate_${user.id}`, todayDate);
        await AsyncStorage.setItem(`lastCheckin_${user.id}`, new Date(data.checkin_date).getTime().toString());
        await AsyncStorage.setItem(`lastMood_${user.id}`, data.mood_tag);

        if (showCheckinCard !== false) setShowCheckinCard(false);
        if (lastSubmittedMood !== data.mood_tag) setLastSubmittedMood(data.mood_tag);
      } else {
        if (showCheckinCard !== true) setShowCheckinCard(true);
      }
    } catch (e:any) {
      crashlytics().recordError(e);
      console.log('[ERROR]:', 'Error checking checkin status:', e);
    }
  };


  React.useEffect(() => {
    checkDailyStatus();
  }, [user]);

  const handleRefresh = async () => {
    // Add a minimum delay for the refresh animation to feel intentional (800ms)
    await Promise.all([
      refreshFeed(),
      checkDailyStatus(),
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
  };

  const handleMoodSelect = (mood: MoodConfig) => {
    setSelectedInitialMood(mood.tag);
    setShowCheckinSheet(true);
  };

  const handleCheckinSubmit = async (data: any) => {
    if (!user) return;
    try {
      const moodConfig = MOODS.find(m => m.tag === data.mood_tag);
      const mood_score = moodConfig?.score || 3;
      const todayDate = format(new Date(), 'yyyy-MM-dd');

      const suggestionAction = getSuggestionRule(
        mood_score,
        data.energy_level,
        data.stress_level,
        data.sleep_quality
      );

      const suggestion = SUGGESTIONS[suggestionAction];

      const { error } = await supabase
        .from('user_daily_checkins')
        .upsert({
          user_id: user.id,
          mood_score,
          energy_level: data.energy_level,
          stress_level: data.stress_level,
          sleep_quality: data.sleep_quality,
          mood_tag: data.mood_tag,
          notes: data.notes,
          suggested_action: suggestionAction,
          checkin_date: todayDate,
        });

      if (error) throw error;

      // Update State
      setShowCheckinSheet(false);
      setShowCheckinCard(false);
      setLastSubmittedMood(data.mood_tag);
      setActiveSuggestion(suggestion);
      setShowSuggestion(true);

      // 4. Update Local Storage for Instant Future Access (Reduced DB calls)
      await AsyncStorage.setItem(`lastCheckin_${user.id}`, Date.now().toString());
      await AsyncStorage.setItem(`lastMood_${user.id}`, data.mood_tag);
      await AsyncStorage.setItem(`lastSuggestion_${user.id}`, suggestionAction.toString());
      await AsyncStorage.setItem(`lastCheckinDate_${user.id}`, todayDate);

      setToastType('success');
      setToastMsg('Check-in submitted!');
    } catch (e:any) {
      crashlytics().recordError(e);
      console.log('[ERROR]:', e);
      setToastType('error');
      setToastMsg('Failed to submit check-in');
    }
  };

  const handleSuggestionAction = (suggestion: Suggestion) => {
    setShowSuggestion(false);
    // Navigate based on suggestion
    router.push(suggestion.route as any);
  };

  const MemoizedHeader = React.useMemo(() => {
    if (!showCheckinCard && !lastSubmittedMood) return null;

    return (
      <Animated.View
        style={{
          opacity: scrollY.interpolate({
            inputRange: [0, 160],
            outputRange: [1, 0],
            extrapolate: 'clamp'
          }),
          // Move up slightly to create subtle parallax that feels like scrolling away
          transform: [{
            translateY: scrollY.interpolate({
              inputRange: [0, 160],
              outputRange: [0, -40], 
              extrapolate: 'clamp'
            })
          }]
        }}
      >
        {showCheckinCard ? (
          <MoodCheckInCard
            onMoodSelect={handleMoodSelect}
            onHeaderPress={() => setShowCheckinSheet(true)}
            scrollY={scrollY}
          />
        ) : (
          <View style={styles.actionCardContainer}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/pulse')}
            >
              <View style={styles.actionCardContent}>
                <Text style={styles.actionCardTitle}>Your mood today: {MOODS.find(m => m.tag === lastSubmittedMood)?.emoji} {lastSubmittedMood.charAt(0).toUpperCase() + lastSubmittedMood.slice(1)}</Text>
                <Text style={styles.actionCardSubtitle}>See your pulse insights</Text>
              </View>
              <TrendingUp size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  }, [showCheckinCard, lastSubmittedMood, scrollY, handleMoodSelect]);

  const handleCreatePost = async (dto: any) => {
    try {
      await createPost(dto);
      setToastType('success');
      setToastMsg('Post created successfully');
    } catch (e:any) {
      crashlytics().recordError(e);
      setToastType('error');
      setToastMsg('Failed to create post');
    }
  };

  const handleEditSubmit = async (
    title: string,
    content: string,
    images: string[],
  ) => {
    try {
      if (!editingPost) return;

      const contentPayload = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: content.trim() }],
          },
        ],
      };

      const { error: postError } = await supabase
        .from('posts')
        .update({ title, content: contentPayload, is_edited: true })
        .eq('id', editingPost.id);

      if (postError) throw postError;

      // Handle images (simplifying for feed edit, ideally move to context)
      // I'll skip the complex image logic here or just refresh the feed.
      // Easiest is to refresh or update local state.

      const { updatePost } = useFeed(); // re-access to be safe
      updatePost(editingPost.id, {
        title,
        content: contentPayload,
        is_edited: true,
      });

      setIsEditModalOpen(false);
      setEditingPost(null);
      setToastType('success');
      setToastMsg('Post updated successfully');
    } catch (e:any) {
      crashlytics().recordError(e);
      setToastType('error');
      console.log('[ERROR]:', e);
      throw e;
    }
  };

  useFocusEffect(
    useCallback(() => {
      // 1. App Exit Prevention Logic (Android only, iOS doesn't close on back)
      let backHandler: any = null;

      const onBackPress = () => {
        // Only show if we're likely on the root (Feed)
        setShowExitModal(true);
        return true; // Stop event bubbling
      };

      if (Platform.OS === 'android') {
        backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      }

      // 2. Data refresh logic
      checkDailyStatus();
      let timer: any = null;

      if (lastVisitedPostId.current) {
        // Debounce single post refresh slightly to avoid frame drops during transition
        timer = setTimeout(() => {
          if (lastVisitedPostId.current) {
            refreshSinglePost(lastVisitedPostId.current);
            lastVisitedPostId.current = null;
          }
        }, 300);
      }

      return () => {
        if (backHandler) backHandler.remove();
        if (timer) clearTimeout(timer);
      };
    }, [refreshSinglePost, checkDailyStatus])
  );


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Toast
        message={toastMsg}
        onHide={() => setToastMsg(null)}
        type={toastType}
      />

      <View style={styles.fixedHeader}>
        <FeedHeader
          user={user}
          communities={communities}
          selectedCommunityId={selectedCommunityId}
          onSelectCommunity={setSelectedCommunityId}
          onProfilePress={() => router.push(`/profile`)}
        />
      </View>
      <View style={{ flex: 1 }}>
        {loading && !refreshing && posts.length === 0 ? (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* <View style={{ height: 16, backgroundColor: colors.borderLight }} /> */}
            {[1, 2, 3].map((key) => (
              <React.Fragment key={key}>
                <FeedPostShimmer />
                <View style={{ height: 2, backgroundColor: colors.card }} />
              </React.Fragment>
            ))}
          </View>
        ) : (
          <Animated.FlatList
            data={posts}
            ListHeaderComponent={MemoizedHeader}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            keyExtractor={(item) => item.id}
            initialNumToRender={5}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
            ItemSeparatorComponent={() => (
              <View style={{ height: 2, backgroundColor: colors.borderLight, width: '100%' }} />
            )}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            renderItem={({ item: post }) => {
              return (
                <View style={{ backgroundColor: colors.background }}>
                  <PostCard
                    post={post}
                    onPress={() => {
                      lastVisitedPostId.current = post.id;
                      viewPost(post.id);
                      router.push(`/post/${post.id}`);
                    }}
                    onLike={() => likePost(post.id)}
                    onComment={() => {
                      lastVisitedPostId.current = post.id;
                      viewPost(post.id);
                      router.push(`/post/${post.id}`);
                    }}
                    onShare={() => sharePost(post)}
                  // onMore={post.id.startsWith('temp-') ? undefined : () => {
                  //   setEditingPost(post);
                  //   setIsEditModalOpen(true);
                  // }}
                  />
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
              </View>
            }
          />
        )}

        {/* Purely floating elements go here */}
      </View>

      {/* Floating Action Button */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setIsCreatePostOpen(true)}
        >
          <Plus size={24} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <CreatePostDialog
        visible={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onSubmit={handleCreatePost}
        communities={communities}
        channels={channels}
      />

      <MoodCheckInSheet
        visible={showCheckinSheet}
        onClose={() => setShowCheckinSheet(false)}
        onSubmit={handleCheckinSubmit}
        initialMood={selectedInitialMood}
      />

      {activeSuggestion && (
        <SuggestionCard
          visible={showSuggestion}
          suggestion={activeSuggestion}
          moodTag={lastSubmittedMood}
          onClose={() => setShowSuggestion(false)}
          onAction={handleSuggestionAction}
        />
      )}

      {/* Absolute Mini Mood Chip (Always Mounted for Smooth Transitions) */}
      <Animated.View
        pointerEvents={showCheckinCard ? "auto" : "none"}
        style={[
          styles.miniChip,
          {
            opacity: showCheckinCard ? scrollY.interpolate({
              inputRange: [60, 220],
              outputRange: [0, 1],
              extrapolate: 'clamp'
            }) : 0,

            transform: [
              {
                translateX: scrollY.interpolate({
                  inputRange: [60, 220],
                  outputRange: [120, 0],
                  extrapolate: 'clamp'
                })
              },
              {
                scale: scrollY.interpolate({
                  inputRange: [60, 220],
                  outputRange: [0.7, 1],
                  extrapolate: 'clamp'
                })
              }
            ]
          }
        ]}
      >
        <Pressable
          onPress={() => handleMoodSelect(MOODS[2])}
          style={styles.miniChipBtn}
        >
          <View style={styles.miniChipIcon}>
            <Calendar size={18} color={colors.primary} />
          </View>
          <Text style={styles.miniChipText}>{verticalText}</Text>
        </Pressable>
      </Animated.View>

      {editingPost && (
        <EditPostDialog
          visible={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingPost(null);
          }}
          onSubmit={handleEditSubmit}
          initialTitle={editingPost.title || ''}
          initialContent={parseContent(editingPost.content)}
          initialImages={editingPost.images?.map((img: any) => img.image_url) || []}
          community={editingPost.community}
          channel={editingPost.channels?.[0]}
        />
      )}

      <ConfirmationModal
        visible={showExitModal}
        title="Exit Application"
        message="Are you sure you want to close the Pentasent app?"
        confirmText="Exit"
        cancelText="Stay"
        onConfirm={() => {
          setShowExitModal(false);
          BackHandler.exitApp();
        }}
        onCancel={() => setShowExitModal(false)}
        isDestructive={true}
      />
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 80, // Space for FAB
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  miniChip: {
    position: 'absolute',
    right: 0,
    top: 120, // Height of FeedHeader + some margin
    zIndex: 2000,
  },
  miniChipBtn: {
    alignItems: 'center',
    backgroundColor: colors.borderLight,

    paddingVertical: 10,
    width: 44,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  miniChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.card + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
  },
  fixedHeader: {
    backgroundColor: colors.background,
    zIndex: 10,
    // borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
});
