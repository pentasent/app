import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, Dimensions, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import {
    ArrowLeft,
    Mail,
    Globe,
    Shield,
    FileText,
    Lock,
    Baby,
    ChevronRight
} from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { getImageUrl } from '@/utils/get-image-url';
import { CustomImage as Image } from '../../components/CustomImage';

export default function ContactUsScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const handleEmail = () => {
        Linking.openURL('mailto:hello@pentasent.com');
    };

    const handleWebsite = () => {
        Linking.openURL('https://www.pentasent.com');
    };

    const handleSocial = (platform: string) => {
        const urls: { [key: string]: string } = {
            linkedin: 'https://www.linkedin.com/company/pentasent',
            youtube: 'https://www.youtube.com/@pentasent',
            twitter: 'https://twitter.com/pentasent',
            instagram: 'https://www.instagram.com/pentasentinc',
            pinterest: 'https://www.pinterest.com/pentasent',
            privacy: "https://www.pentasent.com/privacy-policy",
            terms: "https://www.pentasent.com/terms-and-conditions",
            childpolicy: "https://www.pentasent.com/children-policy"
        };
        Linking.openURL(urls[platform] || 'https://www.pentasent.com');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header - Matching Explore Page Style with User Profile */}

            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.title}>Contact Us</Text>
                        <Text style={styles.subtitle}>Reach out to us for support and info</Text>
                    </View>
                    {/* <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.profileImageContainer}
                    >
                        <Image
                            source={{ uri: getImageUrl(user?.avatar_url) }}
                            style={styles.headerAvatar}
                        />
                    </TouchableOpacity> */}
                    <TouchableOpacity style={styles.iconBoxLarge}
                        onPress={() => router.back()}>
                        <Mail size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Contact Info Card */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Contact Info</Text>

                    <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
                        <View style={styles.iconBox}>
                            <Mail size={18} color={colors.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Contact Email</Text>
                            <Text style={styles.infoValue}>hello@pentasent.com</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textLight} />
                    </TouchableOpacity>

                    <View style={styles.rowDivider} />

                    <TouchableOpacity style={styles.infoRow} onPress={handleWebsite}>
                        <View style={styles.iconBox}>
                            <Globe size={18} color={colors.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Website</Text>
                            <Text style={styles.infoValue}>www.pentasent.com</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textLight} />
                    </TouchableOpacity>

                    <View style={styles.rowDivider} />

                    <View style={styles.socialRow}>
                        <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocial('linkedin')}>
                            <FontAwesome name="linkedin-square" size={24} color="#0077b5" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocial('youtube')}>
                            <FontAwesome name="youtube-play" size={24} color="#FF0000" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocial('twitter')}>
                            <FontAwesome name="twitter" size={24} color="#1DA1F2" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocial('instagram')}>
                            <FontAwesome name="instagram" size={24} color="#C13584" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocial('pinterest')}>
                            <FontAwesome name="pinterest" size={24} color="#E60023" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* More Info Card */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>More Info</Text>

                    <TouchableOpacity style={styles.linkRow} onPress={() => handleSocial('privacy')}>
                        <View style={styles.linkLeft}>
                            <Shield size={18} color={colors.textMuted} />
                            <Text style={styles.linkText}>Privacy Policy</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textLight} />
                    </TouchableOpacity>

                    <View style={styles.rowDivider} />

                    <TouchableOpacity style={styles.linkRow} onPress={() => handleSocial('terms')}>
                        <View style={styles.linkLeft}>
                            <FileText size={18} color={colors.textMuted} />
                            <Text style={styles.linkText}>Terms of Use</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textLight} />
                    </TouchableOpacity>

                    <View style={styles.rowDivider} />

                    {/* <TouchableOpacity style={styles.linkRow}>
                        <View style={styles.linkLeft}>
                            <Lock size={18} color={colors.textMuted} />
                            <Text style={styles.linkText}>Data Privacy & Control</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textLight} />
                    </TouchableOpacity> */}

                    <View style={styles.rowDivider} />

                    <TouchableOpacity style={styles.linkRow} onPress={() => handleSocial('childpolicy')}>
                        <View style={styles.linkLeft}>
                            <Baby size={18} color={colors.textMuted} />
                            <Text style={styles.linkText}>Child Policy</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textLight} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    backButton: {
        // marginBottom removed to use row layout
    },
    profileImageContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    headerAvatar: {
        width: '100%',
        height: '100%',
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
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    sectionContainer: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12, // Increased for better tap area
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryLight + '20',
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
        iconBoxLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',

    }
});
