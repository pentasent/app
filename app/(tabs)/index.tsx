import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useFeed } from '../../contexts/FeedContext';
import { PostCard } from '../../components/feed/PostCard';
import { colors } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Plus } from 'lucide-react-native';
import { CreatePostDialog } from '../../components/feed/CreatePostDialog';
import { FeedHeader } from '../../components/feed/FeedHeader';
import { FeedPostShimmer } from '../../components/shimmers/FeedPostShimmer';
import { useAuth } from '../../contexts/AuthContext';

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
    refreshSinglePost
  } = useFeed();

  const { user } = useAuth();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const router = useRouter();
  const lastVisitedPostId = React.useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (lastVisitedPostId.current) {
        refreshSinglePost(lastVisitedPostId.current);
        lastVisitedPostId.current = null;
      }
    }, [refreshSinglePost])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading && !refreshing && posts.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <FeedHeader
            user={user}
            communities={communities}
            selectedCommunityId={selectedCommunityId}
            onSelectCommunity={setSelectedCommunityId}
            onProfilePress={() => router.push(`/profile`)}
          />
          <View style={{ height: 2, backgroundColor: colors.borderLight }} />
          {[1, 2, 3].map((key) => (
            <React.Fragment key={key}>
              <FeedPostShimmer />
              <View style={{ height: 2, backgroundColor: colors.borderLight }} />
            </React.Fragment>
          ))}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          stickyHeaderIndices={[0]}
          ItemSeparatorComponent={() => (
            <View style={{ height: 2, backgroundColor: colors.borderLight }} />
          )}
          ListHeaderComponent={
            <FeedHeader
              user={user}
              communities={communities}
              selectedCommunityId={selectedCommunityId}
              onSelectCommunity={setSelectedCommunityId}
              onProfilePress={() => router.push(`/profile`)}
            />
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => {
                lastVisitedPostId.current = item.id;
                viewPost(item.id);
                router.push(`/post/${item.id}`);
              }}
              onLike={() => likePost(item.id)}
              onComment={() => {
                lastVisitedPostId.current = item.id;
                router.push(`/post/${item.id}`);
              }}
              onShare={() => sharePost(item)}
              onMore={() => { }} // Optional now as we moved share
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
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
        onSubmit={createPost}
        communities={communities}
        channels={channels}
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
});
