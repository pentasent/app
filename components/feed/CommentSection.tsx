import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Animated } from 'react-native';
import { Heart, MoreHorizontal } from 'lucide-react-native';
import { colors } from '../../constants/theme';
import { Comment } from '../../types/database';
import { parseContent } from '../../utils/content';
import { CommentShimmer } from '../shimmers/CommentShimmer';
import { formatNumber } from '@/utils/format';

interface CommentSectionProps {
    comments: Comment[];
    isLoading?: boolean;
    commentCount?: number;
    onLikeComment: (commentId: string) => void;
    onReply: (comment: Comment) => void;
    currentUserId?: string;
    onOptions?: (comment: Comment) => void;
}



export const CommentSection = ({ comments, isLoading, commentCount, onLikeComment, onReply, currentUserId, onOptions }: CommentSectionProps) => {
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

    const toggleExpand = (commentId: string) => {
        setExpandedComments(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentContainer}>
            <Image
                source={{ uri: item.user?.avatar_url || 'https://via.placeholder.com/32' }}
                style={styles.avatar}
            />
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <Text style={styles.username}>{item.user?.name || item.user?.name || 'User'}</Text>
                    <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    {currentUserId === item.user_id && onOptions && (
                        <TouchableOpacity onPress={() => onOptions(item)} style={{ marginLeft: 'auto', padding: 4 }}>
                            <MoreHorizontal size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.text}>{parseContent(item.content)}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onLikeComment(item.id)}
                    >
                        <Heart
                            size={14}
                            color={item.user_has_liked ? colors.error : colors.textMuted}
                            fill={item.user_has_liked ? colors.error : 'transparent'}
                        />
                        <Text style={[styles.actionText, item.user_has_liked && styles.likedText]}>
                            {item.likes_count > 0 ? item.likes_count : 'Like'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onReply(item)}
                    >
                        <Text style={styles.actionText}>Reply</Text>
                    </TouchableOpacity>
                </View>

                {/* Nested Replies */}
                {Array.isArray(item.replies) && item.replies.filter(Boolean).length > 0 && (
                    <View style={styles.repliesContainer}>
                        {(() => {
                            const allReplies = item.replies.filter(Boolean);
                            const isExpanded = expandedComments[item.id];
                            const visibleReplies = isExpanded ? allReplies : allReplies.slice(0, 2);
                            const hiddenCount = allReplies.length - visibleReplies.length;

                            return (
                                <>
                                    {visibleReplies.map((reply, index, array) => {
                                        const isLast = index === array.length - 1;
                                        return (
                                            <View key={reply.id} style={styles.replyItemWrapper}>
                                                {/* The continuous vertical drop line - hidden on the very last item below the curve */}
                                                {!isLast && <View style={styles.threadLine} />}

                                                {/* The curved branch to the specific avatar */}
                                                <View style={styles.curvedLine} />

                                                <View style={styles.replyItem}>
                                                    <Image
                                                        source={{ uri: reply.user?.avatar_url || 'https://via.placeholder.com/24' }}
                                                        style={styles.replyAvatar}
                                                    />
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <Text style={styles.username}>{reply.user?.name || reply.user?.name}</Text>
                                                            {currentUserId === reply.user_id && onOptions && (
                                                                <TouchableOpacity onPress={() => onOptions(reply)} style={{ padding: 4 }}>
                                                                    <MoreHorizontal size={14} color={colors.textMuted} />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                        <Text style={styles.text}>{parseContent(reply.content)}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}

                                    {!isExpanded && hiddenCount > 0 && (
                                        <View style={styles.loadMoreWrapper}>
                                            <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.actionButton}>
                                                <Text style={styles.loadMoreText}>Load more +{hiddenCount}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {isExpanded && allReplies.length > 2 && (
                                        <View style={styles.loadMoreWrapper}>
                                            <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.actionButton}>
                                                <Text style={styles.loadMoreText}>See less</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </>
                            );
                        })()}
                    </View>
                )}
            </View>
        </View>
    );

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
            ) : (
                <FlatList
                    data={comments}
                    renderItem={renderComment}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.listContent}
                />
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
        color: colors.error,
    },
    repliesContainer: {
        marginTop: 12,
        paddingLeft: 16, // Align exactly under the parent's avatar center (avatar width is 32, so center is 16)
        marginLeft: -44, // Pull back left to offset the flex layout of commentContent which is to the right of the avatar (avatar 32 + margin 12)
    },
    replyItemWrapper: {
        position: 'relative',
        marginBottom: 12,
        paddingLeft: 24, // Space for the curved line
    },
    threadLine: {
        position: 'absolute',
        top: 20, // Start just after the curve ends 
        bottom: -18, // Drop down to next item
        left: 0,
        width: 2,
        backgroundColor: colors.border,
        zIndex: -1,
    },
    curvedLine: {
        position: 'absolute',
        top: -30,         // Start higher up, closer to the parent avatar
        left: 0,
        width: 16,        // Horizontal reach of the curve to the child avatar
        height: 50,       // Vertical drop
        borderBottomLeftRadius: 16, // The curve
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
        paddingLeft: 24, // Matches replyItemWrapper
        marginTop: 4,
    },
    threadLineTail: {
        position: 'absolute',
        top: -12, // Connects to the previous comment's threadLine drop
        bottom: '50%', // Reaches exactly vertically to the center of the Load More button
        left: 0,
        width: 16,
        borderBottomLeftRadius: 16,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: colors.border,
    },
    loadMoreText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
        marginLeft: 32,
    }
});
