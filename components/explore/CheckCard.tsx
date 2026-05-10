import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Info } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

export const CheckCard = React.memo(({ onPress }: { onPress: () => void }) => {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <LinearGradient
                colors={['#A8E6CF', '#DCEDC1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={styles.iconSection}>
                        <View style={styles.iconCircle}>
                            <Info size={30} color="#3B7D64" />
                        </View>
                    </View>
                    
                    <View style={styles.textSection}>
                        <View style={styles.headerRow}>
                            <Text style={styles.title}>Check Card</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>TEST</Text>
                            </View>
                        </View>
                        <Text style={styles.subtitle}>
                            Testing the transition for any glitches.
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        width: '100%',
        height: 120,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        elevation: 8,
    },
    gradient: {
        flex: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconSection: {
        width: 68,
        height: 68,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textSection: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#3B7D64',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(59, 125, 100, 0.8)',
        fontWeight: '500',
    },
    badge: {
        backgroundColor: 'rgba(59, 125, 100, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 40,
        borderWidth: 0.5,
        borderColor: 'rgba(59, 125, 100, 0.4)',
    },
    badgeText: {
        color: '#3B7D64',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
