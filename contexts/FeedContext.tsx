import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase, useAuth } from './AuthContext';
import { Post, CreatePostDTO, Community, Channel } from '../types/database';
import { Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

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
            console.error("Error fetching metadata", e);
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
            console.error('Error fetching posts:', error);
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
        try {
            if (!user) throw new Error('Not authenticated');

            // Construct JSONB content payload
            const contentPayload = typeof dto.content === 'string'
                ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: dto.content }] }] }
                : dto.content;

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

            // 2. Insert Images (if any)
            if (dto.images && dto.images.length > 0) {
                const finalImageUrls: string[] = [];

                // Upload each image sequentially to Supabase
                for (let i = 0; i < dto.images.length; i++) {
                    const localUri = dto.images[i];

                    if (!localUri.startsWith('http')) {
                        const filename = `${user.id}_post_${Date.now()}_${i}.jpg`;
                        const path = `posts/${filename}`;

                        const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });

                        const { error: uploadError } = await supabase.storage
                            .from('avatars') // Using same public bucket as profiles
                            .upload(path, decode(base64), { contentType: 'image/jpeg' });

                        if (uploadError) {
                            console.error('Post Image Upload Error:', uploadError);
                            // Fallback to local if upload totally fails, though this implies a larger issue
                            finalImageUrls.push(localUri);
                        } else {
                            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
                            finalImageUrls.push(publicUrlData.publicUrl);
                        }
                    } else {
                        // Already a web URL
                        finalImageUrls.push(localUri);
                    }
                }

                const imageInserts = finalImageUrls.map((url, index) => ({
                    post_id: post.id,
                    image_url: url,
                    order_index: index
                }));

                const { error: imgError } = await supabase
                    .from('post_images')
                    .insert(imageInserts);

                if (imgError) console.error("Error inserting images", imgError);

                // Attach images to local post object for UI update
                post.images = imageInserts.map((img, idx) => ({ id: `temp-img-${idx}`, ...img }));
            }

            // 3. Insert Channels (if any)
            if (dto.channel_ids && dto.channel_ids.length > 0) {
                const channelInserts = dto.channel_ids.map(channelId => ({
                    post_id: post.id,
                    channel_id: channelId
                }));

                const { error: chanError } = await supabase
                    .from('post_channels')
                    .insert(channelInserts);

                if (chanError) console.error("Error inserting channels", chanError);
            }

            // Update Local State directly
            setPosts(prev => [post, ...prev]);

        } catch (error: any) {
            console.error('Create Post Error:', error);
            throw error;
        }
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
            console.error('Error toggling like:', error);
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
                p.id === postId
                    ? { ...p, ...changes }
                    : p
            )
        );
    }

    const removePost = useCallback((postId: string) => {
        setPosts(current => current.filter(p => p.id !== postId));
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
            console.error('Error incrementing view count:', error);
            updatePost(postId, { views_count: post.views_count });
        }
    };

    const refreshSinglePost = async (postId: string) => {
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

                updatePost(postId, { ...data, user_has_liked } as any);
            }
        } catch (error) {
            console.error('Error refreshing single post:', error);
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

    return (
        <FeedContext.Provider value={{
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
            refreshSinglePost,
            communities,
            channels,
            selectedCommunityId,
            setSelectedCommunityId
        }}>
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
