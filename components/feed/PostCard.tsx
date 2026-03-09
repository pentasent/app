import { CustomImage as Image } from '@/components/CustomImage';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Heart, MessageCircle, Share2, MoreHorizontal, Eye, BarChart2, BarChart, BarChart3, BarChart4 } from 'lucide-react-native';
import { colors } from '../../constants/theme';
import { Post } from '../../types/database';

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
                            <View style={styles.metaRow}>
                                {post.community && (
                                    <Text style={styles.communityName}>{post.community.name} • </Text>
                                )}
                                <Text style={styles.time}>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                            </View>
                        </View>
                    </View>
                    {/* <TouchableOpacity onPress={onShare} style={styles.moreButton}>
                        <Share2 size={20} color={colors.textMuted} />
                    </TouchableOpacity> */}
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    {post.title && <Text style={styles.title}>{post.title}</Text>}
                    <Text style={styles.bodyText} numberOfLines={3}>{postContent}</Text>
                </View>

                {/* Media */}
                {post.images && post.images.length > 0 && (
                    <Image
                        source={{ uri: post.images[0].image_url }}
                        style={styles.postImage}
                        resizeMode="cover"
                    />
                )}

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={onLike}>
                        <Heart
                            size={20}
                            color={post.user_has_liked ? colors.error : colors.textMuted}
                            fill={post.user_has_liked ? colors.error : 'transparent'}
                        />
                        <Text style={[styles.actionText, post.user_has_liked && styles.likedText]}>
                            {post.likes_count > 0 ? formatNumber(post.likes_count) : 'Like'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={onComment}>
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

                    <View style={styles.actionButton}>
                        <TouchableOpacity onPress={onShare} style={styles.moreButton}>
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
        backgroundColor: '#E1E4E8',
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
    }
});
