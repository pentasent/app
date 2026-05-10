import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase, useAuth } from './AuthContext';
import { Post, CreatePostDTO, Community, Channel } from '../types/database';
import { Alert, Share } from 'react-native';
import { useFeedStore } from '../stores/useFeedStore';

interface FeedContextType {
    posts: Post[];
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    hasMorePosts: boolean;
    onRefresh: () => void;
    refreshFeed: () => Promise<void>;
    loadMorePosts: () => Promise<void>;
    createPost: (dto: CreatePostDTO) => Promise<string | undefined>;
    likePost: (postId: string) => Promise<void>;
    updatePost: (postId: string, changes: Partial<Post>) => void;
    removePost: (postId: string) => void;
    sharePost: (post: Post) => Promise<void>;
    viewPost: (postId: string) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    refreshSinglePost: (postId: string) => Promise<void>;
    pendingPostsCount: number;
    resetPendingPosts: () => void;
    fetchPendingPosts: () => Promise<void>;
    lastNewPostTimestamp: number | null;
    communities: Community[];
    channels: Channel[];
    selectedCommunityId: string | null;
    setSelectedCommunityId: (id: string | null) => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isRealtimeReady } = useAuth();
    const router = useRouter();
    
    // Connect to Store
    const store = useFeedStore();

    useEffect(() => {
        store.loadCache();
    }, []);

    useEffect(() => {
        if (!user) return;
        store.fetchCommunitiesAndChannels(user.id);
        store.fetchPosts(true, store.posts.length > 0);
    }, [user?.id]);

    // Real-time Subscription (Optimized: Scoped to selected community or followed list)
    useEffect(() => {
        if (!user || !isRealtimeReady) return;

        // Scoped Channel: Only listen to changes that matter to the current view
        // For now, we listen to all posts but handle logic based on selectedCommunityId
        const channelName = store.selectedCommunityId ? `posts:${store.selectedCommunityId}` : 'posts:global';
        
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'posts',
                filter: store.selectedCommunityId ? `community_id=eq.${store.selectedCommunityId}` : undefined
            }, (payload) => {
                if (payload.new.user_id !== user.id) {
                    store.incrementPendingPosts();
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
                store.updatePost(payload.new.id, payload.new);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
                store.removePost(payload.old.id);
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id, isRealtimeReady, store.selectedCommunityId]);

    const createPost = async (dto: CreatePostDTO) => {
        if (!user) return;
        try {
            return await store.createPostAction(user, dto, store.communities);
        } catch (e) {
            Alert.alert("Error", "Failed to create post.");
        }
    };

    const likePost = async (postId: string) => {
        if (!user) return;
        await store.likePostAction(user.id, postId);
    };

    const deletePost = async (postId: string) => {
        // Implementation remains similar but uses store for state
        const originalPosts = [...store.posts];
        store.removePost(postId);
        
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
        } catch (e) {
            store.setPosts(originalPosts);
            Alert.alert("Error", "Failed to delete post.");
        }
    };

    const viewPost = async (postId: string) => {
        const post = store.posts.find(p => p.id === postId);
        if (!post) return;
        const newViewsCount = (post.views_count || 0) + 1;
        store.updatePost(postId, { views_count: newViewsCount });
        await supabase.from('posts').update({ views_count: newViewsCount }).eq('id', postId);
    };

    const sharePost = async (post: Post) => {
        try {
            await Share.share({
                message: `Check out this post on Pentasent: ${post.title || 'Community Post'}\n\nhttps://pentasent.com/post/${post.id}`,
            });
        } catch (e) {}
    };

    const refreshSinglePost = async (postId: string) => {
        const { data } = await supabase.from('posts').select('*, user:users(id, name, avatar_url), community:communities(id, name, logo_url), images:post_images(*)').eq('id', postId).single();
        if (data) store.updatePost(postId, data);
    };

    const value: FeedContextType = {
        posts: store.posts,
        loading: store.loading,
        refreshing: store.refreshing,
        loadingMore: store.loadingMore,
        hasMorePosts: store.hasMorePosts,
        onRefresh: () => store.fetchPosts(true),
        refreshFeed: () => store.fetchPosts(true),
        loadMorePosts: store.loadMorePosts,
        createPost,
        likePost,
        updatePost: store.updatePost,
        removePost: store.removePost,
        sharePost,
        viewPost,
        deletePost,
        refreshSinglePost,
        pendingPostsCount: store.pendingPostsCount,
        resetPendingPosts: store.resetPendingPosts,
        fetchPendingPosts: () => store.fetchPosts(true), // Simplified
        lastNewPostTimestamp: store.lastNewPostTimestamp,
        communities: store.communities,
        channels: store.channels,
        selectedCommunityId: store.selectedCommunityId,
        setSelectedCommunityId: store.setSelectedCommunityId,
    };

    return (
        <FeedContext.Provider value={value}>
            {children}
        </FeedContext.Provider>
    );
};

export const useFeed = () => {
    const context = useContext(FeedContext);
    if (context === undefined) throw new Error('useFeed must be used within a FeedProvider');
    return context;
};
