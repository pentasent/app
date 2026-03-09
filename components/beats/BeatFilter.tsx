import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Filter, Clock, Eye } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export type SortOption = 'views' | 'duration';

interface BeatFilterProps {
    sortBy: SortOption;
    onSortChange: (option: SortOption) => void;
}

export const BeatFilter: React.FC<BeatFilterProps> = ({ sortBy, onSortChange }) => {
    return (
        <View style={styles.container}>
            <View style={styles.labelContainer}>
                <Filter size={16} color={colors.textLight} />
                <Text style={styles.label}>Sort by:</Text>
            </View>

            <View style={styles.options}>
                <TouchableOpacity
                    style={[styles.option, sortBy === 'views' && styles.activeOption]}
                    onPress={() => onSortChange('views')}
                >
                    <Eye size={14} color={sortBy === 'views' ? colors.primary : colors.textLight} />
                    <Text style={[styles.optionText, sortBy === 'views' && styles.activeOptionText]}>Views</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.option, sortBy === 'duration' && styles.activeOption]}
                    onPress={() => onSortChange('duration')}
                >
                    <Clock size={14} color={sortBy === 'duration' ? colors.primary : colors.textLight} />
                    <Text style={[styles.optionText, sortBy === 'duration' && styles.activeOptionText]}>Duration</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xs,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        fontSize: 14,
        color: colors.textLight,
        fontWeight: '500',
    },
    options: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeOption: {
        borderColor: colors.primary,
        backgroundColor: colors.surface,
    },
    optionText: {
        fontSize: 12,
        color: colors.textLight,
    },
    activeOptionText: {
        color: colors.primary,
        fontWeight: '600',
    }
});
