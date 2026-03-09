import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import {
    Users,
    BookOpen,
    Wind,
    HeartPulse,
    Activity,
    CheckSquare,
    ShoppingBag,
    GraduationCap,
    Stethoscope,
    Building2,
    ChevronRight
} from 'lucide-react-native';

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
};

const EXPLORE_ITEMS: ExploreItem[] = [
    { id: '1', title: 'Community', icon: Users, route: '/community', color: colors.primaryDark }, // Rose
    { id: '2', title: 'Journal', icon: BookOpen, route: '/journal', color: colors.secondaryDark }, // Sage
    { id: '3', title: 'Meditation', icon: Wind, route: '/meditation', color: colors.info }, // Sky
    { id: '4', title: 'Tasks', icon: CheckSquare, route: '/tasks', color: colors.warning }, // Peach
    { id: '5', title: 'Yoga', icon: Activity, route: '/yoga', color: '#B4A6C9' }, // Lavender
    { id: '6', title: 'Products', icon: ShoppingBag, route: '/products', color: '#C9B6A6' }, // Warm beige
    // { id: '7', title: 'Cure', icon: HeartPulse, route: '/coming-soon', color: '#D8A7A7' },      // Soft muted rose
    // { id: '8', title: 'Courses', icon: GraduationCap, route: '/coming-soon', color: '#B5B8D6' }, // Soft dusty indigo
    // { id: '9', title: 'Doctors', icon: Stethoscope, route: '/coming-soon', color: '#9EC8C3' },  // Muted sage-teal
    // { id: '10', title: 'Hospitals', icon: Building2, route: '/coming-soon', color: '#D6B49A' },  // Soft sand
];

export default function ExploreScreen() {
    const router = useRouter();

    const handlePress = (route: string) => {
        // @ts-ignore
        router.push(route);
    };

    const renderItem = ({ item }: { item: ExploreItem }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handlePress(item.route)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <item.icon size={32} color={item.color} strokeWidth={1.5} />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {/* <View style={styles.arrowContainer}>
                <ChevronRight size={16} color={colors.textMuted} />
            </View> */}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Explore</Text>
                <Text style={styles.subtitle}>Discover wellness resources</Text>
            </View>

            <FlatList
                data={EXPLORE_ITEMS}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
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
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        paddingTop: spacing.sm,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
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
    arrowContainer: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    }
});
