import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Linking, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Download, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface ReleaseNote {
    title: string;
    description: string;
}

interface UpdateModalProps {
    visible: boolean;
    isForced: boolean;
    latestVersion: string;
    message: string;
    releaseNotes?: ReleaseNote[];
    onUpdate: () => void;
    onDismiss?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
    visible,
    isForced,
    latestVersion,
    message,
    releaseNotes = [],
    onUpdate,
    onDismiss
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.container}>
                <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                
                <View style={styles.content}>
                    <LinearGradient
                        colors={['#FFFBF7', '#FFF']}
                        style={styles.card}
                    >
                        <View style={styles.header}>
                            <View style={[styles.iconBadge, { backgroundColor: isForced ? '#FFF1F1' :colors.primaryLight + '40' }]}>
                                <Sparkles size={32} color={isForced ? colors.primaryDark : colors.primary} />
                            </View>
                            <Text style={styles.title}>
                                {isForced ? 'Update Required' : 'New Update Available'}
                            </Text>
                            <View style={styles.versionBadge}>
                                <Text style={styles.versionText}>v{latestVersion}</Text>
                            </View>
                        </View>

                        <ScrollView 
                            style={styles.scrollArea} 
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.message}>{message}</Text>

                            {releaseNotes && releaseNotes.length > 0 && (
                                <View style={styles.notesContainer}>
                                    <Text style={styles.notesTitle}>What's New:</Text>
                                    {releaseNotes.map((note, index) => (
                                        <View key={index} style={styles.noteItem}>
                                            <View style={styles.noteDot}>
                                                <CheckCircle2 size={16} color={colors.primary} />
                                            </View>
                                            <View style={styles.noteText}>
                                                <Text style={styles.noteItemTitle}>{note.title}</Text>
                                                <Text style={styles.noteDesc}>{note.description}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity 
                                style={styles.updateBtn} 
                                onPress={onUpdate}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.primaryDark || colors.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.btnGradient}
                                >
                                    <Download size={20} color="#FFF" />
                                    <Text style={styles.btnText}>Update Now</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {!isForced && onDismiss && (
                                <TouchableOpacity 
                                    style={styles.dismissBtn} 
                                    onPress={onDismiss}
                                >
                                    <Text style={styles.dismissText}>Maybe Later</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    content: {
        width: '100%',
        maxWidth: 400,
    },
    card: {
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        // shadowRadius: 20,
        // elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    iconBadge: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h2,
        color: '#3c2a34',
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    versionBadge: {
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    versionText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
    },
    scrollArea: {
        maxHeight: 280,
    },
    scrollContent: {
        paddingBottom: spacing.lg,
    },
    message: {
        ...typography.body,
        color: '#6b4c5c',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.xl,
    },
    notesContainer: {
        backgroundColor: colors.background + '50',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    notesTitle: {
        ...typography.bodySmall,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: spacing.md,
    },
    noteItem: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    noteDot: {
        marginRight: spacing.sm,
        marginTop: 2,
    },
    noteText: {
        flex: 1,
    },
    noteItemTitle: {
        ...typography.bodySmall,
        fontWeight: '700',
        color: '#3c2a34',
    },
    noteDesc: {
        ...typography.caption,
        color: colors.textMuted,
        lineHeight: 18,
    },
    footer: {
        marginTop: spacing.xl,
        gap: spacing.md,
    },
    updateBtn: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    btnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    btnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    dismissBtn: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    dismissText: {
        ...typography.bodySmall,
        color: colors.textMuted,
        fontWeight: '500',
    },
});
