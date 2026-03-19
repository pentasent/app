import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { useFeed } from '../../contexts/FeedContext';
import { PostCard } from '../../components/feed/PostCard';
import { colors } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Plus } from 'lucide-react-native';
import { CreatePostDialog } from '../../components/feed/CreatePostDialog';
import { EditPostDialog } from '../../components/feed/EditPostDialog';
import { FeedHeader } from '../../components/feed/FeedHeader';
import { FeedPostShimmer } from '../../components/shimmers/FeedPostShimmer';
import { useAuth } from '../../contexts/AuthContext';
import { parseContent } from '../../utils/content';
import { Toast } from '@/components/Toast';

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
  
  // Edit State
  const [editingPost, setEditingPost] = React.useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  
  // Import supabase from AuthContext
  const { supabase } = require('../../contexts/AuthContext');
  
  // Actually, I'll just use the context updatePost for now or implement edit in context if I want to be thorough.
  // For now I'll just handle it here similar to how [id].tsx did but slightly cleaner.
  
  const handleCreatePost = async (dto: any) => {
    try {
      await createPost(dto);
      setToastType('success');
      setToastMsg('Post created successfully');
    } catch (e) {
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
    } catch (e) {
      setToastType('error');
      console.error(e);
      throw e;
    }
  };

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
      <Toast
        message={toastMsg}
        onHide={() => setToastMsg(null)}
        type={toastType}
      />
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
        onSubmit={handleCreatePost}
        communities={communities}
        channels={channels}
      />

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
