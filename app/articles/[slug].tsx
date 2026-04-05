import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Animated,
    Platform,
    Linking,
    Share,
    Alert,
    Modal,
    TextInput,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import {
    ChevronLeft,
    Clock,
    Calendar,
    Eye,
    Heart,
    Share2,
    User as UserIcon,
    Play,
    ExternalLink,
    Quote,
    Send,
    X,
    Trash2,
    Edit2
} from 'lucide-react-native';
import { ArticleDetailShimmer } from '@/components/shimmers/ArticleDetailShimmer';
import KeyboardShiftView from '@/components/KeyboardShiftView';
import { ArticleCommentSection } from '@/components/articles/ArticleCommentSection';
import { Article, ArticleTag, User, ArticleComment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { CustomImage as Image } from '@/components/CustomImage';
import { LinearGradient } from 'expo-linear-gradient';
import { getImageUrl } from '@/utils/get-image-url';
import { FlexibleCustomImage } from '@/components/FlexibleCustomImage';
import { formatDate } from '@/utils/format';
import { Toast } from '@/components/Toast';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import crashlytics from '@/lib/crashlytics';

const { width } = Dimensions.get('window');

type ArticleFull = Article & {
    author: User | null;
    tags: ArticleTag[];
    blocks: any[];
    user_has_liked?: boolean;
};

export default function ArticleDetailScreen() {
    const { slug, title: initialTitle, banner_image: initialBanner, description: initialDesc, reading_time: initialTime } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();

    const [article, setArticle] = useState<ArticleFull | null>(initialTitle ? {
        title: initialTitle as string,
        banner_image: initialBanner as string,
        description: initialDesc as string,
        reading_time: parseInt((initialTime as string) || '0', 10),
        blocks: [],
        tags: [],
        author: null,
    } as any : null);
    const [loading, setLoading] = useState(!initialTitle);
    const [isLiking, setIsLiking] = useState(false);
    
    // Comments states
    const [comments, setComments] = useState<ArticleComment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState<ArticleComment | null>(null);
    const [editingComment, setEditingComment] = useState<ArticleComment | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isDeletingComment, setIsDeletingComment] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
    const [optionsTarget, setOptionsTarget] = useState<ArticleComment | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('info');
    
    // Helper to build recursive tree from flat comments
    const buildCommentTree = (flatComments: any[]): ArticleComment[] => {
        const map = new Map();
        const roots: ArticleComment[] = [];

        flatComments.forEach(c => {
            map.set(c.id, { ...c, replies: [] });
        });

        flatComments.forEach(c => {
            const comment = map.get(c.id);
            if (c.parent_id && map.has(c.parent_id)) {
                map.get(c.parent_id).replies.push(comment);
            } else {
                roots.push(comment);
            }
        });

        // Sort roots and their replies by created_at (descending for roots, ascending for replies)
        roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        roots.forEach(root => {
            if (root.replies) {
                root.replies.sort((a: ArticleComment, b: ArticleComment) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            }
        });

        return roots;
    };

    // Header Animation
    const scrollY = useRef(new Animated.Value(0)).current;

    const fetchArticle = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        try {
            const { data: art, error: artErr } = await supabase
                .from('articles')
                .select(`
                    *,
                    article_tag_map(
                        article_tags(*)
                    )
                `)
                .eq('slug', slug)
                .maybeSingle();

            if (artErr) throw artErr;
            if (!art) {
                if (!initialTitle) setArticle(null);
                setLoading(false);
                return;
            }

            // Restore View Increment call as per user request
            // Record View (Optimistic)
            try {
                (async () => {
                    try {
                        await supabase.from('article_views').insert({
                            article_id: art.id,
                            user_id: user?.id || null,
                            ip_hash: 'anonymous'
                        });
                        await supabase.rpc('increment_article_view', { art_id: art.id });
                        // Update local state if needed
                        setArticle(prev => prev ? { ...prev, view_count: (prev.view_count || 0) + 1 } : null);
                    } catch (e:any) {
                        crashlytics().recordError(e);
                         console.log('[ERROR]:', "Error logging view:", e);
                    }
                })();
            } catch (e:any) {
                crashlytics().recordError(e);
             }

            let hasLiked = false;
            if (user) {
                const { data: like } = await supabase
                    .from('article_likes')
                    .select('id')
                    .eq('article_id', art.id)
                    .eq('user_id', user.id)
                    .maybeSingle();
                hasLiked = !!like;
            }

            let authorData = null;
            if (art.author_id) {
                const { data: author } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', art.author_id)
                    .maybeSingle();
                authorData = author;
            }

            // Blocks are in article_data.blocks
            const blocks = art.article_data?.blocks || [];

            const formattedArticle = {
                ...art,
                author: authorData,
                tags: art.article_tag_map?.map((m: any) => m.article_tags).filter(Boolean) || [],
                blocks: blocks,
                user_has_liked: hasLiked
            } as ArticleFull;

            setArticle(formattedArticle);
        } catch (error:any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', 'Error fetching article:', error);
        } finally {
            setLoading(false);
        }
    }, [slug, user]);

    const fetchComments = async (articleId: string) => {
        setCommentsLoading(true);
        try {
            // Fetch ALL comments for this article to build tree locally
            const { data: allComments, error: commentsError } = await supabase
                .from('article_comments')
                .select(`*`)
                .eq('article_id', articleId)
                .order('created_at', { ascending: false });

            if (commentsError) throw commentsError;

            if (allComments && allComments.length > 0) {
                // Fetch User Profiles for these comments
                const userIds = [...new Set(allComments.map(c => c.user_id))];
                const { data: profiles } = await supabase
                    .from('users')
                    .select('id, name, avatar_url')
                    .in('id', userIds);

                // Fetch likes for current user
                let likedIds = new Set();
                if (user) {
                    const { data: likes } = await supabase
                        .from('article_comment_likes')
                        .select('comment_id')
                        .eq('user_id', user.id)
                        .in('comment_id', allComments.map(c => c.id));
                    if (likes) likedIds = new Set(likes.map(l => l.comment_id));
                }

                const formatted = allComments.map(c => ({
                    ...c,
                    user: profiles?.find(p => p.id === c.user_id),
                    user_has_liked: likedIds.has(c.id)
                }));

                const tree = buildCommentTree(formatted);
                setComments(tree);
            } else {
                setComments([]);
            }
        } catch (err:any) {
            crashlytics().recordError(err);
            console.log('[ERROR]:', 'Error fetching comments:', err);
        } finally {
            setCommentsLoading(false);
        }
    };

    useEffect(() => {
        fetchArticle();
    }, [fetchArticle]);

    useEffect(() => {
        if (article?.id) {
            fetchComments(article.id);
        }
    }, [article?.id, user]); // Added user to dependency array to refetch comments if user changes (e.g., logs in/out)

    const handleCommentOptions = (comment: ArticleComment) => {
        if (!user || user.id !== comment.user_id) return;
        setOptionsTarget(comment);
    };

    const confirmDeleteComment = (commentId: string) => {
        setCommentToDeleteId(commentId);
        setOptionsTarget(null);
        setShowDeleteModal(true);
    };

    const handleDeleteComment = async () => {
        if (!commentToDeleteId || !user) return;
        
        setIsDeletingComment(true);
        const commentId = commentToDeleteId;
        try {
            // Optimistic remove
            const removeFromList = (list: ArticleComment[]): ArticleComment[] => {
                return list
                    .filter(c => c.id !== commentId)
                    .map(c => ({
                        ...c,
                        replies: c.replies ? removeFromList(c.replies) : []
                    }));
            };
            setComments(prev => removeFromList(prev));
            setArticle(prev => prev ? { ...prev, comment_count: Math.max(0, (prev.comment_count || 0) - 1) } : null);

            // Manually handle cascading deletes (likes and replies)
            const { data: replies } = await supabase.from('article_comments').select('id').eq('parent_id', commentId);
            const commentIds = [commentId];
            if (replies && replies.length > 0) {
                commentIds.push(...replies.map(r => r.id));
            }

            // 1. Delete likes for parent and all replies
            await supabase.from('article_comment_likes').delete().in('comment_id', commentIds);
            
            // 2. Delete replies
            if (replies && replies.length > 0) {
                await supabase.from('article_comments').delete().in('id', replies.map(r => r.id));
            }

            // 3. Delete parent comment
            const { data: deletedRow, error: deletionError } = await supabase
                .from('article_comments')
                .delete()
                .eq('id', commentId)
                .select()
                .maybeSingle();

            if (deletionError) throw deletionError;
            if (!deletedRow) throw new Error("Comment could not be deleted on the server. RLS policy might be missing.");
            
            setShowDeleteModal(false);
        } catch (err: any) {
            crashlytics().recordError(err);
            console.log('[ERROR]:', "Error deleting comment:", err);
            setToastType('error');
            setToastMsg("Unable to delete comment. It might be referenced by replies or likes.");
            if (article?.id) fetchComments(article.id);
        } finally {
            setIsDeletingComment(false);
            setCommentToDeleteId(null);
        }
    };

    const handleSaveInlineEdit = async () => {
        if (!editingComment || !editingText.trim() || isSubmittingComment) return;
        const text = editingText.trim();
        setIsSubmittingComment(true);
        try {
            const { error } = await supabase
                .from('article_comments')
                .update({ content: text, updated_at: new Date().toISOString() })
                .eq('id', editingComment.id);

            if (error) throw error;

            const updateInList = (list: ArticleComment[]): ArticleComment[] => {
                return list.map(c => {
                    if (c.id === editingComment.id) {
                        return { ...c, content: text };
                    }
                    if (c.replies && c.replies.length > 0) {
                        return { ...c, replies: updateInList(c.replies) };
                    }
                    return c;
                });
            };
            setComments(prev => updateInList(prev));
            setEditingComment(null);
            setEditingText('');
        } catch (err:any) {
            crashlytics().recordError(err);
            console.log('[ERROR]:', "Error updating comment:", err);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleLikeComment = async (comment: ArticleComment) => {
        if (!user) return;
        
        const isLiked = comment.user_has_liked;
        const currentCount = Number(comment.like_count || 0);
        const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

        // Optimistic Update
        const updateList = (list: ArticleComment[]): ArticleComment[] => {
            return list.map(c => {
                if (c.id === comment.id) return { ...c, user_has_liked: !isLiked, like_count: newCount };
                if (c.replies && c.replies.length > 0) return { ...c, replies: updateList(c.replies) };
                return c;
            });
        };
        setComments(prev => updateList(prev));

        try {
            if (isLiked) {
                await supabase.from('article_comment_likes').delete().eq('comment_id', comment.id).eq('user_id', user.id);
                const { error } = await supabase.rpc('decrement_article_comment_like', { comm_id: comment.id });
                if (error) {
                    // Fallback if RPC fails, directly update count
                    await supabase.from('article_comments').update({ like_count: newCount }).eq('id', comment.id);
                }
            } else {
                await supabase.from('article_comment_likes').insert({ comment_id: comment.id, user_id: user.id });
                const { error } = await supabase.rpc('increment_article_comment_like', { comm_id: comment.id });
                if (error) {
                    // Fallback if RPC fails, directly update count
                    await supabase.from('article_comments').update({ like_count: newCount }).eq('id', comment.id);
                }
            }
        } catch (err:any) {
            crashlytics().recordError(err);
            console.log('[ERROR]:', "Error liking comment:", err);
            // Revert optimistic update if error
            if (article?.id) fetchComments(article.id);
        }
    };

    const handleSubmitComment = async () => {
        if (!user || !commentText.trim() || isSubmittingComment || !article) return;

        const text = commentText.trim();
        setIsSubmittingComment(true);

        try {
            if (editingComment) {
                // Update existing comment
                const { error } = await supabase
                    .from('article_comments')
                    .update({ content: text, updated_at: new Date().toISOString() })
                    .eq('id', editingComment.id);

                if (error) throw error;

                // Optimistic Update
                const updateInList = (list: ArticleComment[]): ArticleComment[] => {
                    return list.map(c => {
                        if (c.id === editingComment.id) {
                            return { ...c, content: text };
                        }
                        if (c.replies && c.replies.length > 0) {
                            return { ...c, replies: updateInList(c.replies) };
                        }
                        return c;
                    });
                };
                setComments(prev => updateInList(prev));
                setEditingComment(null);
            } else {
                // Insert new comment/reply
                const parentId = replyingTo?.id || null;
                const { data: inserted, error } = await supabase
                    .from('article_comments')
                    .insert({
                        article_id: article.id,
                        user_id: user.id,
                        content: text,
                        parent_id: parentId
                    })
                    .select('*')
                    .single();

                if (error) throw error;

                // Merge local user info
                const newC = {
                    ...inserted,
                    user: {
                        id: user.id,
                        name: user.name,
                        avatar_url: user.avatar_url
                    },
                    user_has_liked: false,
                    like_count: 0,
                    replies: []
                };

                const updateList = (list: ArticleComment[]): ArticleComment[] => {
                    if (!parentId) {
                        return [newC, ...list];
                    }
                    return list.map(c => {
                        if (c.id === parentId) {
                            return {
                                ...c,
                                replies: [...(c.replies || []), newC].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
                            };
                        }
                        if (c.replies && c.replies.length > 0) {
                            return { ...c, replies: updateList(c.replies) };
                        }
                        return c;
                    });
                };

                setComments(prev => updateList(prev));
                setReplyingTo(null);
                setArticle(prev => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : null);
            }

            setCommentText('');
        } catch (err:any) {
            crashlytics().recordError(err);
            console.log('[ERROR]:', 'Error submitting comment:', err);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleLike = async () => {
        if (!user || !article || isLiking) return;
        setIsLiking(true);
        const newState = !article.user_has_liked;
        try {
            if (article.user_has_liked) {
                await supabase.from('article_likes').delete().eq('article_id', article.id).eq('user_id', user.id);
                setArticle(prev => prev ? { ...prev, user_has_liked: false, like_count: Math.max(0, (prev.like_count || 0) - 1) } : null);
            } else {
                await supabase.from('article_likes').insert({ article_id: article.id, user_id: user.id });
                setArticle(prev => prev ? { ...prev, user_has_liked: true, like_count: (prev.like_count || 0) + 1 } : null);
            }
        } catch (err:any) {
            crashlytics().recordError(err);
            console.log('[ERROR]:', 'Error liking article:', err);
            // Revert optimistic update if error
            if (article?.id) fetchArticle();
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = async () => {
        if (!article) return;
        try {
            const shareUrl = `https://pentasent.com/articles/${article.slug}`;
            await Share.share({
                title: article.title,
                message: `Check out this article on Pentasent: ${article.title}\n\nRead more at: ${shareUrl}`,
                url: shareUrl, // Important for iOS as well
            });
        } catch (error:any) {
            crashlytics().recordError(error);
            console.log('[ERROR]:', 'Error sharing article:', error);
        }
    };

    const currentBanner = article?.banner_image || initialBanner as string;

    // Show shimmer if we don't have the full article content yet
    const showContentShimmer = loading || (!article?.blocks || article?.blocks.length === 0);

    // If fetch failed and we have no content at all (not even initial data)
    if (!article && !loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text style={styles.headerSubtitle}>Article not found.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                        <Text style={{ color: colors.primary }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" translucent />
            <KeyboardShiftView style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
                    <Animated.ScrollView
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header Section - Community Style */}
                        <View style={[styles.bannerContainer]}>
                            {currentBanner ? (
                                <Image
                                    source={{ uri: getImageUrl(currentBanner) }}
                                    style={styles.banner}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.banner, { backgroundColor: colors.borderLight }]} />
                            )}
                            <LinearGradient
                                colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.4)']}
                                style={StyleSheet.absoluteFill}
                            />

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => router.back()}
                            >
                                <ChevronLeft color="white" size={28} />
                            </TouchableOpacity>
                        </View>

                        {/* Article Info Section */}
                        <View style={styles.contentContainer}>
                            <Text style={styles.title}>{article?.title || initialTitle}</Text>

                            {showContentShimmer ? (
                                <ArticleDetailShimmer />
                            ) : article && (
                                <>
                                    <View style={styles.metadataRow}>
                                        <View style={styles.metaItem}>
                                            <Clock size={14} color={colors.textLight} />
                                            <Text style={styles.metaText}>
                                                {article.reading_time || 0} min read
                                            </Text>
                                        </View>
                                        <View style={styles.metaDivider} />
                                        <View style={styles.metaItem}>
                                            <Calendar size={14} color={colors.textLight} />
                                            <Text style={styles.metaText}>
                                                {article.published_at ? formatDate(article.published_at) : 'Recent'}
                                            </Text>
                                        </View>
                                        <View style={styles.metaDivider} />
                                        <View style={styles.metaItem}>
                                            <Eye size={14} color={colors.textLight} />
                                            <Text style={styles.metaText}>
                                                {article.view_count || 0} views
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.tagsContainer}>
                                        {article.tags?.map((tag) => (
                                            <View key={tag.id} style={styles.tagBadge}>
                                                <Text style={styles.tagText}>{tag.name}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Article Blocks Content */}
                                    <View style={styles.blocksContainer}>
                                        {article.blocks?.map((block, index) => (
                                            <BlockRenderer key={index} block={block} />
                                        ))}
                                    </View>

                                    {/* Author Mini Profile */}
                                    <View style={styles.authorMiniProfile}>
                                        <View style={styles.miniAvatarWrapper}>
                                            <Image 
                                                source={{ uri: getImageUrl(article.author?.avatar_url) }} 
                                                style={styles.miniAvatar} 
                                            />
                                        </View>
                                        <View>
                                            <Text style={styles.miniAuthorName}>Author</Text>
                                            {/* <Text style={styles.miniAuthorName}>{article.author?.role || 'Expert Contributor'}</Text> */}
                                            <Text style={styles.miniAuthorRole}>{article.author?.name || 'Author'}</Text>
                                        </View>
                                    </View>


                                    {/* Like & Share Actions */}
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, article.user_has_liked && styles.likedBtn]}
                                            onPress={handleLike}
                                            disabled={isLiking}
                                        >
                                            <Heart
                                                size={20}
                                                color={article.user_has_liked ? '#FFF' : colors.text}
                                                fill={article.user_has_liked ? '#FFF' : 'transparent'}
                                            />
                                            <Text style={[styles.actionBtnText, article.user_has_liked && styles.likedBtnText]}>
                                                {article.like_count || 0}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={handleShare}
                                        >
                                            <Share2 size={20} color={colors.text} />
                                            <Text style={styles.actionBtnText}>Share</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Article Content Ends Here */}
                                    <View style={styles.divider} />

                                    {/* Inline Comment Input */}
                                    <View style={styles.inlineCommentInput}>
                                        <Text style={styles.sectionTitle}>Comments ({article.comment_count || 0})</Text>
                                        
                                        {!replyingTo && !editingComment && (
                                            <View style={styles.commentInputBox}>
                                            <View style={styles.inputRow}>
                                                <View style={styles.currentUserAvatar}>
                                                    {user?.avatar_url ? (
                                                        <Image
                                                            source={{ uri: getImageUrl(user.avatar_url) }}
                                                            style={styles.smallAvatar}
                                                        />
                                                    ) : (
                                                        <View
                                                            style={[styles.smallAvatar, styles.placeholderAvatar]}
                                                        >
                                                            <UserIcon size={12} color={colors.textMuted} />
                                                        </View>
                                                    )}
                                                </View>
                                                <TextInput
                                                    style={styles.inlineInput}
                                                    placeholder="Share your thoughts..."
                                                    placeholderTextColor={colors.textMuted}
                                                    value={commentText}
                                                    onChangeText={setCommentText}
                                                    multiline
                                                />
                                                <TouchableOpacity
                                                    style={[styles.inlineSendBtn, (!commentText.trim() || isSubmittingComment) && styles.disabledSend]}
                                                    onPress={handleSubmitComment}
                                                    disabled={!commentText.trim() || isSubmittingComment}
                                                >
                                                    {isSubmittingComment ? (
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                    ) : (
                                                        <Send size={18} color="#FFF" />
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                            </View>
                                        )}
                                    </View>

                                    <ArticleCommentSection
                                        comments={comments}
                                        isLoading={commentsLoading}
                                        commentCount={article.comment_count}
                                        onLikeComment={handleLikeComment}
                                        onReply={setReplyingTo}
                                        currentUserId={user?.id}
                                        onOptions={handleCommentOptions}
                                        editingCommentId={editingComment?.id}
                                        editingText={editingText}
                                        setEditingText={setEditingText}
                                        onSaveEdit={handleSubmitComment}
                                        onCancelEdit={() => { setEditingComment(null); setEditingText(''); }}
                                        isEditingLoading={isSubmittingComment}
                                        replyingToId={replyingTo?.id}
                                        replyText={commentText}
                                        setReplyText={setCommentText}
                                        onSaveReply={handleSubmitComment}
                                        onCancelReply={() => { setReplyingTo(null); setCommentText(''); }}
                                        isReplyLoading={isSubmittingComment}
                                    />
                                </>
                            )}
                        </View>
                    </Animated.ScrollView>
                </SafeAreaView>
            </KeyboardShiftView>
            <Toast message={toastMsg} onHide={() => setToastMsg(null)} type={toastType} />
            <ConfirmationModal
                visible={showDeleteModal}
                title="Delete Comment"
                message="Are you sure you want to delete this comment? This action cannot be undone."
                confirmText="Delete"
                isLoading={isDeletingComment}
                onConfirm={handleDeleteComment}
                onCancel={() => setShowDeleteModal(false)}
            />

            {/* Options Modal - Same as post detail */}
            <Modal
                statusBarTranslucent
                transparent
                visible={!!optionsTarget}
                animationType="fade"
                onRequestClose={() => setOptionsTarget(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setOptionsTarget(null)}
                >
                    <View style={styles.optionsMenu}>
                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => {
                                    if (optionsTarget) {
                                        setEditingComment(optionsTarget);
                                        setEditingText(optionsTarget.content);
                                        setReplyingTo(null);
                                        setOptionsTarget(null);
                                    }
                                }}
                            >
                                <Edit2 size={20} color={colors.text} />
                                <Text style={styles.optionText}>Edit Comment</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => {
                                    if (optionsTarget) {
                                        confirmDeleteComment(optionsTarget.id);
                                    }
                                }}
                            >
                                <Trash2 size={20} color={colors.error} />
                                <Text style={[styles.optionText, { color: colors.error }]}>Delete Comment</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Custom Delete Confirmation Modal */}
                <Modal
                    statusBarTranslucent
                    transparent
                    visible={showDeleteModal}
                    animationType="fade"
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.modalOverlayDelete}>
                        <View style={styles.modalContentDelete}>
                            <Text style={styles.modalTitleDelete}>Delete Comment</Text>
                            <Text style={styles.modalMessageDelete}>
                                Are you sure you want to delete this comment?
                            </Text>
                            <View style={styles.modalActionsDelete}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtnDelete}
                                    onPress={() => setShowDeleteModal(false)}
                                    disabled={isDeletingComment}
                                >
                                    <Text style={styles.modalCancelTextDelete}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalDeleteBtnConfirm,
                                        isDeletingComment && { opacity: 0.7 },
                                    ]}
                                    onPress={handleDeleteComment}
                                    disabled={isDeletingComment}
                                >
                                    <Text style={styles.modalDeleteTextConfirm}>
                                        {isDeletingComment ? 'Deleting...' : 'Delete'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

// ================= BLOCK RENDERER =================

function BlockRenderer({ block }: { block: any }) {
    const { type, text, level, url, items, video_id, author, alt, caption } = block;

    switch (type) {
        case 'heading':
            return (
                <Text style={[styles.heading, level === 2 ? styles.h2 : styles.h3]}>
                    {text}
                </Text>
            );
        case 'paragraph':
            return <Text style={styles.paragraph}>{text}</Text>;
        case 'image':
            return (
                <View style={styles.imageBlock}>
                    <FlexibleCustomImage 
                        source={{ uri: getImageUrl(url) }} 
                        style={styles.blockImage} 
                        resizeMode="cover"
                    />
                    {caption && <Text style={styles.caption}>{caption}</Text>}
                </View>
            );
        case 'bullet_list':
            return (
                <View style={styles.listContainer}>
                    {items?.map((item: string, i: number) => (
                        <View key={i} style={styles.listItem}>
                            <View style={styles.bullet} />
                            <Text style={styles.listText}>{item}</Text>
                        </View>
                    ))}
                </View>
            );
        case 'numbered_list':
            return (
                <View style={styles.listContainer}>
                    {items?.map((item: string, i: number) => (
                        <View key={i} style={styles.listItem}>
                            <Text style={styles.listNumber}>{i + 1}.</Text>
                            <Text style={styles.listText}>{item}</Text>
                        </View>
                    ))}
                </View>
            );
        case 'quote':
            return (
                <View style={styles.quoteBlock}>
                    <Quote size={24} color={colors.primary} style={styles.quoteIcon} />
                    <View style={styles.quoteContent}>
                        <Text style={styles.quoteText}>{text}</Text>
                        {author && <Text style={styles.quoteAuthor}>— {author}</Text>}
                    </View>
                </View>
            );
        case 'highlight':
            return (
                <View style={styles.highlightBlock}>
                    <Text style={styles.highlightText}>{text}</Text>
                </View>
            );
        case 'divider':
            return <View style={styles.divider} />;
        case 'video':
            return (
                <TouchableOpacity
                    style={styles.videoBlock}
                    onPress={() =>
                        Linking.openURL(`https://www.youtube.com/watch?v=${video_id}`)
                    }
                >
                    <Image
                        source={{ uri: `https://img.youtube.com/vi/${video_id}/hqdefault.jpg` }}
                        style={styles.videoThumbnail}
                    />
                    <View style={styles.videoOverlay}>
                        <View style={styles.playBtn}>
                            <Play size={24} color="#FFF" fill="#FFF" />
                        </View>
                        <Text style={styles.videoText}>Watch Video</Text>
                    </View>
                </TouchableOpacity>
            );
        default:
            return null;
    }
}

// ================= AD PLACEHOLDER =================

function SquareAdPlaceholder() {
    return (
        <View style={styles.adContainer}>
            <View style={styles.adContent}>
                <View style={styles.adBadge}>
                    <Text style={styles.adBadgeText}>AD</Text>
                </View>
                <Text style={styles.adTitle}>Wellness Weekly</Text>
                <Text style={styles.adDesc}>
                    Get exclusive wellness tips delivered to your inbox.
                </Text>
                <TouchableOpacity style={styles.adBtn}>
                    <Text style={styles.adBtnText}>Join Now</Text>
                    <ExternalLink size={14} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ================= STYLES =================

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
    bannerContainer: {
        width: '100%',
        height: 200,
        position: 'relative',
    },
    banner: {
        width: '100%',
        height: '100%',
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
        paddingBottom: 40,
        gap: 8,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
    },
    optionText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'android' ? spacing.xxl : spacing.md,
        left: spacing.md,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 4,
    },
    headerFloatingInfo: {
        position: 'absolute',
        bottom: -20,
        left: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        zIndex: 11,
    },
    avatarWrapper: {
        padding: 4,
        backgroundColor: colors.background,
        borderRadius: 28,
        elevation: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    authorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    placeholderAvatar: {
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textLight,
    },
    headerTitles: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    authorName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: 30,
        paddingBottom: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        lineHeight: 36,
        marginBottom: 16,
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        color: colors.textLight,
        fontWeight: '500',
    },
    metaDivider: {
        width: 1,
        height: 12,
        backgroundColor: colors.border,
    },
    repliesContainer: {
        marginTop: 12,
        marginLeft: -44,
        paddingLeft: 16,
    },
    replyWrapper: {
        marginTop: 12,
        position: 'relative',
        paddingLeft: 24,
    },
    threadLine: {
        position: 'absolute',
        top: 20,
        bottom: -24,
        left: 0,
        width: 2,
        backgroundColor: colors.border,
        zIndex: -1,
    },
    curvedLine: {
        position: 'absolute',
        top: -30,
        left: 0,
        width: 16,
        height: 50,
        borderBottomLeftRadius: 16,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: colors.border,
    },
    replyAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: colors.border,
    },
    loadMoreWrapper: {
        marginTop: 8,
        marginLeft: 32, // Relative to thread line
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    tagBadge: {
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginVertical: 12,
        // paddingBottom: 20,
        // borderBottomWidth: 1,
        // borderBottomColor: colors.borderLight,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    likedBtn: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    likedBtnText: {
        color: '#FFF',
    },
    blocksContainer: {
        gap: 12,
        marginTop: 10,
    },
    heading: {
        fontWeight: '700',
        color: colors.text,
        marginTop: 12,
    },
    h2: {
        fontSize: 20,
        lineHeight: 28,
        color: colors.text,
        marginBottom: 4,
    },
    h3: {
        fontSize: 18,
        lineHeight: 24,
        color: colors.text,
        marginBottom: 4,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 24,
        color: colors.textLight, // Updated to match theme
        marginBottom: 12,
    },
    imageBlock: {
        marginVertical: 12,
    },
    blockImage: {
        width: '100%',
        borderRadius: 16,
        backgroundColor: colors.borderLight,
    },
    caption: {
        fontSize: 12,
        color: colors.textLight,
        textAlign: 'center',
        marginTop: 6,
        fontStyle: 'italic',
    },
    listContainer: {
        marginBottom: 4,
        gap: 6, // Reduced gap
    },
    listItem: {
        flexDirection: 'row',
        gap: 8, // Reduced gap
        marginBottom: 4,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginTop: 8,
    },
    listNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
    listText: {
        fontSize: 16,
        lineHeight: 18,
        color: colors.textLight,
        flex: 1,
    },
    quoteBlock: {
        flexDirection: 'row',
        gap: 16,
        backgroundColor: colors.surface,
        paddingVertical: 24,
        borderRadius: 16,
        marginVertical: 16,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    quoteIcon: {
        opacity: 0.2,
    },
    quoteContent: {
        flex: 1,
    },
    quoteText: {
        fontSize: 16,
        fontStyle: 'italic',
        color: colors.text,
        lineHeight: 28,
        marginBottom: 8,
    },
    quoteAuthor: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textLight,
    },
    highlightBlock: {
        backgroundColor: colors.websiteSubtitle,
        padding: 24,
        borderRadius: 16,
        marginVertical: 16,
    },
    highlightText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        lineHeight: 28,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: 24,
        width: '40%',
        alignSelf: 'center',
    },
    videoBlock: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginVertical: 12,
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    playBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 4,
    },
    videoText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    adContainer: {
        marginVertical: 24,
        padding: 4,
        backgroundColor: colors.borderLight,
        borderRadius: 20,
    },
    adContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    adBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.textMuted,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 12,
    },
    adBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    adTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    adDesc: {
        fontSize: 14,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    adBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    adBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    authorSection: {
        marginTop: 48,
        paddingTop: 48,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    authorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    authorBioAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
    },
    fullAvatar: {
        width: '100%',
        height: '100%',
    },
    bioName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    bioText: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
        flexShrink: 1,
    },
    // Inline Comment Styles
    inlineCommentInput: {
        marginTop: 32,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    commentInputBox: {
        backgroundColor: colors.borderLight,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: 4,
        overflow: 'hidden',
    },
    replyContext: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.borderLight + '40',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    replyContextText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    cancelReplyText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 4,
    },
    currentUserAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 4,
    },
    smallAvatar: {
        width: '100%',
        height: '100%',
    },
    inlineInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        color: colors.text,
        fontSize: 14,
    },
    inlineSendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledSend: {
        backgroundColor: colors.borderLight,
        opacity: 0.5,
    },
    // Mini Author Profile
    authorMiniProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 16,
        padding: 12,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    miniAvatarWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: colors.borderLight,
    },
    miniAvatar: {
        width: '100%',
        height: '100%',
    },
    miniAuthorName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    miniAuthorRole: {
        fontSize: 12,
        color: colors.textLight,
    },
    // Modals Delete
    modalOverlayDelete: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContentDelete: {
        backgroundColor: colors.card,
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    modalTitleDelete: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
    },
    modalMessageDelete: {
        fontSize: 14,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    modalActionsDelete: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalCancelBtnDelete: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.borderLight + '40',
        alignItems: 'center',
    },
    modalCancelTextDelete: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    modalDeleteBtnConfirm: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.error,
        alignItems: 'center',
    },
    modalDeleteTextConfirm: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
});
