import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export const YogaDetailShimmer = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [opacity]);

    return (
        <View style={styles.container}>
            {/* Banner Section */}
            <View style={styles.bannerContainer}>
                <LinearGradient
                    colors={[colors.primaryLight, colors.card]}
                    style={styles.banner}
                />

                <View style={styles.backButton}>
                    <ChevronLeft color="white" size={28} />
                </View>

                <Animated.View style={[styles.bannerContent, { opacity }]}>
                    <View style={styles.typeTagShimmer} />
                    <View style={styles.titleShimmer} />
                    <View style={styles.bannerStatsShimmer} />
                </Animated.View>
            </View>

            {/* Content Container */}
            <Animated.View style={[styles.contentContainer, { opacity }]}>
                {/* Audio Player Shimmer */}
                <View style={styles.audioPlayerShimmer}>
                    <View style={styles.playButtonShimmer} />
                    <View style={styles.audioInfoShimmer}>
                        <View style={styles.audioTitleShimmer} />
                        <View style={styles.audioDurationShimmer} />
                    </View>
                </View>

                {/* Content Paragraphs */}
                <View style={styles.richTextContainer}>
                    <View style={styles.headingShimmer} />
                    <View style={styles.paragraphLineFull} />
                    <View style={styles.paragraphLineFull} />
                    <View style={styles.paragraphLineMedium} />

                    <View style={styles.headingShimmerSmall} />
                    <View style={styles.paragraphLineFull} />
                    <View style={styles.paragraphLineShort} />
                </View>

                {/* Gallery Section */}
                <View style={styles.imagesSection}>
                    <View style={styles.sectionTitleShimmer} />
                    <View style={styles.singleImageShimmer} />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        zIndex: 5,
    },
    typeTagShimmer: {
        width: 60,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 8,
        marginBottom: 8,
    },
    titleShimmer: {
        width: '80%',
        height: 36,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 4,
        marginBottom: 12,
    },
    bannerStatsShimmer: {
        width: '60%',
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
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
    audioPlayerShimmer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    playButtonShimmer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.borderLight,
        marginRight: spacing.md,
    },
    audioInfoShimmer: {
        flex: 1,
        gap: 6,
    },
    audioTitleShimmer: {
        width: '40%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    audioDurationShimmer: {
        width: '20%',
        height: 12,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    richTextContainer: {
        marginBottom: spacing.lg,
        gap: 12,
    },
    headingShimmer: {
        width: '50%',
        height: 24,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginTop: 16,
        marginBottom: 8,
    },
    headingShimmerSmall: {
        width: '30%',
        height: 20,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginTop: 16,
        marginBottom: 8,
    },
    paragraphLineFull: {
        width: '100%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    paragraphLineMedium: {
        width: '80%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    paragraphLineShort: {
        width: '40%',
        height: 16,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
    },
    imagesSection: {
        marginBottom: spacing.lg,
    },
    sectionTitleShimmer: {
        width: '30%',
        height: 24,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
    },
    singleImageShimmer: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: colors.borderLight,
    },
});
