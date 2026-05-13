import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Animated } from 'react-native';
import { Heart, MoreHorizontal, MessageCircle } from 'lucide-react-native';
import { colors } from '../../constants/theme';
import { Comment } from '../../types/database';
import { parseContent } from '../../utils/content';
import { CommentShimmer } from '../shimmers/CommentShimmer';
import { formatNumber, formatDate } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';

interface CommentSectionProps {
    comments: Comment[];
    isLoading?: boolean;
    commentCount?: number;
    onLikeComment: (commentId: string) => void;
    onReply: (comment: Comment) => void;
    currentUserId?: string;
    isAdmin?: boolean;
    onOptions?: (comment: Comment) => void;
}



export const CommentSection = ({ comments, isLoading, commentCount, onLikeComment, onReply, currentUserId, isAdmin, onOptions }: CommentSectionProps) => {
    const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});
    const [visibleReplies, setVisibleReplies] = useState<Record<string, number>>({});

    const toggleTextExpand = (commentId: string) => {
        setExpandedText(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const loadMoreReplies = (commentId: string) => {
        setVisibleReplies(prev => ({
            ...prev,
            [commentId]: (prev[commentId] || 1) + 5
        }));
    };

    // Flatten the comments tree into a single array for virtualization
    const flattenedComments = React.useMemo(() => {
        const result: (any)[] = [];
        
        const flatten = (items: Comment[], depth = 0, parentId: string | null = null) => {
            items.forEach((item, index) => {
                if (!item) return;
                
                const replies = Array.isArray(item.replies) ? item.replies : [];
                const limit = visibleReplies[item.id] || 1;
                
                result.push({ 
                    ...item, 
                    depth, 
                    isReply: depth > 0, 
                    totalReplies: replies.length,
                    visibleCount: limit,
                    type: 'comment'
                });

                if (depth === 0 && replies.length > 0) {
                    const shownReplies = replies.slice(0, limit);
                    flatten(shownReplies as Comment[], depth + 1, item.id);
                    
                    // Inject Load More button at the END of the visible replies
                    if (replies.length > limit) {
                        result.push({
                            id: `load-more-${item.id}`,
                            parentId: item.id,
                            depth: 1,
                            type: 'load-more',
                            remaining: replies.length - limit
                        });
                    }
                }
            });
        };
        
        flatten(comments);
        return result;
    }, [comments, visibleReplies]);

    const renderCommentText = (content: any, id: string) => {
        const fullText = parseContent(content);
        const words = fullText.split(/\s+/);
        
        // 100 words limit for display (though DB might have more)
        const isTooLong = words.length > 100;
        const textToProcess = isTooLong ? words.slice(0, 100).join(' ') + '...' : fullText;
        
        const isExpanded = expandedText[id];

        return (
            <View>
                <Text 
                    style={styles.text}
                    numberOfLines={isExpanded ? undefined : 2}
                    ellipsizeMode="tail"
                >
                    {textToProcess}
                </Text>
                {(isTooLong || fullText.length > 120) && (
                    <TouchableOpacity onPress={() => toggleTextExpand(id)}>
                        <Text style={styles.readMoreBtn}>
                            {isExpanded ? 'Show less' : 'Read more'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderComment = ({ item, index }: { item: any, index: number }) => {
        const isChild = item.depth > 0;
        const nextItem = index < flattenedComments.length - 1 ? flattenedComments[index + 1] : null;
        const isLastChildOfParent = isChild && (!nextItem || nextItem.depth === 0);
        const hasChildren = item.depth === 0 && (nextItem && nextItem.depth > 0);

        if (item.type === 'load-more') {
            return (
                <View style={[styles.commentContainer, { marginLeft: 44, marginBottom: 16 }]}>
                    <View style={[styles.modernCurveContainer, { height: 24, bottom: undefined }]}>
                        <View style={[styles.threadVerticalPart, { height: 24 }]} />
                        <View style={styles.threadCurvePart} />
                    </View>
                    <TouchableOpacity 
                        onPress={() => loadMoreReplies(item.parentId)}
                        style={styles.loadMoreRepliesBtn}
                    >
                        <Text style={styles.loadMoreRepliesText}>
                            Show {item.remaining} more replies
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={[
                styles.commentContainer, 
                isChild && { marginLeft: 44, marginBottom: 16 }
            ]}>
                {/* Modern Curved Thread Connector for Children */}
                {isChild && (
                    <View style={styles.modernCurveContainer}>
                        {/* Vertical line that continues from above */}
                        <View style={[
                            styles.threadVerticalPart,
                            isLastChildOfParent && styles.threadVerticalLastChild
                        ]} />
                        {/* The curve that branches to the avatar */}
                        <View style={styles.threadCurvePart} />
                    </View>
                )}

                {/* Straight Line for Parent (while children exist below) */}
                {hasChildren && (
                    <View style={styles.parentVerticalLine} />
                )}

                <Image
                    source={{ uri: getImageUrl(item.user?.avatar_url) }}
                    style={isChild ? styles.replyAvatar : styles.avatar}
                />
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.username}>{item.user?.name || 'User'}</Text>
                        <Text style={styles.time}>{formatDate(item.created_at)}</Text>
                        {(currentUserId === item.user_id || isAdmin) && onOptions && (
                            <TouchableOpacity onPress={() => onOptions(item)} style={{ marginLeft: 'auto', padding: 4 }}>
                                <MoreHorizontal size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    {renderCommentText(item.content, item.id)}

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => onLikeComment(item.id)}
                        >
                            <Heart
                                size={14}
                                color={item.user_has_liked ? colors.primary : colors.textMuted}
                                fill={item.user_has_liked ? colors.primary : 'transparent'}
                            />
                            <Text style={[styles.actionText, item.user_has_liked && styles.likedText]}>
                                {item.likes_count > 0 ? item.likes_count : 'Like'}
                            </Text>
                        </TouchableOpacity>

                        {/* Limit to 2 levels: Only show Reply if depth is 0 */}
                        {item.depth === 0 && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => onReply(item)}
                            >
                                <Text style={styles.actionText}>Reply</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const displayCount = commentCount !== undefined ? commentCount : comments.length;

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Comments ({formatNumber(displayCount)})</Text>

            {isLoading ? (
                <>
                    <CommentShimmer />
                    <CommentShimmer />
                    <CommentShimmer />
                </>
            ) : comments.length > 0 ? (
                <FlatList
                    data={flattenedComments}
                    renderItem={renderComment}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.listContent}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={5}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <MessageCircle size={28} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>Be the first to comment</Text>
                    <Text style={styles.emptySubtitle}>Share your thoughts and start a conversation.</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingVertical: 12,
        backgroundColor: colors.background,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        color: colors.text,
    },
    listContent: {
        paddingBottom: 20,
    },
    commentContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
        backgroundColor: colors.border,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    username: {
        fontWeight: '600',
        fontSize: 13,
        color: colors.text,
    },
    time: {
        fontSize: 11,
        color: colors.textMuted,
    },
    text: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '500',
    },
    likedText: {
        color: colors.primary,
    },
    repliesContainer: {
        marginTop: 12,
        paddingLeft: 16,
        marginLeft: -44,
    },
    replyItemWrapper: {
        position: 'relative',
        marginBottom: 12,
        paddingLeft: 24,
    },
    threadLine: {
        position: 'absolute',
        top: 20,
        bottom: -18,
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
    replyItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    replyAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
        backgroundColor: colors.border,
    },
    loadMoreWrapper: {
        position: 'relative',
        paddingLeft: 24,
        marginTop: 4,
    },
    loadMoreText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
        marginLeft: 32,
    },
    readMoreBtn: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginTop: 4,
    },
    modernCurveContainer: {
        position: 'absolute',
        left: -29, // 44 - 15 = 29 (Distance between parent line and child avatar start)
        top: -24, // Matches the spacing/margin between comments
        bottom: 0,
        width: 29,
        zIndex: -1,
    },
    threadVerticalPart: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: colors.border,
    },
    threadVerticalLastChild: {
        height: 24, // Terminate exactly at the start of the curve branch
        bottom: undefined,
    },
    threadCurvePart: {
        position: 'absolute',
        left: 0,
        top: 24, // Adjust to hit center of child avatar (12px down from top, plus container offset)
        width: 20,
        height: 14,
        borderBottomLeftRadius: 12,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: colors.border,
    },
    parentVerticalLine: {
        position: 'absolute',
        left: 15, // Centered under parent avatar
        top: 40, // Start slightly below parent avatar (avatar is 32px + 4px gap)
        bottom: -24, // Extend to meet the first child's curve container
        width: 2,
        backgroundColor: colors.border,
        zIndex: -1,
    },
    loadMoreRepliesBtn: {
        // marginTop: 0,
        paddingVertical: 4,
    },
    loadMoreRepliesText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '700',
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        paddingHorizontal: 32,
        lineHeight: 20,
    }
});
