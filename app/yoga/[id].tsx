import { CustomImage as Image } from '@/components/CustomImage';

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Linking, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { ChevronLeft, Clock, BarChart2, Flame, Play, ExternalLink, PlayCircle, X, Eye } from 'lucide-react-native';
import { YogaContent, YogaImage, YogaSuggestedVideo } from '@/types/database';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';
import { YogaDetailShimmer } from '@/components/shimmers/YogaDetailShimmer';

const { width } = Dimensions.get('window');

// Simple renderer for rich text content (ProseMirror-like structure)
const RenderContent = ({ content }: { content: any }) => {
    if (!content || !content.content || !Array.isArray(content.content)) {
        return null;
    }

    return (
        <View style={styles.richTextContainer}>
            {content.content.map((block: any, index: number) => {
                switch (block.type) {
                    case 'heading':
                        const level = block.attrs?.level || 2;
                        return (
                            <Text key={index} style={[styles.richHeading, level === 1 ? styles.h1 : styles.h2]}>
                                {block.content?.map((c: any) => c.text).join('')}
                            </Text>
                        );
                    case 'paragraph':
                        return (
                            <Text key={index} style={styles.richParagraph}>
                                {block.content?.map((c: any, cIndex: number) => {
                                    if (c.type === 'text') {
                                        const isBold = c.marks?.some((m: any) => m.type === 'bold');
                                        const isItalic = c.marks?.some((m: any) => m.type === 'italic');
                                        const linkMark = c.marks?.find((m: any) => m.type === 'link');

                                        const style = {
                                            fontWeight: isBold ? 'bold' : 'normal',
                                            fontStyle: isItalic ? 'italic' : 'normal',
                                            color: linkMark ? colors.primary : (colors.text || '#4B5563')
                                        } as any;

                                        if (linkMark) {
                                            return (
                                                <Text
                                                    key={cIndex}
                                                    style={style}
                                                    onPress={() => Linking.openURL(linkMark.attrs.href)}
                                                >
                                                    {c.text}
                                                </Text>
                                            );
                                        }

                                        return <Text key={cIndex} style={style}>{c.text}</Text>;
                                    }
                                    return null;
                                })}
                            </Text>
                        );
                    case 'bulletList':
                        return (
                            <View key={index} style={styles.richList}>
                                {block.content?.map((listItem: any, liIndex: number) => (
                                    <View key={liIndex} style={styles.richListItem}>
                                        <Text style={styles.bulletPoint}>•</Text>
                                        <View style={{ flex: 1 }}>
                                            {listItem.content?.map((p: any, pIndex: number) => {
                                                if (p.type === 'paragraph') {
                                                    return (
                                                        <Text key={pIndex} style={styles.richListItemText}>
                                                            {p.content?.map((c: any) => c.text).join('')}
                                                        </Text>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        );
                    case 'blockquote':
                        return (
                            <View key={index} style={styles.blockquote}>
                                <Text style={styles.blockquoteText}>
                                    {block.content?.map((p: any) => p.content?.map((c: any) => c.text).join('')).join('\n')}
                                </Text>
                            </View>
                        );
                    default:
                        return null;
                }
            })}
        </View>
    );
};

export default function YogaDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [yoga, setYoga] = useState<YogaContent | null>(null);
    const [images, setImages] = useState<YogaImage[]>([]);
    const [suggestedVideos, setSuggestedVideos] = useState<YogaSuggestedVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);

            // Fetch Yoga Details
            const { data: yogaData, error: yogaError } = await supabase
                .from('yoga_contents')
                .select('*')
                .eq('id', id)
                .single();

            if (yogaError) throw yogaError;
            setYoga(yogaData);

            // Fetch Images
            const { data: imageData, error: imageError } = await supabase
                .from('yoga_images')
                .select('*')
                .eq('yoga_id', id)
                .order('order_index');

            if (imageError) throw imageError;
            setImages(imageData || []);

            // Fetch Suggested Videos
            const { data: videoData, error: videoError } = await supabase
                .from('yoga_suggested_videos')
                .select('*')
                .eq('yoga_id', id);

            if (videoError) throw videoError;
            setSuggestedVideos(videoData || []);

            // Increment view count
            // Fire and forget, but properly handled with fallback if RPC missing
            (async () => {
                const { error } = await supabase.rpc('increment_yoga_view_count', { yoga_id: id });
                if (error) {
                    console.log('RPC failed (likely missing function), falling back to manual update');
                    // Fallback: Fetch current count and increment manually
                    const { data: current, error: fetchError } = await supabase
                        .from('yoga_contents')
                        .select('views_count')
                        .eq('id', id)
                        .single();

                    if (current && !fetchError) {
                        const newCount = (current.views_count || 0) + 1;
                        await supabase
                            .from('yoga_contents')
                            .update({ views_count: newCount })
                            .eq('id', id);
                    }
                }
            })();



        } catch (error) {
            console.error('Error fetching yoga details:', error);
            router.back();
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenVideo = (url: string) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    if (loading) {
        return <YogaDetailShimmer />;
    }

    if (!yoga) return null;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" backgroundColor="transparent" translucent />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Banner */}
                <View style={styles.bannerContainer}>
                    {yoga.banner_image_url ? (
                        <Image source={{ uri: getImageUrl(yoga.banner_image_url) }} style={styles.banner} resizeMode="cover" />
                    ) : (
                        <LinearGradient
                            colors={[colors.primary, colors.primaryDark]}
                            style={styles.banner}
                        />
                    )}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                        style={StyleSheet.absoluteFill}
                    />

                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ChevronLeft color="white" size={28} />
                    </TouchableOpacity>

                    <View style={styles.bannerContent}>
                        <View style={styles.typeTag}>
                            <Text style={styles.typeText}>{yoga.type}</Text>
                        </View>
                        <Text style={styles.title}>{yoga.title}</Text>
                        <View style={styles.bannerStats}>
                            <View style={styles.statItem}>
                                <Clock size={16} color="white" />
                                <Text style={styles.statTextWhite}>{yoga.duration_minutes} min</Text>
                            </View>
                            <View style={styles.statDividerWhite} />
                            <View style={styles.statItem}>
                                <BarChart2 size={16} color="white" />
                                <Text style={styles.statTextWhite}>{yoga.difficulty_level}</Text>
                            </View>
                            <View style={styles.statDividerWhite} />
                            <View style={styles.statItem}>
                                <Eye size={16} color="white" />
                                <Text style={styles.statTextWhite}>{formatNumber(yoga.views_count)} views</Text>
                            </View>
                            {yoga.calories_burn_estimate && (
                                <>
                                    <View style={styles.statDividerWhite} />
                                    <View style={styles.statItem}>
                                        <Flame size={16} color="#FFD700" />
                                        <Text style={styles.statTextWhite}>{yoga.calories_burn_estimate} kcal</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    {/* Audio Player Placeholder */}
                    {!!yoga.audio_url && (
                        <View style={styles.audioPlayer}>
                            <TouchableOpacity style={styles.playButton}>
                                <Play size={24} color="white" fill="white" />
                            </TouchableOpacity>
                            <View style={styles.audioInfo}>
                                <Text style={styles.audioTitle}>Audio Guidance</Text>
                                <Text style={styles.audioDuration}>{yoga.duration_minutes}:00</Text>
                            </View>
                        </View>
                    )}

                    {/* Rich Content */}
                    {/* <Text style={styles.sectionTitle}>Instructions</Text> */}
                    <RenderContent content={yoga.content} />

                    {/* Additional Images */}
                    {/* Additional Images */}
                    {images.length > 0 && (
                        <View style={styles.imagesSection}>
                            <Text style={styles.sectionTitle}>Gallery</Text>
                            <ScrollView
                                horizontal={images.length > 1}
                                showsHorizontalScrollIndicator={false}
                                style={styles.imageScroll}
                                contentContainerStyle={{ paddingHorizontal: spacing.lg }}
                            >
                                {images.map((img, index) => (
                                    <View key={img.id} style={{ marginRight: (images.length > 1 && index !== images.length - 1) ? 12 : 0, width: images.length === 1 ? '100%' : undefined }}>
                                        <TouchableOpacity onPress={() => setFullScreenImage(img.image_url)}>
                                            <Image
                                                source={{ uri: getImageUrl(img.image_url) }}
                                                style={
                                                    images.length === 1
                                                        ? styles.singleImage
                                                        : styles.postImage
                                                }
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                        {img.caption && <Text style={styles.caption}>{img.caption}</Text>}
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Suggested Videos */}
                    {suggestedVideos.length > 0 && (
                        <View style={styles.videoSection}>
                            <Text style={styles.sectionTitle}>Related Videos</Text>
                            {suggestedVideos.map((video) => (
                                <TouchableOpacity
                                    key={video.id}
                                    style={styles.videoCard}
                                    onPress={() => handleOpenVideo(video.video_url)}
                                >
                                    <View style={styles.videoIcon}>
                                        <PlayCircle size={32} color={colors.primary} />
                                    </View>
                                    <View style={styles.videoInfo}>
                                        <Text style={styles.videoTitle}>{video.video_title}</Text>
                                        <Text style={styles.videoPlatform}>Watch on {video.platform}</Text>
                                    </View>
                                    <ExternalLink size={20} color={colors.textLight} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

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
        </View>
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
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
    },
    bannerContainer: {
        height: 350,
        position: 'relative',
        justifyContent: 'flex-end',
    },
    banner: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    bannerContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    typeTag: {
        backgroundColor: colors.primary,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    typeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 32,
        fontWeight: '800', // Extra bold
        color: 'white',
        marginBottom: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 10,
    },
    bannerStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statTextWhite: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        textTransform: 'capitalize',
    },
    statDividerWhite: {
        width: 1,
        height: 14,
        backgroundColor: 'rgba(255,255,255,0.5)',
        marginHorizontal: spacing.md,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: colors.background,
        marginTop: -24,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
    },
    // Rich Text Styles
    richTextContainer: {
        marginBottom: spacing.lg,
    },
    richHeading: {
        color: colors.text,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    h1: { fontSize: 24 },
    h2: { fontSize: 20 },
    richParagraph: {
        fontSize: 16,
        color: colors.text || '#4B5563', // Fallback
        lineHeight: 24,
        marginBottom: 12,
    },
    richList: {
        marginBottom: 12,
        paddingLeft: 8,
    },
    richListItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    bulletPoint: {
        fontSize: 16,
        marginRight: 8,
        color: colors.primary,
    },
    richListItemText: {
        fontSize: 16,
        color: colors.text || '#4B5563',
        lineHeight: 24,
        flex: 1,
    },
    // Audio Player
    audioPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    audioInfo: {
        flex: 1,
    },
    audioTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    audioDuration: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 2,
    },
    // Images
    imagesSection: {
        marginBottom: spacing.lg,
    },
    imageScroll: {
        marginHorizontal: -spacing.lg,
    },

    postImage: {
        width: 300,
        height: 200,
        borderRadius: 12,
        // marginRight: 12, // Handled in View wrapper to include caption alignment
        backgroundColor: colors.borderLight,
    },
    singleImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: colors.borderLight,
    },
    caption: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
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
        height: Dimensions.get('window').height,
    },
    closeImageButton: {
        position: 'absolute',
        top: 40, // Adjusted for SafeArea or status bar
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: colors.borderLight, // Semi-transparent white
        borderRadius: borderRadius.full,
    },
    // Video
    videoSection: {
        marginBottom: spacing.xl,
    },
    videoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    videoIcon: {
        marginRight: spacing.md,
    },
    videoInfo: {
        flex: 1,
    },
    videoTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 2,
    },
    videoPlatform: {
        fontSize: 12,
        color: colors.textMuted,
    },
    blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        paddingLeft: spacing.md,
        marginVertical: spacing.md,
        backgroundColor: colors.surface + '80', // slight transparency if needed, or just surface
        paddingVertical: spacing.sm,
    },
    blockquoteText: {
        fontStyle: 'italic',
        color: colors.text,
        fontSize: 16,
    },
});
