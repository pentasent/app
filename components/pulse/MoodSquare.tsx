import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { MoodConfig } from '../../constants/moods';

interface MoodSquareProps {
    mood: MoodConfig;
    selected: boolean;
    onPress: () => void;
    size?: number;
}

export const MoodSquare: React.FC<MoodSquareProps> = ({ 
    mood, 
    selected, 
    onPress,
    size = 100 
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.container,
                { width: size, height: size },
                selected && { 
                    borderColor: colors.primary, 
                    backgroundColor: colors.primary + '10',
                    borderWidth: 2,
                }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.emoji, { fontSize: size * 0.35 }]}>{mood.emoji}</Text>
            <Text style={[
                styles.label, 
                { fontSize: size * 0.12 },
                selected && { color: colors.primary, fontWeight: '700' }
            ]}>
                {mood.label}
            </Text>
            {selected && (
                <View style={styles.checkIcon}>
                    <View style={styles.checkDot} />
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    emoji: {
        marginBottom: 8,
    },
    label: {
        color: colors.textMuted,
        fontWeight: '600',
    },
    checkIcon: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: colors.primary,
        padding: 1,
    },
    checkDot: {
        flex: 1,
        borderRadius: 5,
        backgroundColor: colors.primary,
    }
});
