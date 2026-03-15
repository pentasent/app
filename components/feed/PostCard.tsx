import React from 'react';
import { CustomImage as Image } from '@/components/CustomImage';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Heart, MessageCircle, Share2, MoreHorizontal, Eye, BarChart2, BarChart, BarChart3, BarChart4 } from 'lucide-react-native';
import { colors, spacing } from '../../constants/theme';
import { Post } from '../../types/database';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence,
    withDelay
} from 'react-native-reanimated';
import { CloudUpload } from 'lucide-react-native';
import { DotsLoader } from '../DotsLoader';

import { formatNumber } from '../../utils/format';

interface PostCardProps {
    post: Post;
    onPress: () => void;
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
    onMore?: () => void;
}

export const PostCard = ({ post, onPress, onLike, onComment, onShare, onMore }: PostCardProps) => {
    // Extract text from JSONB doc if needed
    const getContentText = (content: any) => {
        if (typeof content === 'string') return content;
        if (content?.type === 'doc' && Array.isArray(content.content)) {
            return content.content.map((block: any) => {
                if (block.type === 'paragraph' && Array.isArray(block.content)) {
                    return block.content.map((t: any) => t.text).join(' ');
                }
                return '';
            }).join('\n');
        }
        return 'Content available';
    };

    const postContent = getContentText(post.content);

    return (
        <View style={styles.container}>
            <Pressable onPress={onPress}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <Image
                            source={{ uri: post.user?.avatar_url || 'https://via.placeholder.com/40' }}
                            style={styles.avatar}
                        />
                        <View>
                            <Text style={styles.name}>{post.user?.name || 'Anonymous'}</Text>
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
                                    {post.is_uploading 
                                        ? 'Just now' 
                                        : new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    {post.title && <Text style={styles.title}>{post.title}</Text>}
                    <Text style={styles.bodyText} numberOfLines={post.is_uploading ? 5 : 3}>{postContent}</Text>
                </View>

                {/* Media */}
                {(post.images && post.images.length > 0) || (post.is_uploading && post.local_image_urls && post.local_image_urls.length > 0) ? (
                    <View style={styles.mediaWrapper}>
                        <Image
                            source={{ uri: (post.images?.[0]?.image_url) || (post.local_image_urls?.[0]) }}
                            style={styles.postImage}
                            resizeMode="cover"
                        />
                        {/* {post.is_uploading && (
                            <View style={styles.imageOverlay}>
                                <ActivityIndicator color="#FFF" size="small" />
                            </View>
                        )} */}
                        {((post.images?.length || 0) > 1 || (post.local_image_urls?.length || 0) > 1) && (
                            <View style={styles.imageCountBadge}>
                                <Text style={styles.imageCountText}>
                                    +{(post.images?.length || post.local_image_urls?.length || 1) - 1}
                                </Text>
                            </View>
                        )}
                    </View>
                ) : null}

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={onLike}
                    >
                        <Heart
                            size={20}
                            color={post.user_has_liked ? colors.error : colors.textMuted}
                            fill={post.user_has_liked ? colors.error : 'transparent'}
                        />
                        <Text style={[styles.actionText, post.user_has_liked && styles.likedText]}>
                            {post.likes_count > 0 ? formatNumber(post.likes_count) : 'Like'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={onComment}
                    >
                        <MessageCircle size={20} color={colors.textMuted} />
                        <Text style={styles.actionText}>
                            {post.comments_count > 0 ? formatNumber(post.comments_count) : 'Comment'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.actionButton}>
                        <BarChart2 size={20} color={colors.textMuted} />
                        <Text style={styles.actionText}>
                            {post.views_count > 0 ? formatNumber(post.views_count) : 'View'}
                        </Text>
                    </View>

                    <View style={[styles.actionButton, { gap: 16 }]}>
                        {onMore && (
                            <TouchableOpacity 
                                onPress={onMore} 
                                style={styles.moreButton}
                                disabled={post.is_uploading}
                            >
                                <MoreHorizontal size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            onPress={onShare} 
                            style={styles.moreButton}
                        >
                            <Share2 size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background, // Match feed background
        marginBottom: 1, // Tiny separator
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        marginBottom: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: colors.background,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
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
    moreButton: {
        padding: 4,
    },
    contentContainer: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        color: colors.text,
    },
    bodyText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },
    postImage: {
        width: '100%',
        height: 250,
        marginTop: 4,
        // borderRadius: 12,
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginHorizontal: 16,
        marginTop: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 24, // Spacing between actions
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textMuted,
    },
    likedText: {
        color: colors.error,
    },
    uploadBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '10',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    uploadText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 3,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.primary,
    },
    mediaWrapper: {
        position: 'relative',
        width: '100%',
        height: 250,
        marginTop: 4,
        overflow: 'hidden',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageCountBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    imageCountText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    }
});
