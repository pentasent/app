import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Beat } from '@/types';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { Play, BarChart2 } from 'lucide-react-native';
import { formatNumber } from '@/utils/format';
import { trackEvent } from '@/lib/analytics/track';

interface BeatCardProps {
    beat: Beat;
    onPlay: (beat: Beat) => void;
}

export const BeatCard: React.FC<BeatCardProps> = ({ beat, onPlay }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                trackEvent('beats_played', { beat_id: beat.id, title: beat.title });
                onPlay(beat);
            }}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: beat.banner_url || 'https://via.placeholder.com/150' }}
                    style={styles.image}
                    onLoad={() => setImageLoaded(true)}
                />
                {imageLoaded && (
                    <>
                        <View style={styles.playOverlay}>
                            <View style={styles.playButton}>
                                <Play size={18} color={colors.textMuted} fill={colors.background} style={{ marginLeft: 2 }} />
                            </View>
                        </View>
                        <View style={styles.durationBadge}>
                            <Text style={styles.durationText}>{formatDuration(beat.duration_seconds)}</Text>
                        </View>
                    </>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.title} numberOfLines={1}>{beat.title}</Text>
                </View>

                {beat.short_description && (
                    <Text style={styles.description} numberOfLines={1}>
                        {beat.short_description}
                    </Text>
                )}

                <View style={styles.footer}>
                    {beat.beat_tags?.name && (
                        <View style={styles.tagChip}>
                            <Text style={styles.tagText}>{beat.beat_tags.name}</Text>
                        </View>
                    )}

                    <View style={styles.stats}>
                        <BarChart2 size={12} color={colors.textLight} />
                        <Text style={styles.statsText}>{beat.play_count ? formatNumber(beat.play_count) : 0} plays</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'transparent', // Transparent to blend with list container
        marginBottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        // borderBottomWidth: 2,
        // borderBottomColor: colors.borderLight,
    },
    imageContainer: {
        position: 'relative',
        width: 80,
        height: 60,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        // backgroundColor: colors.textLight,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        // borderWidth: 1,
        // borderColor: colors.borderLight,
    },
    durationBadge: {
        position: 'absolute',
        bottom: 3,
        right: 3,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 3,
    },
    durationText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    title: {
        fontSize: 16, // Matched feed
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    description: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: 4,
        lineHeight: 16,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tagChip: {
        backgroundColor: colors.borderLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    tagText: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '500',
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statsText: {
        fontSize: 11,
        color: colors.textLight,
    }
});
