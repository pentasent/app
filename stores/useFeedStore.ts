import { create } from 'zustand';
import { Post, Community, Channel, CreatePostDTO } from '../types/database';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadImage } from '../utils/image-upload';

const POSTS_PER_PAGE = 20;

interface FeedState {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMorePosts: boolean;
  pendingPostsCount: number;
  lastNewPostTimestamp: number | null;
  communities: Community[];
  channels: Channel[];
  selectedCommunityId: string | null;
  lastCursor: string | null;
  
  // Basic Actions
  setPosts: (posts: Post[]) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setSelectedCommunityId: (id: string | null) => void;
  
  // Atomic Updates
  updatePost: (id: string, updates: Partial<Post>) => void;
  addPost: (post: Post) => void;
  removePost: (id: string) => void;
  resetPendingPosts: () => void;
  incrementPendingPosts: () => void;
  
  // Async Actions
  fetchPosts: (isRefresh?: boolean, silent?: boolean) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  fetchCommunitiesAndChannels: (userId: string) => Promise<void>;
  createPostAction: (user: any, dto: CreatePostDTO, communities: Community[]) => Promise<string>;
  likePostAction: (userId: string, postId: string) => Promise<void>;
  
  // Cache
  loadCache: () => Promise<void>;
  saveCache: () => Promise<void>;
  clearStore: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  loading: true,
  refreshing: false,
  loadingMore: false,
  hasMorePosts: true,
  pendingPostsCount: 0,
  lastNewPostTimestamp: null,
  communities: [],
  channels: [],
  selectedCommunityId: null,
  lastCursor: null,

  setPosts: (posts) => set({ posts }),
  setLoading: (loading) => set({ loading }),
  setRefreshing: (refreshing) => set({ refreshing }),
  
  setSelectedCommunityId: (id) => {
    set({ selectedCommunityId: id, posts: [], hasMorePosts: true, lastCursor: null, loading: true });
    get().fetchPosts();
  },

  updatePost: (id, updates) => set((state) => ({
    posts: state.posts.map((p) => (p.id === id || (p as any)._stableKey === id) ? { ...p, ...updates } : p)
  })),

  addPost: (post) => set((state) => {
     if (state.posts.some(p => p.id === post.id || ((post as any)._stableKey && (p as any)._stableKey === (post as any)._stableKey))) {
         return state;
     }
     return { posts: [post, ...state.posts] };
  }),

  removePost: (id) => set((state) => ({
    posts: state.posts.filter((p) => p.id !== id && (p as any)._stableKey !== id)
  })),

  resetPendingPosts: () => set({ pendingPostsCount: 0, lastNewPostTimestamp: null }),
  
  incrementPendingPosts: () => set((state) => ({
    pendingPostsCount: state.pendingPostsCount + 1,
    lastNewPostTimestamp: state.pendingPostsCount === 0 ? Date.now() : state.lastNewPostTimestamp
  })),

  fetchPosts: async (isRefresh = false, silent = false) => {
    const state = get();
    try {
        if (isRefresh && !silent) set({ refreshing: true });
        else if (!silent) set({ loading: true });

        if (isRefresh) {
            set({ lastCursor: null });
            get().resetPendingPosts();
        }

        let query = supabase
            .from('posts')
            .select('*, user:users(id, name, avatar_url), community:communities(id, name, logo_url), images:post_images(*)')
            .order('created_at', { ascending: false })
            .limit(POSTS_PER_PAGE);

        if (state.selectedCommunityId) {
            query = query.eq('community_id', state.selectedCommunityId);
        }

        // CURSOR PAGINATION LOGIC
        if (state.lastCursor && !isRefresh) {
            query = query.lt('created_at', state.lastCursor);
        }

        const { data, error } = await query;
        if (error) throw error;

        const newPosts = data || [];
        const nextCursor = newPosts.length > 0 ? newPosts[newPosts.length - 1].created_at : null;

        set((s) => ({
            posts: isRefresh ? newPosts : [...s.posts, ...newPosts],
            hasMorePosts: newPosts.length === POSTS_PER_PAGE,
            lastCursor: nextCursor,
            loading: false,
            refreshing: false
        }));

        if (isRefresh) get().saveCache();
    } catch (e) {
        console.error('[FETCH-POSTS-ERROR]:', e);
        set({ loading: false, refreshing: false });
    }
  },

