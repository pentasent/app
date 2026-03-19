import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { LayoutGrid, Search, Filter, X, ShoppingBag, Eye, ExternalLink } from 'lucide-react-native';
import { Product, ProductCategory } from '@/types/database';
import { StatusBar } from 'expo-status-bar';
import { ProductCardShimmer } from '@/components/shimmers/ProductCardShimmer';
import KeyboardShiftView from '@/components/KeyboardShiftView';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';

export default function ProductsScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from('product_categories')
                    .select('*')
                    .order('name');
                if (error) throw error;
                setCategories(data || []);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Products
    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('products')
                .select(`
                    *,
                    product_categories (
                        id,
                        name,
                        slug
                    )
                `)
                .eq('is_active', true);

            // 1. Text Search
            if (searchQuery.trim()) {
                query = query.ilike('title', `%${searchQuery.trim()}%`);
            }

            // 2. Category Filter
            if (selectedCategory !== 'all') {
                query = query.eq('category_id', selectedCategory);
            }

            // Execute
            const { data, error } = await query;

            if (error) throw error;
            setProducts(data || []);

        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedCategory]);

    // Debounce Search
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts();
        }, 500);
        return () => clearTimeout(timeout);
    }, [fetchProducts, searchQuery, selectedCategory]);

    const handleProductPress = async (product: Product) => {
        try {
            // Optimistic update for view count
            setProducts(current =>
                current.map(p => p.id === product.id ? { ...p, views_count: (p.views_count || 0) + 1 } : p)
            );

            // Open external link
            const url = product.product_url;
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
            } else {
                console.error("Don't know how to open URI: " + url);
            }

            // Update in DB (fire and forget)
            await supabase
                .from('products')
                .update({ views_count: (product.views_count || 0) + 1 })
                .eq('id', product.id);

        } catch (error) {
            console.error('Error handling product press:', error);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('all');
        setShowFilters(false);
    };

    const renderItem = ({ item }: { item: Product }) => {
        // Safe access to joined category data
        const categoryName = item.product_categories?.name || 'Category';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handleProductPress(item)}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: getImageUrl(item.image_url) }}
                    style={styles.productImage}
                    resizeMode="cover"
                />

                <View style={styles.contentColumn}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{categoryName}</Text>
                    </View>

                    <Text style={styles.titleText} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {item.short_description ? (
                        <Text style={styles.bodyText} numberOfLines={2}>
                            {item.short_description}
                        </Text>
                    ) : null}

                    <View style={styles.metaRow}>
                        <View style={styles.viewCountContainer}>
                            <Eye size={14} color={colors.textLight} />
                            <Text style={styles.dateText}>{formatNumber(item.views_count || 0)}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <View style={styles.shopButton}>
                            <Text style={styles.shopButtonText}>View Offer</Text>
                            <ExternalLink size={14} color={colors.primary} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor={colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Wellness Products</Text>
                        <Text style={styles.headerSubtitle}>
                            {formatNumber(products.length)} {products.length === 1 ? 'item' : 'items'} available
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => router.push('/(tabs)/explore')}
                    >
                        <LayoutGrid size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                {loading ? (
                    <View style={styles.listContent}>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <View key={index}>
                                <ProductCardShimmer />
                                {index < 4 && <View style={styles.separator} />}
                            </View>
                        ))}
                    </View>
                ) : (
                    <FlatList
                        data={products}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <ShoppingBag size={48} color={colors.textLight} />
                                <Text style={styles.emptyText}>
                                    {searchQuery || selectedCategory !== 'all' ? 'No products match your search.' : 'No products available.'}
                                </Text>
                                {(searchQuery || selectedCategory !== 'all') && (
                                    <TouchableOpacity
                                        style={styles.emptyButton}
                                        onPress={clearFilters}
                                    >
                                        <Text style={styles.emptyButtonText}>Clear Filters</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        }
                    />
                )}

                {/* Bottom Section */}
                <KeyboardShiftView style={styles.bottomContainer}>
                    {/* Search & Filters */}
                    <View style={styles.bottomBar}>
                        {showFilters && (
                            <View style={styles.filterOptions}>
                                <View style={styles.filterRow}>
                                    <Text style={styles.filterLabel}>Category:</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                                        <TouchableOpacity
                                            style={[styles.chip, selectedCategory === 'all' && styles.chipActive]}
                                            onPress={() => setSelectedCategory('all')}
                                        >
                                            <Text style={[styles.chipText, selectedCategory === 'all' && styles.chipTextActive]}>
                                                All
                                            </Text>
                                        </TouchableOpacity>

                                        {categories.map(cat => (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
                                                onPress={() => setSelectedCategory(cat.id)}
                                            >
                                                <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        )}

                        <View style={styles.searchContainer}>
                            <View style={styles.searchBar}>
                                <Search size={20} color={colors.textLight} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search products..."
                                    placeholderTextColor={colors.textLight}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <X size={16} color={colors.textLight} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity
                                style={[styles.filterBtn, (showFilters || selectedCategory !== 'all') && styles.filterBtnActive]}
                                onPress={() => setShowFilters(!showFilters)}
                            >
                                <Filter size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardShiftView>
            </View>
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
        backgroundColor: colors.background,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textLight,
    },
    homeButton: {
        padding: 8,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    // Bottom Bar
    bottomContainer: {
        justifyContent: 'flex-end',
        width: '100%',
        backgroundColor: colors.card,
    },
    bottomBar: {
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        padding: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 20 : spacing.md,
    },

    // Search & Filters
    searchContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: 24,
        padding: 0,
    },
    filterBtn: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    filterBtnActive: {
        backgroundColor: colors.primary + '10',
        borderColor: colors.primary,
    },

    // Filter Options
    filterOptions: {
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        width: 70,
    },
    chipsContainer: {
        gap: 8,
        paddingRight: 20,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    chipTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },

    listContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Product Card
    card: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        padding: 0, // Padding handled individually to make image flush
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
    },
    productImage: {
        width: 100,
        height: '100%',
        minHeight: 120,
        backgroundColor: colors.background,
    },
    contentColumn: {
        flex: 1,
        padding: spacing.md,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 8,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primaryDark,
        textTransform: 'uppercase',
    },
    titleText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    bodyText: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: 12,
        lineHeight: 18,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 'auto', // Push to bottom
    },
    viewCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        fontSize: 12,
        color: colors.textLight,
        fontWeight: '500',
    },
    shopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    shopButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    separator: {
        height: spacing.md,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    emptyButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});
