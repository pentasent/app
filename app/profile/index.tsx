import { CustomImage as Image } from '@/components/CustomImage';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Mail,
  MapPin,
  Calendar,
  Edit3,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Globe,
  Shield,
  FileText,
  Lock,
  Baby,
  Bell,
  MessageSquare,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, supabase } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import LoggoutButton from '@/components/Loggout';
import { EditProfileDialog } from '../../components/profile/EditProfileDialog';
import { WavePattern } from '@/components/profile/WavePattern';
import { useRouter } from 'expo-router';
import { formatNumber } from '@/utils/format';
import { getImageUrl } from '@/utils/get-image-url';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, login } = useAuth(); // login used to refresh session if needed, or we just reload user manually
  // Actually AuthContext might not expose a direct reload. 
  // We can reload by calling loadUser in AuthContext if it was exposed, 
  // OR we can just fetch the user details again here using Supabase direct query for display.
  // For now, let's assume valid user in context, and we might need to manually update local state for immediate feedback.

  const [refreshing, setRefreshing] = useState(false);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [communityCount, setCommunityCount] = useState<number | null>(null);
  const [journalCount, setJournalCount] = useState<number | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [localUser, setLocalUser] = useState(user);
  const hasLoadedStats = React.useRef(false);

  useEffect(() => {
    setLocalUser(user);
    if (user && !hasLoadedStats.current) {
      fetchStats();
      hasLoadedStats.current = true;
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    try {
      // Fetch Post Count
      const { count: pCount, error: pError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!pError && pCount !== null) {
        setPostCount(pCount);
      }

      // Fetch Community Count
      const { count: cCount, error: cError } = await supabase
        .from('community_followers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!cError && cCount !== null) {
        setCommunityCount(cCount);
      }

      // Fetch Journal Count
      const { count: jCount, error: jError } = await supabase
        .from('user_journals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!jError && jCount !== null) {
        setJournalCount(jCount);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    // Ideally we would also refresh AuthContext user here. 
    // Since we don't have a direct 'refreshUser' exposed, we can fetch manually to update local view.
    if (user) {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) setLocalUser({ ...user, ...data });
    }
    setRefreshing(false);
  }, [user]);

  const { width } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner with Gradient and Wave Pattern */}
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={[colors.primaryLight, colors.background, colors.secondaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            {/* <WavePattern width={width} height={160} style={styles.wavePattern} /> */}
            <WavePattern
              width={width}
              height={160}
              style={styles.wavePattern}
              baseColor={colors.primary}
            />

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButtonBanner}
              onPress={() => router.replace('/(tabs)')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.iconContainer}>
                <ArrowLeft size={20} color={colors.text} />
              </View>
            </TouchableOpacity>

            {/* Edit Button on Banner */}
            <TouchableOpacity
              style={styles.editButtonBanner}
              onPress={() => setShowEditProfile(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.iconContainer}>
                <Edit3 size={18} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.profileContent}>
          {/* Header Section: Avatar + Name/Date Side-by-Side */}
          <View style={styles.headerSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: getImageUrl(localUser?.avatar_url) }}
                style={styles.avatar}
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{localUser?.name || 'User'}</Text>

              <View style={styles.joinedRow}>
                {localUser?.country && (
                  <View style={[styles.joinedRow]}>
                    <MapPin size={14} color={colors.textLight} />
                    <Text style={styles.joinedText}>{localUser.country} </Text>
                  </View>
                )}
                {/* <View style={[styles.joinedRow]}>
                  <Calendar size={14} color={colors.textLight} />
                  <Text style={styles.joinedText}>
                    Joined {new Date(localUser?.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </Text>
                </View> */}

              </View>
            </View>
          </View>

          {localUser?.bio && (
            <Text style={styles.headline}>{localUser.bio}</Text>
          )}

          {/* <View style={styles.divider} /> */}

          {/* User Info Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>User Info</Text>

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Mail size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}
                numberOfLines={1}
                ellipsizeMode="tail">{localUser?.email}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabelSimple}>Member Since</Text>
              {!localUser?.created_at ? (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: colors.border,
                    borderRadius: borderRadius.full,
                  }}
                />
              ) : (
                <Text style={styles.infoValueSimple}>{new Date(localUser?.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</Text>
              )}
            </View>

            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabelSimple}>Total Posts</Text>
              {postCount === null ? (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: colors.border,
                    borderRadius: borderRadius.full,
                  }}
                />
              ) : (
                <Text style={styles.infoValueSimple}>{formatNumber(postCount)}</Text>
              )}
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabelSimple}>Communities Joined</Text>
              {communityCount === null ? (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: colors.border,
                    borderRadius: borderRadius.full,
                  }}
                />
              ) : (
                <Text style={styles.infoValueSimple}>{formatNumber(communityCount)}</Text>
              )}
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabelSimple}>Total Journal Entries</Text>
              {journalCount === null ? (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: colors.border,
                    borderRadius: borderRadius.full,
                  }}
                />
              ) : (
                <Text style={styles.infoValueSimple}>{formatNumber(journalCount)}</Text>
              )}
            </View>
          </View>

          {/* Contact Us Page Trigger */}
          <TouchableOpacity
            style={[styles.sectionContainer, styles.contactUsTrigger]}
            onPress={() => router.push('/profile/contact-us')}
          >
            <View style={styles.linkLeft}>
              <Mail size={18} color={colors.primary} />
              <Text style={styles.linkText}>Contact Us</Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionContainer, styles.contactUsTrigger]}
            onPress={() => router.push('/profile/notification-settings')}
          >
            <View style={styles.linkLeft}>
              <Bell size={18} color={colors.secondary} />
              <Text style={styles.linkText}>Notification Settings</Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sectionContainer, styles.contactUsTrigger]}
            onPress={() => router.push('/profile/feedback')}
          >
            <View style={styles.linkLeft}>
              <MessageSquare size={18} color={colors.primary} />
              <Text style={styles.linkText}>Feedback</Text>
            </View>
            <ChevronRight size={18} color={colors.textLight} />
          </TouchableOpacity>


          {/* Logout Action */}
          <View style={styles.logoutContainer}>
            <LoggoutButton />
          </View>

          {/* Developer Info Footer */}
          <View style={styles.footerInfo}>
            <Text style={styles.versionText}>App Version 1.0.0</Text>
            <Text style={styles.developerText}>Developed by Pentasent Inc.</Text>
            <Text style={styles.tagline}>Take Back Control of Your Mind and Senses</Text>
          </View>

        </View>
      </ScrollView>

      {/* Edit Component */}
      <EditProfileDialog
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        currentUser={localUser}
        onUpdate={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Ensure background matches theme everywhere
  },
  content: {
    flex: 1,
  },
  bannerContainer: {
    height: 140, // Slightly shorter to give more room
    width: '95%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: '2.5%',
    borderRadius: borderRadius.lg,
    marginTop: spacing.xxl,
  },
  banner: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  wavePattern: {
    position: 'absolute',
    bottom: 0,
  },
  editButtonBanner: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  backButtonBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  iconContainer: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: borderRadius.full,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },

  // Header Section
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: -40, // Partial overlap
    marginBottom: spacing.md,
  },
  avatarContainer: {
    padding: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    // marginBottom: spacing.xxl,
  },
  headerInfo: {
    marginLeft: spacing.md,
    marginBottom: 22, // Align with bottom of avatar approx
    flex: 1,
    // gap: 4
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  joinedText: {
    fontSize: 13,
    color: colors.textLight,
    // marginTop: 6,
  },
  headline: {
    fontSize: 15,
    color: colors.textLight,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
    paddingHorizontal: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },

  // Sections
  sectionContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    // shadowColor: colors.shadow,
    // shadowOffset: {width: 0, height: 1 },
    // shadowOpacity: 0.05,
    // shadowRadius: 3,
    // elevation: 2,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  contactUsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight + '20', // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textLight,
  },
  infoValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  infoLabelSimple: {
    fontSize: 15,
    color: colors.text,
  },
  infoValueSimple: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
    paddingVertical: 8,
  },
  socialIcon: {
    padding: 8,
  },

  // Link Rows (More Info)
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 15,
    color: colors.text,
  },

  // Bottom / Footer
  logoutContainer: {
    marginBottom: spacing.xl,
  },
  footerInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  versionText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  developerText: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 8,
  },
});
