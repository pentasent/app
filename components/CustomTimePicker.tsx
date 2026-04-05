import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Check } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

interface CustomTimePickerProps {
    visible: boolean;
    initialDate: Date | null;
    onClose: () => void;
    onSelect: (date: Date) => void;
}

const { width } = Dimensions.get('window');

/**
 * A themed, premium time picker modal.
 * Replaces the default system picker with a cohesive Pentasent UI.
 */
export const CustomTimePicker = ({ visible, initialDate, onClose, onSelect }: CustomTimePickerProps) => {
    // We use a base date for calculation
    const baseDate = initialDate || new Date();
    
    const [hour, setHour] = useState(0);
    const [minute, setMinute] = useState(0);
    const [isPM, setIsPM] = useState(false);

    useEffect(() => {
        if (visible) {
            let h = baseDate.getHours();
            const m = baseDate.getMinutes();
            
            const pm = h >= 12;
            setIsPM(pm);
            
            // Convert to 12h format for the picker
            if (h > 12) h -= 12;
            if (h === 0) h = 12;
            
            setHour(h);
            setMinute(m);
        }
    }, [visible, initialDate]);

    const handleConfirm = () => {
        const resultDate = new Date(baseDate);
        let finalHour = hour;
        
        // Convert back to 24h format
        if (isPM && finalHour < 12) finalHour += 12;
        if (!isPM && finalHour === 12) finalHour = 0;
        
        resultDate.setHours(finalHour);
        resultDate.setMinutes(minute);
        resultDate.setSeconds(0);
        resultDate.setMilliseconds(0);
        
        onSelect(resultDate);
    };

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 5-minute intervals for cleaner UI

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <StatusBar style="light" />
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Time</Text>
                    </View>

                    {/* Time Display */}
                    <View style={styles.timeDisplay}>
                        <Text style={styles.timeDisplayText}>
                            {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                            <Text style={styles.ampmText}> {isPM ? 'PM' : 'AM'}</Text>
                        </Text>
                    </View>

                    {/* Selectors */}
                    <View style={styles.selectors}>
                        {/* Hours */}
                        <View style={styles.pickerColumn}>
                            <Text style={styles.columnLabel}>HOUR</Text>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                                {hours.map((h) => (
                                    <TouchableOpacity 
                                        key={h} 
                                        style={[styles.timeItem, hour === h && styles.selectedItem]}
                                        onPress={() => setHour(h)}
                                    >
                                        <Text style={[styles.timeItemText, hour === h && styles.selectedItemText]}>{h}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Minutes */}
                        <View style={styles.pickerColumn}>
                            <Text style={styles.columnLabel}>MIN</Text>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                                {minutes.map((m) => (
                                    <TouchableOpacity 
                                        key={m} 
                                        style={[styles.timeItem, minute === m && styles.selectedItem]}
                                        onPress={() => setMinute(m)}
                                    >
                                        <Text style={[styles.timeItemText, minute === m && styles.selectedItemText]}>
                                            {m.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* AM/PM */}
                        <View style={styles.ampmColumn}>
                            <TouchableOpacity 
                                style={[styles.ampmBtn, !isPM && styles.ampmBtnActive]}
                                onPress={() => setIsPM(false)}
                            >
                                <Text style={[styles.ampmBtnText, !isPM && styles.ampmBtnTextActive]}>AM</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.ampmBtn, isPM && styles.ampmBtnActive]}
                                onPress={() => setIsPM(true)}
                            >
                                <Text style={[styles.ampmBtnText, isPM && styles.ampmBtnTextActive]}>PM</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                        <Check size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmBtnText}>Confirm Time</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    container: {
        backgroundColor: colors.card,
        width: '100%',
        maxWidth: 340,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h3,
        color: colors.text,
    },
    closeBtn: {
        padding: 4,
    },
    timeDisplay: {
        backgroundColor: colors.background,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    timeDisplayText: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2,
    },
    ampmText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textLight,
    },
    selectors: {
        flexDirection: 'row',
        height: 200,
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    pickerColumn: {
        flex: 1,
        alignItems: 'center',
    },
    columnLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textLight,
        marginBottom: 8,
        letterSpacing: 1,
    },
    scrollContent: {
        paddingBottom: spacing.lg,
    },
    timeItem: {
        width: 50,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.md,
        marginBottom: 4,
    },
    selectedItem: {
        backgroundColor: colors.primary + '15',
    },
    timeItemText: {
        fontSize: 16,
        color: colors.textMuted,
        fontWeight: '500',
    },
    selectedItemText: {
        color: colors.primary,
        fontWeight: '700',
    },
    ampmColumn: {
        width: 60,
        justifyContent: 'center',
        gap: 12,
    },
    ampmBtn: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.background,
    },
    ampmBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    ampmBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textMuted,
    },
    ampmBtnTextActive: {
        color: '#FFF',
    },
    confirmBtn: {
        backgroundColor: colors.primary,
        height: 54,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    }
});
