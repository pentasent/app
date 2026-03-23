import { CustomImage as Image } from '@/components/CustomImage';
import { CommentShimmer } from '@/components/shimmers/CommentShimmer';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Heart, MoreHorizontal } from 'lucide-react-native';
import { colors } from '../../constants/theme';
import { ArticleComment } from '../../types/database';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';

interface ArticleCommentSectionProps {
    comments: ArticleComment[];
    isLoading?: boolean;
    commentCount?: number;
    onLikeComment: (comment: ArticleComment) => void;
    onReply: (comment: ArticleComment) => void;
    currentUserId?: string;
    onOptions?: (comment: ArticleComment) => void;
    editingCommentId?: string | null;
    editingText?: string;
    setEditingText?: (text: string) => void;
    onSaveEdit?: () => void;
    onCancelEdit?: () => void;
    isEditingLoading?: boolean;
    replyingToId?: string | null;
    replyText?: string;
    setReplyText?: (text: string) => void;
    onSaveReply?: () => void;
    onCancelReply?: () => void;
    isReplyLoading?: boolean;
}

export const ArticleCommentSection = ({ 
    comments, 
    isLoading, 
    commentCount, 
    onLikeComment, 
    onReply, 
    currentUserId,
    onOptions,
    editingCommentId,
    editingText,
    setEditingText,
    onSaveEdit,
    onCancelEdit,
    isEditingLoading,
    replyingToId,
    replyText,
    setReplyText,
    onSaveReply,
    onCancelReply,
    isReplyLoading,
}: ArticleCommentSectionProps) => {

    const [mainPage, setMainPage] = useState(1);
    const [expandedReplies, setExpandedReplies] = useState<Record<string, number>>({});

    const showReplies = (id: string, count: number) => {
        setExpandedReplies(prev => ({ ...prev, [id]: count }));
    };

    const renderComment = ({ item, level = 0 }: { item: ArticleComment, level?: number }) => {
        const hasReplies = item.replies && item.replies.length > 0;
        const isEditing = editingCommentId === item.id;
        
        // Pagination logic for replies
        const allReplies = item.replies || [];
        const visibleRepliesCount = expandedReplies[item.id] || 0;
        const visibleReplies = allReplies.slice(0, visibleRepliesCount);
        const hiddenRepliesCount = allReplies.length - visibleReplies.length;

        return (
            <View key={item.id} style={[styles.commentContainer, level > 0 && styles.replyWrapper]}>
                {level > 0 && <View style={styles.curvedLine} />}
                
                <Image
                    source={{ uri: getImageUrl(item.user?.avatar_url) }}
                    style={level > 0 ? styles.replyAvatar : styles.avatar}
                />

                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.username}>{item.user?.name || 'Member'}</Text>
                            <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
                        </View>
                        {currentUserId === item.user_id && !isEditing && (
                            <TouchableOpacity onPress={() => onOptions?.(item)} style={{ padding: 4 }}>
                                <MoreHorizontal size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isEditing ? (
                        <View style={styles.inlineEditContainer}>
                            <TextInput
                                style={styles.inlineEditInput}
                                value={editingText}
                                onChangeText={setEditingText}
                                multiline
                            />
                            <View style={styles.inlineEditActions}>
                                <TouchableOpacity onPress={onCancelEdit} style={styles.editActionBtn}>
                                    <Text style={styles.editActionTextCancel}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={onSaveEdit} 
                                    style={[styles.editActionBtn, styles.editActionBtnSave]}
                                    disabled={isEditingLoading || !editingText?.trim()}
                                >
                                    {isEditingLoading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.editActionTextSave}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.text}>{item.content}</Text>
                    )}

                    {!isEditing && (
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => onLikeComment(item)}
                            >
                                <Heart
                                    size={14}
                                    color={item.user_has_liked ? colors.error : colors.textMuted}
                                    fill={item.user_has_liked ? colors.error : 'transparent'}
                                />
                                <Text style={[styles.actionText, item.user_has_liked && styles.likedText]}>
                                    {Number(item.like_count || 0) > 0 ? item.like_count : 'Like'}
                                </Text>
                            </TouchableOpacity>

                            {/* Only allow reply on top level comments (Level 0) */}
                            {level === 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => onReply(item)}
                                    >
                                        <Text style={styles.actionText}>Reply</Text>
                                    </TouchableOpacity>
                                    
                                    {allReplies.length > 0 && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { marginLeft: 16 }]}
                                            onPress={() => showReplies(item.id, visibleRepliesCount > 0 ? 0 : Math.min(5, allReplies.length))}
                                        >
                                            <Text style={styles.actionText}>
                                                {visibleRepliesCount > 0 ? 'Hide replies' : `${allReplies.length} ${allReplies.length === 1 ? 'reply' : 'replies'}`}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {replyingToId === item.id && (
                        <View style={styles.inlineEditContainer}>
                            <TextInput
                                style={styles.inlineEditInput}
                                value={replyText}
                                onChangeText={setReplyText}
                                placeholder={`Reply to ${item.user?.name}...`}
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />
                            <View style={styles.inlineEditActions}>
                                <TouchableOpacity onPress={onCancelReply} style={styles.editActionBtn}>
                                    <Text style={styles.editActionTextCancel}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={onSaveReply} 
                                    style={[styles.editActionBtn, styles.editActionBtnSave]}
                                    disabled={isReplyLoading || !replyText?.trim()}
                                >
                                    {isReplyLoading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.editActionTextSave}>Reply</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Nested Replies Rendering */}
                    {hasReplies && visibleRepliesCount > 0 && (
                        <View style={styles.repliesContainer}>
                            {visibleReplies.map((reply, index) => {
                                const isLast = index === visibleReplies.length - 1;
                                return (
                                    <View key={reply.id} style={{ position: 'relative' }}>
                                        {(!isLast || hiddenRepliesCount > 0) && <View style={styles.threadLine} />}
                                        {renderComment({ item: reply, level: level + 1 })}
                                    </View>
                                );
                            })}
                            
                            {/* Nested Load More */}
                            {hiddenRepliesCount > 0 && (
                                <TouchableOpacity 
                                    onPress={() => showReplies(item.id, visibleRepliesCount + 5)}
                                    style={styles.loadMoreWrapper}
                                >
                                    <Text style={styles.loadMoreText}>Show {Math.min(5, hiddenRepliesCount)} more</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const displayCount = commentCount !== undefined ? commentCount : comments.length;
    
    // Main comment pagination logic
    const visibleMainCount = mainPage * 20;
    const visibleMainComments = comments.slice(0, visibleMainCount);
    const hiddenMainCount = comments.length - visibleMainComments.length;

    return (
        <View style={styles.container}>
            {/* <Text style={styles.headerTitle}>Comments ({formatNumber(displayCount)})</Text> */}
            {isLoading ? (
                <View style={{ padding: 20 }}>
                     {[1, 2, 3].map(i => <CommentShimmer key={i} />)}
                </View>
            ) : (
                <View style={styles.listContent}>
                    {visibleMainComments.map(comment => renderComment({ item: comment }))}
                    
                    {/* Main List Show More */}
                    {hiddenMainCount > 0 && (
                        <TouchableOpacity 
                            onPress={() => setMainPage(prev => prev + 1)}
                            style={styles.mainLoadMore}
                        >
                            <Text style={styles.loadMoreText}>Load next {Math.min(20, hiddenMainCount)} {Math.min(20, hiddenMainCount) === 1 ? 'comment' : 'comments'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
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
        marginBottom: 24,
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
        fontSize: 14,
        color: colors.text,
    },
    time: {
        fontSize: 12,
        color: colors.textMuted,
    },
    text: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        marginBottom: 8,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '500',
    },
    likedText: {
        color: colors.error,
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
        marginLeft: 32,
    },
    mainLoadMore: {
        marginTop: 8,
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    loadMoreText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
    },
    // Inline Edit Styles
    inlineEditContainer: {
        marginTop: 8,
        backgroundColor: colors.borderLight + '20',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inlineEditInput: {
        fontSize: 14,
        color: colors.text,
        minHeight: 60,
        textAlignVertical: 'top',
        padding: 8,
    },
    inlineEditActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    editActionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    editActionBtnSave: {
        backgroundColor: colors.primary,
    },
    editActionTextCancel: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '600',
    },
    editActionTextSave: {
        fontSize: 13,
        color: '#FFF',
        fontWeight: '700',
    },
});
