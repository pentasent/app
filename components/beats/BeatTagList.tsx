import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { BeatTag } from '@/types';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { getImageUrl } from '@/utils/get-image-url';
import { LinearGradient } from 'expo-linear-gradient';

interface BeatTagListProps {
    tags: BeatTag[];
    selectedTag: string | null;
    onSelect: (tagId: string | null) => void;
}

export const BeatTagList: React.FC<BeatTagListProps> = ({ tags, selectedTag, onSelect }) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            <TouchableOpacity
                style={[
                    styles.tagCard,
                    selectedTag === null && styles.selectedCard
                ]}
                onPress={() => onSelect(null)}
                activeOpacity={0.8}
            >
                <ImageBackground
                    source={{ uri: 'https://api.pentasent.com/storage/v1/object/public/avatars/beats/allbeats.png' }}
                    style={styles.cardBackground}
                    imageStyle={styles.cardImage}
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.gradient}
                    >
                        <Text style={styles.tagName}>All Beats</Text>
                        <Text style={styles.tagCount}>Explore All</Text>
                    </LinearGradient>
                </ImageBackground>
            </TouchableOpacity>

            {tags.map((tag) => (
                <TouchableOpacity
                    key={tag.id}
                    style={[
                        styles.tagCard,
                        selectedTag === tag.id && styles.selectedCard
                    ]}
                    onPress={() => onSelect(tag.id === selectedTag ? null : tag.id)}
                    activeOpacity={0.8}
                >
                    <ImageBackground
                        source={{ uri: getImageUrl(tag.icon_url) }}
                        style={styles.cardBackground}
                        imageStyle={styles.cardImage}
                    >
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.gradient}
                        >
                            <Text style={styles.tagName}>{tag.name}</Text>
                            <Text style={styles.tagCount}>{tag.music_count} tracks</Text>
                        </LinearGradient>
                    </ImageBackground>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    tagCard: {
        width: 140,
        height: 70, // Reduced height as requested
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        ...shadows.medium,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedCard: {
        borderColor: colors.primary,
    },
    cardBackground: {
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    cardImage: {
        borderRadius: borderRadius.lg - 2,
    },
    gradient: {
        padding: spacing.sm,
        paddingTop: spacing.lg,
    },
    tagName: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    tagCount: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 10,
        fontWeight: '500',
    }
});