  loadMorePosts: async () => {
    const { hasMorePosts, loadingMore, loading, refreshing } = get();
    if (!hasMorePosts || loadingMore || loading || refreshing) return;
    set({ loadingMore: true });
    await get().fetchPosts(false, true);
    set({ loadingMore: false });
  },

  fetchCommunitiesAndChannels: async (userId) => {
    try {
        const { data: follows } = await supabase.from('community_followers').select('community_id').eq('user_id', userId);
        const ids = follows?.map(f => f.community_id) || [];
        
        if (ids.length > 0) {
            const [commData, chanData] = await Promise.all([
                supabase.from('communities').select('*').in('id', ids),
                supabase.from('channels').select('*').in('community_id', ids)
            ]);
            set({ communities: commData.data || [], channels: chanData.data || [] });
        }
    } catch (e) {
        console.error('[FETCH-META-ERROR]:', e);
    }
  },

  likePostAction: async (userId, postId) => {
      const state = get();
      const post = state.posts.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.user_has_liked;
      const newCount = isLiked ? Math.max(0, (post.likes_count || 0) - 1) : (post.likes_count || 0) + 1;

      // Optimistic
      state.updatePost(postId, { likes_count: newCount, user_has_liked: !isLiked });

      try {
          if (isLiked) {
              await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
              await supabase.from('posts').update({ likes_count: newCount }).eq('id', postId);
          } else {
              await supabase.from('likes').insert({ post_id: postId, user_id: userId });
              await supabase.from('posts').update({ likes_count: newCount }).eq('id', postId);
          }
      } catch (e) {
          state.updatePost(postId, { likes_count: post.likes_count, user_has_liked: isLiked });
      }
  },

  createPostAction: async (user, dto, communities) => {
    const tempId = `temp-${Date.now()}`;
    const contentPayload = typeof dto.content === 'string'
        ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: dto.content.trim() }] }] }
        : dto.content;

    const tempImages = (dto.images || []).map((uri, i) => ({
        id: `temp-img-${Date.now()}-${i}`,
        image_url: uri,
        post_id: tempId,
        order_index: i
    }));

    const tempPost: any = {
        id: tempId,
        user_id: user.id,
        community_id: dto.community_id,
        title: dto.title || null,
        content: contentPayload,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        user: { id: user.id, name: user.name || 'Anonymous', avatar_url: user.avatar_url || null },
        community: communities.find(c => c.id === dto.community_id),
        images: tempImages,
        is_uploading: true,
        _stableKey: tempId
    };

    get().addPost(tempPost);

    try {
        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                community_id: dto.community_id,
                title: dto.title || null,
                content: contentPayload,
            })
            .select('*, user:users(id, name, avatar_url), community:communities(id, name, logo_url)')
            .single();

        if (postError) throw postError;

        if (dto.images && dto.images.length > 0) {
            const validInserts = await Promise.all(dto.images.map(async (localUri, index) => {
                const filename = `posts/${user.id}_${Date.now()}_${index}.jpg`;
                await uploadImage(localUri, filename);
                return { post_id: post.id, image_url: filename, order_index: index };
            }));
            await supabase.from('post_images').insert(validInserts);
            post.images = validInserts;
        }

        get().updatePost(tempId, { ...post, is_uploading: false });
        return post.id;
    } catch (e) {
        get().removePost(tempId);
        throw e;
    }
  },

  loadCache: async () => {
    try {
      const cached = await AsyncStorage.getItem('cached_feed_posts');
      if (cached) set({ posts: JSON.parse(cached), loading: false });
    } catch (e) {}
  },

  saveCache: async () => {
    try {
      const { posts } = get();
      await AsyncStorage.setItem('cached_feed_posts', JSON.stringify(posts.slice(0, 20)));
    } catch (e) {}
  },

  clearStore: () => {
    set({
      posts: [],
      loading: true,
      refreshing: false,
      loadingMore: false,
      hasMorePosts: true,
      pendingPostsCount: 0,
      lastNewPostTimestamp: null,
      communities: [],
      channels: [],
      selectedCommunityId: null,
      lastCursor: null,
    });
  }
}));
