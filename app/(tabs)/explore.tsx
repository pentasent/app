import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import {
    Users,
    BookOpen,
    Wind,
    CheckSquare,
    Newspaper,
    TrendingUp,
    Calendar,
    MapPin,
    Sparkles,
    ChevronRight,
} from 'lucide-react-native';
import { FeatureSlider } from '@/components/explore/FeatureSlider';
import { MayaCard } from '@/components/explore/MayaCard';
import { BubbleGameCard } from '@/components/explore/BubbleGameCard';
import { MemoryFlipCard } from '@/components/explore/MemoryFlipCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const TILE_GAP = spacing.md;
const TILE_WIDTH = (width - (spacing.lg * 2) - (TILE_GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

type ExploreItem = {
    id: string;
    title: string;
    icon: React.ElementType;
    route: string;
    color: string;
    isFullWidth?: boolean;
    isComingSoon?: boolean;
    isNew?: boolean;
};

const EXPLORE_ITEMS: ExploreItem[] = [
    { id: '1', title: 'Community', icon: Users, route: '/community', color: colors.primaryDark },
    { id: '2', title: 'Journal', icon: BookOpen, route: '/journal', color: colors.secondaryDark },
    { id: '3', title: 'Meditation', icon: Wind, route: '/meditation', color: colors.info, isNew: true },
    { id: '4', title: 'Tasks', icon: CheckSquare, route: '/tasks', color: colors.warning },
    { id: '5', title: 'Articles', icon: Newspaper, route: '/articles', color: '#E5989B' },
    { id: '6', title: 'Pulse', icon: TrendingUp, route: '/pulse', color: colors.primary },
    // { id: '7', title: 'Yoga', icon: Activity, route: '/yoga', color: '#6D597A', isComingSoon: true },
    // { id: '8', title: 'Courses', icon: GraduationCap, route: '/products', color: '#B5838D', isComingSoon: true },
    // { id: '9', title: 'Challenges', icon: Trophy, route: '/coming-soon', color: '#FFB4A2', isComingSoon: true },
    // { id: '10', title: 'Products', icon: ShoppingBag, route: '/products', color: '#6B705C', isComingSoon: true },
];

const AnimatedChevrons = () => {
    const anim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const renderChevron = (delay: number) => {
        const opacity = anim.interpolate({
            inputRange: [delay, delay + 0.3, delay + 0.6, delay + 1],
            outputRange: [0.1, 1, 0.1, 0.1],
            extrapolate: 'clamp'
        });

        const translateX = anim.interpolate({
            inputRange: [delay, delay + 1],
            outputRange: [-4, 4],
            extrapolate: 'clamp'
        });

        return (
            <Animated.View style={{ opacity, transform: [{ translateX }], marginHorizontal: -4 }}>
                <ChevronRight size={14} color="#FFF" strokeWidth={3} />
            </Animated.View>
        );
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderChevron(0)}
            {renderChevron(0.2)}
            {renderChevron(0.4)}
        </View>
    );
};

const YogaHighlightCard = () => {
    const router = useRouter();
    const aura1 = React.useRef(new Animated.Value(0)).current;
    const aura2 = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const createAnim = (val: Animated.Value, duration: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { 
                        toValue: 1, 
                        duration, 
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true 
                    }),
                    Animated.timing(val, { 
                        toValue: 0, 
                        duration, 
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true 
                    }),
                ])
            );
        };
        const a1 = createAnim(aura1, 10000);
        const a2 = createAnim(aura2, 14000);
        a1.start();
        a2.start();
        return () => { a1.stop(); a2.stop(); };
    }, []);

    const aura1Style = {
        transform: [
            { translateX: aura1.interpolate({ inputRange: [0, 1], outputRange: [-40, 60] }) },
            { translateY: aura1.interpolate({ inputRange: [0, 1], outputRange: [-20, 30] }) },
            { scale: aura1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) },
        ],
        opacity: aura1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.35, 0.15] }),
    };

    const aura2Style = {
        transform: [
            { translateX: aura2.interpolate({ inputRange: [0, 1], outputRange: [60, -40] }) },
            { translateY: aura2.interpolate({ inputRange: [0, 1], outputRange: [30, -20] }) },
            { scale: aura2.interpolate({ inputRange: [0, 1], outputRange: [1.2, 1] }) },
        ],
        opacity: aura2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.25, 0.1] }),
    };

    const isNavigating = React.useRef(false);
    const handlePress = () => {
        if (isNavigating.current) return;
        isNavigating.current = true;
        router.push('/events/yoga');
        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };

    return (
        <TouchableOpacity 
            style={styles.yogaCard}
            onPress={handlePress}
            activeOpacity={0.9}
        >
            <LinearGradient
                colors={['#6D597A', '#355070']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.yogaGradient}
            >
                {/* Animated Background Auras */}
                <Animated.View style={[styles.yogaAura, styles.yogaAura1, aura1Style]} />
                <Animated.View style={[styles.yogaAura, styles.yogaAura2, aura2Style]} />

                <View style={styles.yogaTopRow}>
                    <View style={styles.eventBadge}>
                        <Sparkles size={12} color="#FFF" />
                        <Text style={styles.eventBadgeText}>UPCOMING EVENT</Text>
                    </View>
                    <Text style={styles.eventDate}>June 21</Text>
                </View>

                <View style={styles.yogaContent}>
                    <Text style={styles.yogaTitle}>International Yoga Day</Text>
                    <Text style={styles.yogaSubtitle}>Join our global community for a morning of mindful movement and serene meditation.</Text>
                    
                    <View style={styles.eventInfoRow}>
                        <View style={styles.eventInfoItem}>
                            <Calendar size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.eventInfoText}>21 June 2026</Text>
                        </View>
                        <View style={styles.eventInfoItem}>
                            <MapPin size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.eventInfoText}>Live Session</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.yogaFooter}>
                    <Text style={styles.yogaActionText}>Register for free</Text>
                    <View style={styles.yogaArrowBtn}>
                        <AnimatedChevrons />
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

