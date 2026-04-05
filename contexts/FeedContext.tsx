import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase, useAuth } from './AuthContext';
import { Post, CreatePostDTO, Community, Channel } from '../types/database';
import { Alert, Share } from 'react-native';
import { uploadImage } from '../utils/image-upload';

interface FeedContextType {
    posts: Post[];
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    hasMorePosts: boolean;
    onRefresh: () => void;
    refreshFeed: () => Promise<void>;
    loadMorePosts: () => Promise<void>;
    createPost: (dto: CreatePostDTO) => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    updatePost: (postId: string, changes: Partial<Post>) => void;
    removePost: (postId: string) => void;
    sharePost: (post: Post) => Promise<void>;
    viewPost: (postId: string) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    refreshSinglePost: (postId: string) => Promise<void>;
    communities: Community[];
    channels: Channel[];
    selectedCommunityId: string | null;
    setSelectedCommunityId: (id: string | null) => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const POSTS_PER_PAGE = 20;
    const [communities, setCommunities] = useState<Community[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

    const fetchCommunitiesAndChannels = async () => {
        try {
            if (!user) {
                setCommunities([]);
                setChannels([]);
                return;
            }

            const { data: sessionData } = await supabase.auth.getSession();
            console.log("SESSION:", sessionData.session);

            // 1. Fetch Followed Communities
            const { data: commFollowData } = await supabase
                .from('community_followers')
                .select('community_id')
                .eq('user_id', user.id);

            const followedCommunityIds = commFollowData?.map(f => f.community_id) || [];

            if (followedCommunityIds.length > 0) {
                const { data: commData } = await supabase
                    .from('communities')
                    .select('*')
                    .in('id', followedCommunityIds);
                if (commData) setCommunities(commData);
            } else {
                setCommunities([]);
            }

            // 2. Fetch Channels for Followed Communities OR Followed Channels explicitly
            // For simplicity, we can fetch all channels of the followed communities
            if (followedCommunityIds.length > 0) {
                const { data: chanData } = await supabase
                    .from('channels')
                    .select('*')
                    .in('community_id', followedCommunityIds);
                if (chanData) setChannels(chanData);
            } else {
                setChannels([]);
            }

        } catch (e) {
            console.log('[ERROR]:', "Error fetching metadata", e);
        }
    };

    const fetchPosts = useCallback(async (pageNumber: number = 0, isRefresh: boolean = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else if (pageNumber > 0) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            // Strict Supabase Fetch
            let query = supabase
                .from('posts')
                .select(`
            *,
            user:users(id, name, avatar_url),
            community:communities(id, name, logo_url),
            images:post_images(*)
          `)
                .order('created_at', { ascending: false })
                .range(pageNumber * POSTS_PER_PAGE, (pageNumber + 1) * POSTS_PER_PAGE - 1);

            if (selectedCommunityId) {
                query = query.eq('community_id', selectedCommunityId);
            } else if (user) {
                // Fetch followed communities
                const { data: commFollows } = await supabase
                    .from('community_followers')
                    .select('community_id')
                    .eq('user_id', user.id);

                const followedCommunityIds = commFollows?.map(f => f.community_id) || [];

                // For simplicity, we filter only by followed communities (channels usually imply following the community)
                if (followedCommunityIds.length > 0) {
                    query = query.in('community_id', followedCommunityIds);
                } else {
                    // Force empty result if following nothing by short-circuiting the fetch entirely
                    // to avoid invalid UUID syntax errors in Supabase.
                    if (isRefresh || pageNumber === 0) setPosts([]);
                    setRefreshing(false);
                    setLoadingMore(false);
                    setLoading(false);
                    setHasMorePosts(false);
                    return;
                }
            }

            let { data, error } = await query;

            if (error) {
                // Check for PGRST200: Could not find a relationship between 'posts' and 'post_images'
                if (error.code === 'PGRST200') {
                    console.warn('Relationship between posts and post_images not found, falling back to query without images.');
                    let fallbackQuery = supabase
                        .from('posts')
                        .select(`
                            *,
                            user:users(id, name, avatar_url),
                            community:communities(id, name, logo_url)
                        `)
                        .order('created_at', { ascending: false })
                        .range(pageNumber * POSTS_PER_PAGE, (pageNumber + 1) * POSTS_PER_PAGE - 1);

                    if (selectedCommunityId) {
                        fallbackQuery = fallbackQuery.eq('community_id', selectedCommunityId);
                    } else if (user) {
                        const { data: commFollows } = await supabase
                            .from('community_followers')
                            .select('community_id')
                            .eq('user_id', user.id);
                        const followedCommunityIds = commFollows?.map(f => f.community_id) || [];
                        if (followedCommunityIds.length > 0) {
                            fallbackQuery = fallbackQuery.in('community_id', followedCommunityIds);
                        }
                    }

                    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
                    if (fallbackError) throw fallbackError;
                    data = fallbackData;
                } else {
                    throw error;
                }
            };

            let postsWithLikes = data || [];

            if (user && data && data.length > 0) {
                const postIds = data.map(p => p.id);
                const { data: likesData } = await supabase
                    .from('likes')
                    .select('post_id')
                    .eq('user_id', user.id)
                    .in('post_id', postIds);

                const likedPostIds = new Set(likesData?.map(l => l.post_id) || []);

                postsWithLikes = data.map(p => ({
                    ...p,
                    user_has_liked: likedPostIds.has(p.id)
                }));
            }

            if (pageNumber === 0) {
                setPosts(postsWithLikes as any);
            } else {
                setPosts(prev => [...prev, ...postsWithLikes as any]);
            }

            setHasMorePosts(data?.length === POSTS_PER_PAGE);
            setPage(pageNumber);

        } catch (error) {
            console.log('[ERROR]:', 'Error fetching posts:', error);
            // No mock fallback
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [user, selectedCommunityId]);

    const loadMorePosts = async () => {
        if (!hasMorePosts || loadingMore || loading || refreshing) return;
        await fetchPosts(page + 1);
    };

    const createPost = async (dto: CreatePostDTO) => {
        if (!user) return;

        const tempId = `temp-${Date.now()}`;
        
        // Construct JSONB content payload
        const contentPayload = typeof dto.content === 'string'
            ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: dto.content.trim() }] }] }
            : dto.content;

        // Optimistic UI Update
        // Create optimistic images list
        const tempImages = (dto.images || []).map((uri, i) => ({
            id: `temp-img-${Date.now()}-${i}`,
            image_url: uri,
            post_id: tempId,
            order_index: i
        }));
        
        const tempPost: Post = {
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
            user: { id: user.id, name: user.name || 'Anonymous', avatar_url: user.avatar_url || null } as any,
            community: communities.find(c => c.id === dto.community_id) as any,
            images: tempImages as any,
            is_uploading: true,
            local_image_urls: dto.images || [],
            is_edited: false
        };

        setPosts(prev => [tempPost, ...prev]);

        // Background Process
        (async () => {
            try {
                // 1. Insert Post
                const { data: post, error: postError } = await supabase
                    .from('posts')
                    .insert({
                        user_id: user.id,
                        community_id: dto.community_id,
                        title: dto.title || null,
                        content: contentPayload,
                        country: dto.country || 'India',
                    })
                    .select(`
                        *,
                        user:users(id, name, avatar_url),
                        community:communities(id, name, logo_url)
                    `)
                    .single();

                if (postError) throw postError;

                // 2. Upload and Insert Images
                if (dto.images && dto.images.length > 0) {
                    const uploadPromises = dto.images.map(async (localUri, index) => {
                        if (localUri.startsWith('file') || localUri.startsWith('content')) {
                            const filename = `posts/${user.id}_${Date.now()}_${index}.jpg`;
                            
                            await uploadImage(localUri, filename);
                            
                            return {
                                post_id: post.id,
                                image_url: filename,
                                order_index: index
                            };
                        }
                        return { post_id: post.id, image_url: localUri, order_index: index };
                    });

                    const imageInserts = await Promise.all(uploadPromises);
                    const { error: imgError } = await supabase.from('post_images').insert(imageInserts);
                    if (imgError) console.log('[ERROR]:', "Error inserting images", imgError);
                    
                    post.images = imageInserts;
                }

                // 3. Channels
                if (dto.channel_ids && dto.channel_ids.length > 0) {
                    const channelInserts = dto.channel_ids.map(channelId => ({
                        post_id: post.id,
                        channel_id: channelId
                    }));
                    await supabase.from('post_channels').insert(channelInserts);
                }

                // Replace optimistic post with real data and clear uploading flag
                setPosts(current => current.map(p => p.id === tempId ? { ...tempPost, ...post, is_uploading: false, _tempId: tempId } : p));

            } catch (error) {
                console.log('[ERROR]:', 'Background Create Post Error:', error);
                // Remove temp post on failure
                setPosts(current => current.filter(p => p.id !== tempId));
                Alert.alert("Error", "Failed to create post. Please try again.");
            }
        })();
    };

    const deletePost = async (postId: string) => {
        // Capture original state for potential revert
        const originalPosts = [...posts];
        const postToDelete = posts.find(p => p.id === postId || (p as any)._tempId === postId);
        const resolvedId = postToDelete?.id || postId;

        // 1. Optimistic UI update
        setPosts(prev => prev.filter(p => p.id !== postId && (p as any)._tempId !== postId));

        if (resolvedId.startsWith('temp-')) {
            // It was never on the server, just stop here
            return;
        }

        // 2. Background cleanup
        (async () => {
            try {
                // If we don't have post info (e.g. from shared link), fetch it for storage cleanup
                let fullPostData = postToDelete;
                if (!fullPostData) {
                    const { data } = await supabase.from('posts').select('*, images:post_images(*)').eq('id', resolvedId).single();
                    if (data) fullPostData = data as any;
                }

                // 2.1 Storage Cleanup
                if (postToDelete?.images && postToDelete.images.length > 0) {
                    const filePaths = postToDelete.images.map((img: any) => {
                        return img.image_url;
                    }).filter(Boolean) as string[];

                    if (filePaths.length > 0) {
                        supabase.storage.from('avatars').remove(filePaths).then();
                    }
                }

                // 2.2 Deep Delete Related Data in order to respect FKs
                // 1. Delete likes
                await supabase.from('likes').delete().eq('post_id', resolvedId);
                
                // 2. Delete comment likes first (deep)
                const { data: comments } = await supabase.from('comments').select('id').eq('post_id', resolvedId);
                if (comments && comments.length > 0) {
                    const commentIds = comments.map(c => c.id);
                    await supabase.from('comment_likes').delete().in('comment_id', commentIds);
                    // 3. Delete comments
                    await supabase.from('comments').delete().in('id', commentIds);
                }

                // 4. Delete images & channels
                await supabase.from('post_images').delete().eq('post_id', resolvedId);
                await supabase.from('post_channels').delete().eq('post_id', resolvedId);

                // 5. Finalize by deleting the post itself
                const { error } = await supabase.from('posts').delete().eq('id', resolvedId);
                if (error) throw error;

                console.log(`Post ${postId} deleted successfully from server.`);
            } catch (error) {
                console.log('[ERROR]:', "Background delete error:", error);
                setPosts(originalPosts);
                Alert.alert("Sync Error", "Failed to remove post from server. Restoring post.");
            }
        })();
    };

    const likePost = async (postId: string) => {
        if (!user) return;

        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const post = posts[postIndex];
        const isLiked = post.user_has_liked;

        // Optimistic update
        const newLikesCount = isLiked ? Math.max(0, (post.likes_count || 0) - 1) : (post.likes_count || 0) + 1;

        setPosts(current =>
            current.map(p =>
                p.id === postId
                    ? { ...p, likes_count: newLikesCount, user_has_liked: !isLiked }
                    : p
            )
        );

        try {
            if (isLiked) {
                // Unlike
                const { error } = await supabase
                    .from('likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', user.id);
                if (error) throw error;

                // Decrement count in posts table
                await supabase
                    .from('posts')
                    .update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) })
                    .eq('id', postId);

            } else {
                // Like
                const { error } = await supabase
                    .from('likes')
                    .insert({ post_id: postId, user_id: user.id });
                if (error) throw error;

                // Increment count in posts table
                await supabase
                    .from('posts')
                    .update({ likes_count: (post.likes_count || 0) + 1 })
                    .eq('id', postId);
            }
        } catch (error) {
            console.log('[ERROR]:', 'Error toggling like:', error);
            // Revert optimistic update if failed
            setPosts(current =>
                current.map(p =>
                    p.id === postId
                        ? { ...p, likes_count: post.likes_count, user_has_liked: isLiked }
                        : p
                )
            );
        }
    };

    const updatePost = (postId: string, changes: Partial<Post>) => {
        setPosts(current =>
            current.map(p =>
                (p.id === postId || (p as any)._tempId === postId)
                    ? { ...p, ...changes }
                    : p
            )
        );
    }

    const removePost = useCallback((postId: string) => {
        setPosts(current => current.filter(p => p.id !== postId && (p as any)._tempId !== postId));
    }, []);

    const viewPost = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const newViewsCount = (post.views_count || 0) + 1;
        updatePost(postId, { views_count: newViewsCount });

        try {
            await supabase
                .from('posts')
                .update({ views_count: newViewsCount })
                .eq('id', postId);
        } catch (error) {
            console.log('[ERROR]:', 'Error incrementing view count:', error);
            updatePost(postId, { views_count: post.views_count });
        }
    };

    const refreshSinglePost = async (postId: string) => {
        if (!postId || postId.startsWith('temp-')) return;
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    user:users(id, name, avatar_url),
                    community:communities(id, name, logo_url),
                    images:post_images(*)
                `)
                .eq('id', postId)
                .single();

            if (error) throw error;

            if (data) {
                // Check if user has liked this post
                let user_has_liked = false;
                if (user) {
                    const { data: likeData } = await supabase
                        .from('likes')
                        .select('id')
                        .eq('post_id', postId)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    user_has_liked = !!likeData;
                }

                // MERGE STRATEGY: Don't let stale views_count overwrite newer local count
                const existingPost = posts.find(p => p.id === postId);
                const mergedData = { ...data, user_has_liked };
                if (existingPost && (existingPost.views_count || 0) > (mergedData.views_count || 0)) {
                    mergedData.views_count = existingPost.views_count;
                }

                updatePost(postId, mergedData as any);
            }
        } catch (error) {
            console.log('[ERROR]:', 'Error refreshing single post:', error);
        }
    };

    const sharePost = async (post: Post) => {
        try {
            const result = await Share.share({
                message: `Check out this post on Pentasent: ${post.title || 'Community Post'}\n\nhttps://pentasent.com/post/${post.id}`,
            });
            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // shared with activity type of result.activityType
                } else {
                    // shared
                }
            } else if (result.action === Share.dismissedAction) {
                // dismissed
            }
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    useEffect(() => {
        if (user) {
            fetchPosts(0, false);
            fetchCommunitiesAndChannels();
        }

        const subscription = supabase
            .channel('public:posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                fetchPosts(0, true);
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchPosts]);

    const onRefresh = useCallback(() => {
        fetchPosts(0, true);
    }, [fetchPosts]);

    const refreshFeed = useCallback(async () => {
        await fetchCommunitiesAndChannels();
        return fetchPosts(0, false);
    }, [fetchPosts, fetchCommunitiesAndChannels]);

    const contextValue = React.useMemo(() => ({
        posts,
        loading,
        refreshing,
        loadingMore,
        hasMorePosts,
        onRefresh,
        refreshFeed,
        loadMorePosts,
        createPost,
        likePost,
        updatePost,
        removePost,
        sharePost,
        viewPost,
        deletePost,
        refreshSinglePost,
        communities,
        channels,
        selectedCommunityId,
        setSelectedCommunityId
    }), [
        posts,
        loading,
        refreshing,
        loadingMore,
        hasMorePosts,
        onRefresh,
        refreshFeed,
        loadMorePosts,
        communities,
        channels,
        selectedCommunityId
    ]);

    return (
        <FeedContext.Provider value={contextValue}>
            {children}
        </FeedContext.Provider>
    );
};

export const useFeed = () => {
    const context = useContext(FeedContext);
    if (context === undefined) {
        throw new Error('useFeed must be used within a FeedProvider');
    }
    return context;
};
