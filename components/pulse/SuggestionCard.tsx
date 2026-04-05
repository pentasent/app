import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { Suggestion, MOODS, MoodTag } from '../../constants/moods';
import { Sparkles, ChevronRight, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface SuggestionCardProps {
    visible: boolean;
    suggestion: Suggestion;
    moodTag: MoodTag;
    onClose: () => void;
    onAction: (suggestion: Suggestion) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
    visible,
    suggestion,
    moodTag,
    onClose,
    onAction,
}) => {
    const moodEmoji = MOODS.find(m => m.tag === moodTag)?.emoji || '😊';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={18} color={colors.text} />
                    </TouchableOpacity> */}

                    <View style={styles.iconWrapper}>
                        <View style={styles.emojiCircle}>
                            <Text style={styles.emoji}>{moodEmoji}</Text>
                        </View>
                        <View style={styles.sparkleBadge}>
                            <Sparkles size={18} color="#FFF" />
                        </View>
                    </View>

                    <Text style={styles.title}>All Checked In!</Text>
                    <Text style={styles.message}>{suggestion.message}</Text>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onAction(suggestion)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionButtonText}>{suggestion.buttonText}</Text>
                        <ChevronRight size={18} color="#FFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dismissButton}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.dismissButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                    {/* 
                    <TouchableOpacity onPress={onClose} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Dismiss</Text>
                    </TouchableOpacity> */}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    dismissButton: {
        width: '100%',
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.xs,
    },

    dismissButtonText: {
        fontSize: 15,
        color: colors.textMuted,
        fontWeight: '700',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)', // Deeper dim for suggestion
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    card: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: 32,
        padding: spacing.xl,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 20,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: spacing.xl,
        marginTop: spacing.md,
    },
    emojiCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary + '20',
    },
    emoji: {
        fontSize: 50,
    },
    sparkleBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: colors.background,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 24,
        paddingHorizontal: spacing.sm,
        fontWeight: '500',
    },
    actionButton: {
        backgroundColor: colors.primary,
        width: '100%',
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        // shadowColor: colors.primary,
        // shadowOffset: { width: 0, height: 8 },
        // shadowOpacity: 0.4,
        // shadowRadius: 15,
        // elevation: 10,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },
    secondaryButton: {
        paddingVertical: spacing.md,
    },
    secondaryButtonText: {
        fontSize: 15,
        color: colors.textMuted,
        fontWeight: '700',
    },
});