export default function ExploreScreen() {
    const router = useRouter();
    const isNavigating = React.useRef(false);

    const safePush = (route: string) => {
        if (isNavigating.current) return;
        isNavigating.current = true;
        // @ts-ignore
        router.push(route);
        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    };

    const handlePress = (item: ExploreItem) => {
        if (item.isComingSoon) {
            safePush('/coming-soon');
            return;
        }
        safePush(item.route);
    };

    const renderItem = ({ item }: { item: ExploreItem }) => {
        const hasBadge = item.isComingSoon || item.isNew;
        const badgeText = item.isNew ? 'NEW' : 'COMING';
        const badgeColor = item.isNew ? colors.secondary : colors.primary;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handlePress(item)}
                activeOpacity={item.isComingSoon ? 0.9 : 0.7}
            >
                {hasBadge && (
                    <View style={[styles.comingBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.comingText}>{badgeText}</Text>
                    </View>
                )}
                <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                    <item.icon size={32} color={item.color} strokeWidth={1.5} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
        );
    };

    const renderFixedHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <View>
                    <Text style={styles.title}>Explore</Text>
                    <Text style={styles.subtitle}>Discover wellness resources</Text>
                </View>
            </View>
        </View>
    );

    const renderListHeader = () => (
        <View style={styles.sliderWrapper}>
            <FeatureSlider 
                items={[
                    <MayaCard onPress={() => safePush('/maya')} />,
                    <BubbleGameCard onPress={() => safePush('/games/bubble-rush')} />,
                    <MemoryFlipCard onPress={() => safePush('/games/memory-flip')} />
                ]} 
            />
            {/* <View style={styles.sectionTitleWrapper}>
                <Text style={styles.sectionTitle}>Mind & Body Mastery</Text>
            </View> */}
            <View style={[styles.sectionTitleWrapper, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                <Text style={styles.sectionTitle}>Discover Wellness</Text>
            </View>
        </View>
    );

    const renderListFooter = () => {
        const today = new Date();
        // June 23, 2026 (Month is 0-indexed: 5 = June)
        const hideDate = new Date(2026, 5, 23);
        const showHighlights = today < hideDate;

        if (!showHighlights) return <View style={{ height: 40 }} />;

        return (
            <View style={styles.footerSection}>
                <View style={styles.sectionTitleWrapper}>
                    <Text style={styles.sectionTitle}>Discover Events</Text>
                </View>
                
                <YogaHighlightCard />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderFixedHeader()}
            <FlatList
                data={EXPLORE_ITEMS}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={renderListFooter}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: spacing.xxl,
        paddingBottom: spacing.sm,
    },
    sliderWrapper: {
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textLight,
    },
    listContent: {
        paddingBottom: spacing.xl,
        paddingTop: 0,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    card: {
        width: TILE_WIDTH,
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden', // Forces the ribbon to be clipped by the card corners
        // Shadow for iOS
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        // Elevation for Android
        elevation: 2,
        height: 140, // Fixed height for uniformity
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    arrowContainer: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    },
    comingBadge: {
        position: 'absolute',
        top: -12,
        left: -34,
        backgroundColor: colors.primary,
        width: 100,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '-45deg' }],
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 4,
    },
    comingText: {
        color: '#FFF',
        fontSize: 8, // Slightly smaller to ensure fit
        fontWeight: '900',
        letterSpacing: 0.8,
        marginRight: 8,
        marginTop: 20, // Pushes text down into the visible "safe" zone of the ribbon
    },
    sectionTitleWrapper: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.3,
    },
    footerSection: {
        marginTop: spacing.sm,
        paddingBottom: 40,
    },
    yogaCard: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#6D597A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
    },
    yogaGradient: {
        padding: spacing.xl,
    },
    yogaTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    eventBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    eventBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    eventDate: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        opacity: 0.9,
    },
    yogaContent: {
        marginBottom: spacing.xl,
    },
    yogaTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: spacing.sm,
        lineHeight: 32,
    },
    yogaSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    eventInfoRow: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    eventInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    eventInfoText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
    yogaFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
        paddingTop: spacing.lg,
    },
    yogaActionText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    yogaArrowBtn: {
        width: 60,
        height: 30,
        borderRadius: 50,
        borderWidth: 1.2,
        borderColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    yogaAura: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
    },
    yogaAura1: {
        backgroundColor: '#E5989B',
        top: -40,
        left: -40,
    },
    yogaAura2: {
        backgroundColor: '#8B5CF6',
        bottom: -40,
        right: -40,
    },
});
