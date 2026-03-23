import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  ScrollView,
  Dimensions,
  RefreshControl,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  LayoutGrid,
  Clock,
  BookOpen,
  Newspaper
} from 'lucide-react-native';
import { ArticleCardShimmer } from '@/components/shimmers/ArticleCardShimmer';
import { Article, ArticleTag } from '@/types/database';
import { StatusBar } from 'expo-status-bar';
import { getImageUrl } from '@/utils/get-image-url';
import { CustomImage as Image } from '@/components/CustomImage';
import KeyboardShiftView from '@/components/KeyboardShiftView';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 20;

export default function ArticlesScreen() {
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [tags, setTags] = useState<ArticleTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchTags = async () => {
    try {
      // Fetching all tags. If is_active exists, we'd filter here.
      const { data, error } = await supabase
        .from('article_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchArticles = useCallback(async (pageNum: number, search: string, tagSlug: string | null, append: boolean = false) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('articles')
        .select(`
          *,
          article_tag_map!inner(
            article_tags!inner(id, name, slug)
          )
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
      }

      if (tagSlug) {
        query = query.eq('article_tag_map.article_tags.slug', tagSlug);
      }

      const { data, error } = await query;

      if (error) {
        // Handle potential join issues (same as web fallback)
        if (error.code === 'PGRST100' || error.message.includes('join')) {
           let fallbackQuery = supabase
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
          
          if (search.trim()) {
            fallbackQuery = fallbackQuery.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
          }

          const { data: fallbackData, error: fallbackError } = await fallbackQuery;
          if (fallbackError) throw fallbackError;
          
          const formatted = (fallbackData || []).map(a => ({ ...a, tags: [] }));
          if (append) setArticles(prev => [...prev, ...formatted]);
          else setArticles(formatted);
          setHasMore(formatted.length === PAGE_SIZE);
          return;
        }
        throw error;
      }

      const formattedArticles = (data || []).map((article: any) => ({
        ...article,
        tags: article.article_tag_map?.map((m: any) => m.article_tags).filter(Boolean) || []
      }));

      if (append) {
        setArticles(prev => [...prev, ...formattedArticles]);
      } else {
        setArticles(formattedArticles);
      }

      setHasMore(formattedArticles.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  // Initial Fetch
  useEffect(() => {
    fetchTags();
    fetchArticles(0, '', null, false);
  }, [fetchArticles]);

  // Debounce Search & Tag change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchArticles(0, searchQuery, selectedTag, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag, fetchArticles]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchArticles(0, searchQuery, selectedTag, false);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchArticles(nextPage, searchQuery, selectedTag, true);
    }
  };

  const renderArticleCard = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push({
          pathname: `/articles/${item.slug}`,
          params: { 
            id: item.id, 
            title: item.title, 
            banner_image: item.banner_image,
            description: item.description,
            reading_time: item.reading_time
          }
        })}
      >
        <View style={styles.imageContainer}>
          {item.banner_image ? (
            <Image
              source={{ uri: getImageUrl(item.banner_image) }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={styles.bannerImage}
            />
          )}
          
          {/* Top Row Overlay: Read Time & Tag */}
          <View style={styles.overlayTop}>
             {item.tags?.[0] && (
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{item.tags[0].name}</Text>
              </View>
            )}
            <View style={styles.readTimeBadge}>
              <Clock size={12} color="#FFF" />
              <Text style={styles.readTimeText}>{item.reading_time || 0} min</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.articleDesc} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header - Task Page Style */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Articles</Text>
            <Text style={styles.headerSubtitle}>Resources to guide and grow</Text>
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
        {loading && page === 0 ? (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {[1, 2, 3, 4, 5].map((i) => (
              <ArticleCardShimmer key={i} />
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={articles}
            keyExtractor={(item) => item.id}
            renderItem={renderArticleCard}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : !hasMore && articles.length > 0 ? (
                <View style={styles.endContainer}>
                  <View style={styles.endDivider} />
                  <Newspaper size={24} color={colors.textLight} style={{ opacity: 0.5 }} />
                  <Text style={styles.endText}>You've reached the end. 📝</Text>
                  <Text style={styles.endSubtext}>We keep adding latest articles for you.</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <BookOpen size={48} color={colors.textLight} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No matching articles found.` : "No articles available yet."}
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Bottom Section - Task Page Style Filters/Search */}
        <KeyboardShiftView style={styles.bottomContainer}>
          <View style={styles.bottomBar}>
            {showFilters && (
              <View style={styles.filterOptions}>
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Tags:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                  >
                    <TouchableOpacity
                      style={[styles.chip, !selectedTag && styles.chipActive]}
                      onPress={() => setSelectedTag(null)}
                    >
                      <Text style={[styles.chipText, !selectedTag && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {tags.map((tag) => (
                      <TouchableOpacity
                        key={tag.id}
                        style={[styles.chip, selectedTag === tag.slug && styles.chipActive]}
                        onPress={() => setSelectedTag(tag.slug)}
                      >
                        <Text style={[styles.chipText, selectedTag === tag.slug && styles.chipTextActive]}>
                          {tag.name}
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
                  placeholder="Search articles..."
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
                style={[styles.filterBtn, (showFilters || selectedTag) && styles.filterBtnActive]}
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
    paddingTop: Platform.OS === 'android' ? spacing.xxl : spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: colors.borderLight,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  overlayTop: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  readTimeBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardInfo: {
    padding: spacing.md,
  },
  articleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 26,
  },
  articleDesc: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  endContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.xl,
    gap: 12,
  },
  endDivider: {
    width: 40,
    height: 2,
    backgroundColor: colors.borderLight,
    marginBottom: 8,
  },
  endText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontStyle: 'italic',
  },
  endSubtext: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  bottomContainer: {
    justifyContent: 'flex-end',
    width: '100%',
    backgroundColor: colors.background,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filterBtn: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterBtnActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  filterOptions: {
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipsContainer: {
    gap: 8,
    paddingRight: 20,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
});
