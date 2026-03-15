import { Toast } from '@/components/Toast';
import { CustomImage as Image } from '@/components/CustomImage';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, SafeAreaView, Share, Alert, TextInput, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase, useAuth } from '../../contexts/AuthContext';
import { Post, Comment } from '../../types/database';
import { borderRadius, colors, spacing } from '../../constants/theme';
import { Heart, MessageCircle, Share2, ArrowLeft, Send, MoreVertical, X, Trash2, Edit2, Eye, BarChart2 } from 'lucide-react-native';
import { CommentSection } from '../../components/feed/CommentSection';
import { StatusBar } from 'expo-status-bar';
import { parseContent } from '../../utils/content';
import { EditPostDialog } from '../../components/feed/EditPostDialog';
import { FeedPostShimmer } from '../../components/shimmers/FeedPostShimmer';
import { CommentShimmer } from '../../components/shimmers/CommentShimmer';
import { DotsLoader } from '../../components/DotsLoader';
import { formatNumber } from '../../utils/format';
import { useFeed } from '../../contexts/FeedContext';
import { Video, ResizeMode } from 'expo-av';
import { uploadImage } from '../../utils/image-upload';
import KeyboardShiftView from '@/components/KeyboardShiftView';

const { width, height } = Dimensions.get('window');

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const postId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const { user: currentUser } = useAuth(); // Use global auth state
    const { posts, updatePost, removePost, deletePost } = useFeed(); // Access global feed context

    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'comment', id?: string } | null>(null);

    const [post, setPost] = useState<Post | null>(() => {
        const cached = posts.find(p => p.id === postId);
        return cached || null;
    });
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    // Comment Input State
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

    // Interaction State
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [optionsTarget, setOptionsTarget] = useState<{ type: 'post' | 'comment', data?: any } | null>(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingComment, setEditingComment] = useState<Comment | null>(null);

    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    // Sync with global feed state (for is_uploading status)
    useEffect(() => {
        const globalPost = posts.find(p => p.id === postId);
        if (globalPost && globalPost.is_uploading !== post?.is_uploading) {
            setPost(prev => prev ? { ...prev, ...globalPost } : globalPost);
        }
    }, [posts, postId, post?.is_uploading]);

    useEffect(() => {
        // Only fetch if we don't have a post OR if we have a post but it's not currently uploading
        // (to prevent overwriting optimistic state with stale server data)
        if (postId && (!post || !post.is_uploading)) {
            fetchPostDetails();
        }
    }, [postId, currentUser, post?.is_uploading]); // Add currentUser to dep array to re-check likes if user loads late

    const fetchPostDetails = async () => {
        try {
            // Fetch Post
            const { data: postData, error: postError } = await supabase
                .from('posts')
                .select(`
          *,
          user:users(id, name, avatar_url),
          community:communities(id, name, logo_url),
          images:post_images(*)
        `)
                .eq('id', postId)
                .single();

            if (postError) throw postError;

            // Check if user has liked POST
            let userHasLikedPost = false;

            if (currentUser) {
                // Check Post Like
                const { data: likeData } = await supabase
                    .from('likes')
                    .select('id')
                    .eq('post_id', postId)
                    .eq('user_id', currentUser.id)
                    .maybeSingle();
                userHasLikedPost = !!likeData;
            }

            setPost({ ...postData, user_has_liked: userHasLikedPost } as any);
            setEditTitle(postData.title || '');
            setEditContent(parseContent(postData.content));

            // Fetch Comments
            const { data: commentsData, error: commentsError } = await supabase
                .from('comments')
                .select(`
            *,
            user:users(id, name, avatar_url),
            replies:comments(
                *,
                user:users(id, name, avatar_url)
            )
        `)
                .eq('post_id', postId)
                .is('parent_comment_id', null)
                .order('created_at', { ascending: true });

            if (commentsError) throw commentsError;

            let formattedComments = (commentsData as any[]).map(c => ({
                ...c,
                replies: c.replies || []
            }));

            // Calculate user_has_liked for comments
            if (currentUser && formattedComments.length > 0) {
                // Flatten comment IDs to check likes (including replies)
                const allCommentIds: string[] = [];
                formattedComments.forEach((c: any) => {
                    allCommentIds.push(c.id);
                    if (c.replies) {
                        c.replies.forEach((r: any) => allCommentIds.push(r.id));
                    }
                });

                if (allCommentIds.length > 0) {
                    const { data: clData } = await supabase
                        .from('comment_likes')
                        .select('comment_id')
                        .eq('user_id', currentUser.id)
                        .in('comment_id', allCommentIds);

                    const likedCommentIds = new Set(clData?.map(l => l.comment_id));

                    formattedComments = formattedComments.map(c => ({
                        ...c,
                        user_has_liked: likedCommentIds.has(c.id),
                        replies: c.replies.map((r: any) => ({
                            ...r,
                            user_has_liked: likedCommentIds.has(r.id)
                        }))
                    }));
                }
            }

            setComments(formattedComments);


        } catch (error: any) {
            console.error('Error fetching post details:', error);
            if (error.code === 'PGRST200') {
                console.warn('Relationship between posts and post_images not found, falling back to query without images.');
                try {
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from('posts')
                        .select(`
                            *,
                            user:users(id, name, avatar_url),
                            community:communities(id, name, logo_url)
                        `)
                        .eq('id', postId)
                        .single();
                    if (fallbackError) throw fallbackError;
                    if (fallbackData) {
                        setPost(fallbackData as any);
                        setEditTitle(fallbackData.title || '');
                        setEditContent(parseContent(fallbackData.content));
                    }
                } catch (fallbackErr) {
                    console.error('Fallback query failed:', fallbackErr);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || submitting) return;
        setSubmitting(true);
        try {
            if (!currentUser) return;

            // Construct JSONB content payload
            const contentPayload = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: newComment.trim()
                            }
                        ]
                    }
                ]
            };

            if (editingComment) {
                // UPDATE EXISTING COMMENT
                const { error } = await supabase
                    .from('comments')
                    .update({ content: contentPayload })
                    .eq('id', editingComment.id);

                if (error) throw error;

                // Optimistic UI Update for Edit
                const updateList = (list: Comment[]): Comment[] => {
                    return list.map(c => {
                        if (c.id === editingComment.id) return { ...c, content: contentPayload };
                        if (c.replies) return { ...c, replies: updateList(c.replies) };
                        return c;
                    });
                };
                setComments(current => updateList(current));
                setEditingComment(null);
                setNewComment('');

            } else {
                // CREATE NEW COMMENT
                const { data: commentData, error } = await supabase
                    .from('comments')
                    .insert({
                        post_id: postId,
                        user_id: currentUser.id,
                        content: contentPayload,
                        parent_comment_id: replyingTo?.id || null
                    })
                    .select(`*, user:users(id, name, avatar_url)`)
                    .single();

                if (error) throw error;

                // Manually update post comment count
                if (post) {
                    await supabase.from('posts').update({ comments_count: (post.comments_count || 0) + 1 }).eq('id', postId);
                }

                // Optimistically update UI
                if (replyingTo?.id) {
                    setComments(current => current.map(c =>
                        c.id === replyingTo.id
                            ? { ...c, replies: [...(c.replies || []), commentData as any] }
                            : c
                    ));
                } else {
                    setComments(current => [...current, commentData as any]);
                }

                // Also update post comment count (UI)
                // Also update post comment count (UI)
                const newCommentCount = (post?.comments_count || 0) + 1;

                setPost(prev => prev ? { ...prev, comments_count: newCommentCount } : null);

                // Sync with GLOBAL FEED
                updatePost(postId, { comments_count: newCommentCount });

                setNewComment('');
                setReplyingTo(null);
            }

        } catch (error) {
            console.error('Error adding/updating comment:', error);
            Alert.alert('Error', 'Failed to send/update comment.');
        } finally {
            setSubmitting(false);
        }
    };



    // ... inside the component function ...

    const handleLikePost = async () => {
        if (!post || !currentUser) return;

        const isLiked = post.user_has_liked;
        const newLikesCount = isLiked ? Math.max(0, post.likes_count - 1) : post.likes_count + 1;

        // Optimistic update local state
        setPost(prev => prev ? { ...prev, likes_count: newLikesCount, user_has_liked: !isLiked } : null);

        // Sync with GLOBAL FEED
        updatePost(post.id, { likes_count: newLikesCount, user_has_liked: !isLiked });

        try {
            if (isLiked) {
                await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUser.id);
                // Manually update post count
                await supabase.from('posts').update({ likes_count: Math.max(0, post.likes_count - 1) }).eq('id', post.id);
            } else {
                const { data: existing } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', currentUser.id).maybeSingle();
                if (!existing) {
                    await supabase.from('likes').insert({ post_id: post.id, user_id: currentUser.id });
                    // Manually update post count
                    await supabase.from('posts').update({ likes_count: post.likes_count + 1 }).eq('id', post.id);
                }
            }
        } catch (error) {
            console.error("Like error", error);
            // Revert on error could be added here
        }
    };

    const handleLikeComment = async (commentId: string) => {
        if (!currentUser) return;

        // Optimistic Update
        const updateCommentLike = (commentsList: Comment[]): Comment[] => {
            return commentsList.map(c => {
                if (c.id === commentId) {
                    const isLiked = c.user_has_liked;
                    return {
                        ...c,
                        likes_count: isLiked ? Math.max(0, c.likes_count - 1) : c.likes_count + 1,
                        user_has_liked: !isLiked
                    };
                }
                if (c.replies) {
                    return { ...c, replies: updateCommentLike(c.replies) };
                }
                return c;
            });
        };

        setComments(current => updateCommentLike(current));

        // DB Sync
        try {
            // Find current comment to get its likes_count for update
            const findComment = (list: Comment[]): Comment | undefined => {
                for (const c of list) {
                    if (c.id === commentId) return c;
                    if (c.replies) {
                        const found = findComment(c.replies);
                        if (found) return found;
                    }
                }
                return undefined;
            }
            const currentComment = findComment(comments);
            const currentCount = currentComment?.likes_count || 0;

            const { data: existing } = await supabase
                .from('comment_likes')
                .select('id')
                .eq('comment_id', commentId)
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (existing) {
                await supabase.from('comment_likes').delete().eq('id', existing.id);
                // Update comment likes_count
                await supabase.from('comments').update({ likes_count: Math.max(0, currentCount - 1) }).eq('id', commentId);
            } else {
                await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUser.id });
                // Update comment likes_count
                await supabase.from('comments').update({ likes_count: currentCount + 1 }).eq('id', commentId);
            }

        } catch (error) {
            console.error("Comment Like error", error);
        }
    };

    const handleShare = async () => {
        if (!post) return;
        try {
            const postUrl = `https://pentasent.com/post/${post.id}`;
            const result = await Share.share({
                title: post.title || 'Pentasent Post',
                message: `${post.title || 'Check out this post'}\n${postUrl}`,
                url: postUrl
            });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const handleDeletePost = async () => {
        setDeleteTarget({ type: 'post' });
        setShowDeleteModal(true);
    };

    const confirmDeletePost = async () => {
        if (isDeleting || !deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.type === 'post') {
                // Use background delete from context
                await deletePost(postId);
                
                setShowDeleteModal(false);
                setToastMsg("Post deleted successfully");
                
                // Delay navigation slightly for smooth transition
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 1500);
            } else if (deleteTarget.type === 'comment' && deleteTarget.id) {
                const commentId = deleteTarget.id;
                await supabase.from('comments').delete().eq('id', commentId);

                // Optimistic Remove
                const removeComment = (list: Comment[]): Comment[] => {
                    return list.filter(c => c.id !== commentId).map(c => ({
                        ...c,
                        replies: c.replies ? removeComment(c.replies) : []
                    }));
                };
                setComments(current => removeComment(current));

                // Update post comments count
                if (post) {
                    await supabase.from('posts').update({ comments_count: Math.max(0, post.comments_count - 1) }).eq('id', postId);
                    setPost(prev => prev ? { ...prev, comments_count: Math.max(0, prev.comments_count - 1) } : null);
                }
                
                setShowDeleteModal(false);
                setToastMsg("Comment deleted successfully");
                setIsDeleting(false);
            }
        } catch (e) {
            setToastMsg(`Failed to delete ${deleteTarget.type}.`);
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleEditPost = async (title: string, content: string, updatedImages: string[]) => {
        try {
            const contentPayload = {
                type: 'doc',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: content.trim() }] }]
            };

            // 1. Optimistic Update Data
            const currentImages = post?.images || [];
            const existingImages = currentImages.filter(img => updatedImages.includes(img.image_url));
            const newLocalURIs = updatedImages.filter(url => !url.startsWith('http'));
            
            // Create optimistic images list (existing + local URIs)
            const optimisticImages = [
                ...existingImages,
                ...newLocalURIs.map((uri, i) => ({
                    id: `temp-${Date.now()}-${i}`,
                    image_url: uri,
                    post_id: postId,
                    order_index: existingImages.length + i,
                    is_local: true // Marker for UI if needed
                }))
            ];

            const optimisticPost = {
                ...post,
                title,
                content: contentPayload,
                images: optimisticImages,
                local_image_urls: newLocalURIs,
                is_uploading: true,
                is_edited: true
            } as any;

            // Update both local and global state instantly
            setPost(optimisticPost);
            updatePost(postId, optimisticPost);
            
            if (newLocalURIs.length > 0) {
                setToastMsg("Updating in background...");
            } else {
                setToastMsg("Post updated successfully");
            }

            // 2. Background Synchronization
            (async () => {
                try {
                    // 2.1 Update Main Post Data
                    const { error: postError } = await supabase
                        .from('posts')
                        .update({ title, content: contentPayload, is_edited: true })
                        .eq('id', postId);
                    if (postError) throw postError;

                    // 2.2 Handle Image Deletions
                    const removedImages = currentImages.filter(img => !updatedImages.includes(img.image_url));
                    if (removedImages.length > 0) {
                        const idsToDelete = removedImages.map(img => img.id);
                        await supabase.from('post_images').delete().in('id', idsToDelete);
                        // Clean up storage (no await, it's fine)
                        removedImages.forEach(img => {
                            try {
                                const path = new URL(img.image_url).pathname.split('/').slice(-2).join('/');
                                supabase.storage.from('avatars').remove([path]).then();
                            } catch {}
                        });
                    }

                    // 2.3 Upload New Images in Parallel
                    let newImageDTOs: any[] = [];
                    if (newLocalURIs.length > 0 && currentUser) {
                    const uploadPromises = newLocalURIs.map(async (localUri, i) => {
                        const filename = `posts/${currentUser.id}_edit_${Date.now()}_${i}.jpg`;
                        
                        await uploadImage(localUri, filename);
                        
                        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filename);
                            
                            const { data: imgInsert, error: insertError } = await supabase
                                .from('post_images')
                                .insert({
                                    post_id: postId,
                                    image_url: publicUrlData.publicUrl,
                                    order_index: existingImages.length + i
                                })
                                .select()
                                .single();

                            if (insertError) throw insertError;
                            return imgInsert;
                        });

                        newImageDTOs = await Promise.all(uploadPromises);
                    }

                    // 2.4 Final Sync
                    const finalPostData = {
                        ...optimisticPost,
                        images: [...existingImages, ...newImageDTOs],
                        is_uploading: false,
                        local_image_urls: []
                    };
                    
                    setPost(finalPostData as any);
                    updatePost(postId, finalPostData as any);
                    if (newLocalURIs.length > 0) {
                        setToastMsg("Post updated successfully");
                    }

                } catch (backgroundError: any) {
                    console.error('Background Sync Error:', backgroundError);
                    setPost(current => current ? { ...current, is_uploading: false } : null);
                    updatePost(postId, { is_uploading: false });
                    setToastMsg("Background sync failed. Some changes might not be saved.");
                }
            })();

            // Return immediately to allow dialog closure
            return;
        } catch (e: any) {
            console.error('Edit Initiation Error:', e);
            setToastMsg("Failed to start update.");
        }
    };

    const startEditComment = (comment: Comment) => {
        setEditingComment(comment);
        setNewComment(parseContent(comment.content));
        // You might want to focus the input here if you had a ref
    };

    const handleDeleteComment = async (commentId: string) => {
        setDeleteTarget({ type: 'comment', id: commentId });
        setShowDeleteModal(true);
    };

    const isOwner = currentUser && post && post.user_id === currentUser.id;

    const renderNavBar = () => (
        <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Post</Text>
            <View style={styles.rightNav}>
                {isOwner ? (
                    <TouchableOpacity onPress={() => setOptionsTarget({ type: 'post' })} style={styles.navIcon}>
                        <MoreVertical size={24} color={colors.text} />
                    </TouchableOpacity>
                ) : (
                    // <View style={{ width: 24 }} />
                    <TouchableOpacity style={styles.navIcon}>
                        <MoreVertical size={24} color={colors.background} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (loading && !post) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <StatusBar style="dark" backgroundColor="transparent" translucent />
                <Stack.Screen options={{ headerShown: false }} />
                {renderNavBar()}
                <ScrollView style={{ flex: 1 }}>
                    <FeedPostShimmer />
                    <View style={{ padding: 16 }}>
                        <CommentShimmer />
                        <CommentShimmer />
                        <CommentShimmer />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <StatusBar style="dark" backgroundColor="transparent" translucent />
                <Stack.Screen options={{ headerShown: false }} />
                {renderNavBar()}
                <View style={styles.center}>
                    <Text style={{ color: colors.text, textAlign: 'center', marginHorizontal: 30 }}>Post not found, might be removed by the creator.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <Stack.Screen options={{ headerShown: false }} />
            <Toast message={toastMsg} onHide={() => setToastMsg(null)} />

            {/* Navbar */}
            {renderNavBar()}

            {/* Options Modal */}
            <Modal statusBarTranslucent transparent visible={!!optionsTarget} animationType="fade" onRequestClose={() => setOptionsTarget(null)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsTarget(null)}>
                    <View style={styles.optionsMenu}>
                        {optionsTarget?.type === 'post' && (
                            <>
                                <TouchableOpacity style={styles.optionItem} onPress={() => { 
                                    setEditTitle(post?.title || '');
                                    setEditContent(parseContent(post?.content));
                                    setOptionsTarget(null); 
                                    setShowEditModal(true); 
                                }}>
                                    <Edit2 size={20} color={colors.text} />
                                    <Text style={styles.optionText}>Edit Post</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.optionItem, styles.deleteOption]} onPress={() => { setOptionsTarget(null); handleDeletePost(); }}>
                                    <Trash2 size={20} color={colors.error} />
                                    <Text style={[styles.optionText, styles.deleteText]}>Delete Post</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {optionsTarget?.type === 'comment' && (
                            <>
                                <TouchableOpacity style={styles.optionItem} onPress={() => {
                                    const comment = optionsTarget.data;
                                    setOptionsTarget(null);
                                    startEditComment(comment);
                                }}>
                                    <Edit2 size={20} color={colors.text} />
                                    <Text style={styles.optionText}>Edit Comment</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.optionItem, styles.deleteOption]} onPress={() => {
                                    const comment = optionsTarget.data;
                                    setOptionsTarget(null);
                                    handleDeleteComment(comment.id);
                                }}>
                                    <Trash2 size={20} color={colors.error} />
                                    <Text style={[styles.optionText, styles.deleteText]}>Delete Comment</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Edit Post Dialog */}
            <EditPostDialog
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSubmit={handleEditPost}
                initialTitle={editTitle}
                initialContent={editContent}
                initialImages={post?.images?.map(i => i.image_url) || []}
                community={post?.community}
                channel={post?.channels ? post.channels[0] : undefined}
            />

            {/* Full Screen Image Modal */}
            <Modal visible={!!fullScreenImage} transparent={false} statusBarTranslucent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
                <View style={styles.fullScreenContainer}>
                    <TouchableOpacity style={styles.closeImageButton} onPress={() => setFullScreenImage(null)}>
                        <X size={30} color={colors.text} />
                    </TouchableOpacity>
                    {fullScreenImage && (
                        <Image
                            source={{ uri: fullScreenImage }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Post Content */}
                    <View style={styles.postContainer}>
                        <View style={styles.header}>
                            <Image source={{ uri: post.user?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                            <View>
                                <Text style={styles.username}>{post.user?.name || 'Anonymous'}</Text>
                                {(post as any).is_uploading && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                                            {post.is_edited ? 'Updating...' : 'Uploading...'}
                                        </Text>
                                        <DotsLoader color={colors.primary} size={4} />
                                    </View>
                                )}
                                <View style={styles.metaRow}>
                                    {post.community && (
                                        <Text style={styles.communityName}>{post.community.name} • </Text>
                                    )}
                                    <Text style={styles.time}>
                                        {new Date(post.created_at).toLocaleDateString()}
                                        {post.is_edited && ' • Edited'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
                        <Text style={styles.body}>{parseContent(post.content)}</Text>

                        {post.images && post.images.length > 0 && (
                            <ScrollView
                                horizontal={post.images.length > 1}
                                showsHorizontalScrollIndicator={false}
                                style={styles.imageScroll}
                            >
                                {post.images.map((img: any, idx: number) => (
                                    <TouchableOpacity key={img.id || `img-${idx}`} onPress={() => setFullScreenImage(img.image_url)}>
                                        <Image
                                            source={{ uri: img.image_url }}
                                            style={
                                                post.images?.length === 1
                                                    ? styles.singleImage
                                                    : styles.postImage
                                            }
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <View style={styles.engagement}>
                            <TouchableOpacity style={styles.actionButton} onPress={handleLikePost}>
                                <Heart size={20} color={post.user_has_liked ? colors.error : colors.textMuted} fill={post.user_has_liked ? colors.error : 'transparent'} />
                                <Text style={styles.actionText}>{formatNumber(post.likes_count)}</Text>
                            </TouchableOpacity>
                            <View style={styles.actionButton}>
                                <MessageCircle size={20} color={colors.textMuted} />
                                <Text style={styles.actionText}>{formatNumber(post.comments_count)}</Text>
                            </View>
                            <View style={styles.actionButton}>
                                <BarChart2 size={20} color={colors.textMuted} />
                                <Text style={styles.actionText}>{formatNumber(post.views_count || 0)}</Text>
                            </View>
                            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                                <Share2 size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Comments */}
                    <CommentSection
                        comments={comments}
                        isLoading={loading}
                        commentCount={post.comments_count}
                        onLikeComment={handleLikeComment}
                        onReply={(comment) => setReplyingTo(comment)}
                        currentUserId={currentUser?.id}
                        onOptions={(comment) => setOptionsTarget({ type: 'comment', data: comment })}
                    />
                </ScrollView>

                <KeyboardShiftView>
                    <View style={styles.inputWrapper}>
                        {(replyingTo || editingComment) && (
                            <View style={styles.replyingToBar}>
                                <Text style={styles.replyingToText}>
                                    {replyingTo ? `Replying to ${replyingTo.user?.name || 'User'}` : 'Editing Comment'}
                                </Text>
                                <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingComment(null); setNewComment(''); }}>
                                    <Text style={styles.cancelReply}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                                value={newComment}
                                onChangeText={setNewComment}
                                placeholderTextColor={colors.textMuted}
                                multiline
                                editable={!submitting}
                            />
                            <TouchableOpacity
                                style={[styles.sendButton, (!newComment.trim() || submitting) && styles.disabledSend]}
                                onPress={handleAddComment}
                                disabled={!newComment.trim() || submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Send size={20} color={newComment.trim() ? '#FFF' : colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardShiftView>
            </View>

            {/* Custom Delete Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                statusBarTranslucent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlayDelete}>
                    <View style={styles.modalContentDelete}>
                        <Text style={styles.modalTitleDelete}>
                            {deleteTarget?.type === 'post' ? 'Delete Post' : 'Delete Comment'}
                        </Text>
                        <Text style={styles.modalMessageDelete}>
                            Are you sure you want to delete this {deleteTarget?.type}?
                        </Text>
                        <View style={styles.modalActionsDelete}>
                            <TouchableOpacity
                                style={styles.modalCancelBtnDelete}
                                onPress={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                            >
                                <Text style={styles.modalCancelTextDelete}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalDeleteBtnConfirm, isDeleting && { opacity: 0.7 }]}
                                onPress={confirmDeletePost}
                                disabled={isDeleting}
                            >
                                <Text style={styles.modalDeleteTextConfirm}>
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // padding: 16,
        // paddingTop: Platform.OS === 'android' ? 40 : 16, // Adjust for status bar
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.sm,
        zIndex: 1,
    },
    rightNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    navIcon: {
        padding: 4,
    },
    navTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    backButton: {
        padding: 4,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    postContainer: {
        padding: 16,
        backgroundColor: colors.background,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: colors.border,
    },
    username: {
        fontWeight: '600',
        fontSize: 14,
        color: colors.text,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    communityName: {
        fontSize: 12,
        color: colors.textMuted,
    },
    time: {
        fontSize: 12,
        color: colors.textMuted,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: colors.text,
    },
    body: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
        marginBottom: 8,
    },
    imageScroll: {
        marginBottom: 16,
    },
    postImage: {
        width: 300,
        height: 200,
        borderRadius: 12,
        marginRight: 12,
    },
    singleImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
    },
    engagement: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        // borderBottomWidth: 1,
        // borderBottomColor: colors.border,
        // paddingBottom: 32,
        paddingTop: 12,
        gap: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },
    // Input Styles
    inputContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: 16,
        backgroundColor: colors.background,
    },
    replyingToBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    replyingToText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    cancelReply: {
        fontSize: 12,
        color: colors.error,
        fontWeight: '500',
    },
    inputWrapper: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 0 : 12, // Handle safe area padding manually if needed
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        color: colors.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledSend: {
        backgroundColor: colors.border,
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    optionsMenu: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        gap: 16,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    optionText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    deleteOption: {
        marginTop: 8,
    },
    deleteText: {
        color: colors.error,
    },
    editModalContainer: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    editHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    editTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    cancelText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    saveText: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '600',
    },
    editForm: {
        padding: 16,
        gap: 16,
    },
    editInputTitle: {
        fontSize: 18,
        fontWeight: '700',
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
    },
    editInputContent: {
        fontSize: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        minHeight: 200,
    },
    // Full Screen Image
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: width,
        height: height,
    },
    closeImageButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.full,
    },
    inlineInputContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: colors.borderLight,
    },
    modalOverlayDelete: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContentDelete: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
    },
    modalTitleDelete: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    modalMessageDelete: {
        fontSize: 16,
        color: colors.textLight,
        marginBottom: spacing.xl,
    },
    modalActionsDelete: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
    },
    modalCancelBtnDelete: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
    },
    modalCancelTextDelete: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '600',
    },
    modalDeleteBtnConfirm: {
        backgroundColor: colors.error + '20',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
    },
    modalDeleteTextConfirm: {
        fontSize: 16,
        color: colors.error,
        fontWeight: '600',
    },
});
