import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Animated } from 'react-native';
import { Heart, MoreHorizontal } from 'lucide-react-native';
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
    // Flatten the comments tree into a single array for virtualization
    const flattenedComments = React.useMemo(() => {
        const result: (Comment & { depth: number; isReply?: boolean })[] = [];
        
        const flatten = (items: Comment[], depth = 0) => {
            items.forEach(item => {
                if (!item) return;
                result.push({ ...item, depth, isReply: depth > 0 });
                if (Array.isArray(item.replies) && item.replies.length > 0) {
                    flatten(item.replies as Comment[], depth + 1);
                }
            });
        };
        
        flatten(comments);
        return result;
    }, [comments]);

    const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});

    const toggleTextExpand = (commentId: string) => {
        setExpandedText(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const renderCommentText = (content: any, id: string) => {
        const fullText = parseContent(content);
        const words = fullText.split(/\s+/);
        const isLong = words.length > 180;
        const isExpanded = expandedText[id];
        const displayedText = isLong && !isExpanded 
            ? words.slice(0, 180).join(' ') + '...' 
            : fullText;

        return (
            <View>
                <Text style={styles.text}>{displayedText}</Text>
                {isLong && (
                    <TouchableOpacity onPress={() => toggleTextExpand(id)}>
                        <Text style={styles.readMoreBtn}>
                            {isExpanded ? 'Show less' : 'Read more'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderComment = ({ item }: { item: Comment & { depth: number; isReply?: boolean } }) => (
        <View style={[
            styles.commentContainer, 
            item.depth > 0 && { marginLeft: Math.min(item.depth * 20, 60), marginBottom: 12 }
        ]}>
            <Image
                source={{ uri: getImageUrl(item.user?.avatar_url) }}
                style={item.depth > 0 ? styles.replyAvatar : styles.avatar}
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

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onReply(item)}
                    >
                        <Text style={styles.actionText}>Reply</Text>
                    </TouchableOpacity>
                </View>
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
                    data={flattenedComments}
                    renderItem={renderComment}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.listContent}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={5}
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
    }
});
