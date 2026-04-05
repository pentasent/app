import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Pressable,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { MOODS, ENERGY_LEVELS, STRESS_LEVELS, SLEEP_QUALITY, MoodTag } from '../../constants/moods';
import Slider from '@react-native-community/slider';
import { X, LayoutGrid, Calendar1, Calendar } from 'lucide-react-native';
import { MoodSquare } from './MoodSquare';
import { useAuth } from '../../contexts/AuthContext';
import KeyboardShiftView from '../KeyboardShiftView';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MoodCheckInSheetProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: {
        mood_tag: MoodTag;
        energy_level: number;
        stress_level: number;
        sleep_quality: number;
        notes: string;
    }) => void;
    initialMood?: MoodTag;
}

const GET_LEVEL_COLOR = (value: number, type: 'energy' | 'stress' | 'sleep' = 'energy') => {
    const v = Math.round(value);
    
    // Stress is inverted (High stress is bad/red)
    if (type === 'stress') {
        if (v === 1) return '#10B981'; // Very Low
        if (v === 2) return '#34D399'; // Low
        if (v === 3) return '#F59E0B'; // Medium
        if (v === 4) return '#EF4444'; // High
        return '#B91C1C';             // Very High
    }

    // Energy & Sleep (High is good/green)
    if (v === 1) return '#B91C1C';     // Very Bad
    if (v === 2) return '#EF4444';     // Low
    if (v === 3) return '#F59E0B';     // Normal
    if (v === 4) return '#34D399';     // High
    return '#10B981';                 // Very High
};

const SliderControl = ({ label, value, onValueChange, config, type }: any) => {
    const animatedValue = React.useRef(new Animated.Value(value)).current;
    
    // This state is only used to update the label text locally to avoid full sheet re-renders
    const [localVal, setLocalVal] = useState(value);

    const handleValueChange = (val: number) => {
        animatedValue.setValue(val);
        const rounded = Math.round(val);
        if (rounded !== localVal) {
            setLocalVal(rounded);
            onValueChange(rounded);
        }
    };

    const activeWidth = animatedValue.interpolate({
        inputRange: [1, 5],
        outputRange: ['0%', '100%'],
    });

    const activeColor = animatedValue.interpolate({
        inputRange: [1, 2, 3, 4, 5],
        outputRange: type === 'stress' 
            ? ['#10B981', '#34D399', '#F59E0B', '#EF4444', '#B91C1C']
            : ['#B91C1C', '#EF4444', '#F59E0B', '#34D399', '#10B981']
    });

    return (
        <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>{label}</Text>
                <Animated.Text style={[styles.levelValue, { color: activeColor }]}>
                    {config.find((c: any) => c.value === localVal)?.label || ''}
                </Animated.Text>
            </View>
            <View style={styles.customSliderContainer}>
                {/* Visual Foundation (Indented to match Slider's internal thumb range) */}
                <View style={{ position: 'absolute', left: 10, right: 10, top: 0, bottom: 0, justifyContent: 'center' }} pointerEvents="none">
                    {/* Clean Thinner Track */}
                    <View style={[styles.sliderTrack, { backgroundColor: colors.borderLight + '80' }]} />
                    
                    {/* Active Progress Overlay */}
                    <Animated.View 
                        style={[
                            styles.activeTrack, 
                            { 
                                width: activeWidth,
                                backgroundColor: activeColor,
                            }
                        ]} 
                    />
                    
                    {/* Custom Thumb Overlay (Directly centered over the point) */}
                    <Animated.View 
                        style={[
                            styles.customThumb,
                            { 
                                left: activeWidth,
                                backgroundColor: activeColor,
                                transform: [{ translateX: -10 }] // Centered over the 0-100% point
                            }
                        ]}
                    />
                </View>

                {/* The actual interactive slider sits on top */}
                <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={5}
                    step={0.1}
                    value={value}
                    onValueChange={handleValueChange}
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    thumbTintColor="transparent"
                />
            </View>
        </View>
    );
};

export const MoodCheckInSheet: React.FC<MoodCheckInSheetProps> = ({
    visible,
    onClose,
    onSubmit,
    initialMood,
}) => {
    const { user } = useAuth();
    const [mood, setMood] = useState<MoodTag>(initialMood || 'neutral');
    const [energy, setEnergy] = useState(3);
    const [stress, setStress] = useState(3);
    const [sleep, setSleep] = useState(3);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialMood) {
            setMood(initialMood);
        }
    }, [initialMood, visible]);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        
        try {
            setIsSubmitting(true);
            await onSubmit({
                mood_tag: mood,
                energy_level: Math.round(energy),
                stress_level: Math.round(stress),
                sleep_quality: Math.round(sleep),
                notes,
            });
        } catch (e) {
            console.log('[ERROR]:', 'Submission failed:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Transparent Top Space */}
                <Pressable style={styles.dismissArea} onPress={onClose} />
                
                <KeyboardShiftView 
                    style={styles.sheetContainer}
                >
                    <View style={styles.sheet}>
                        <View style={styles.header}>
                            <View style={styles.headerTitleContainer}>
                                <View style={styles.iconCircle}>
                                    <Calendar size={18} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.headerTitle}>Daily Check-in</Text>
                                    <Text style={styles.headerSubtitle}>How are you feeling, {user?.name || 'there'}?</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {/* Mood Selection */}
                            <Text style={styles.sectionLabel}>YOUR MOOD</Text>
                            <View style={styles.fullWidthMoodSection}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.moodScroll}
                                >
                                {MOODS.map((m) => (
                                    <View key={m.tag} style={{ marginRight: spacing.sm }}>
                                        <MoodSquare
                                            mood={m}
                                            selected={mood === m.tag}
                                            onPress={() => setMood(m.tag)}
                                            size={90}
                                        />
                                    </View>
                                ))}
                                </ScrollView>
                            </View>

                            {/* Custom Sliders */}
                            <View style={styles.sliderGroup}>
                                <SliderControl
                                    label="Energy Level"
                                    value={energy}
                                    onValueChange={setEnergy}
                                    config={ENERGY_LEVELS}
                                    type="energy"
                                />
                                <SliderControl
                                    label="Stress Level"
                                    value={stress}
                                    onValueChange={setStress}
                                    config={STRESS_LEVELS}
                                    type="stress"
                                />
                                <SliderControl
                                    label="Sleep Quality"
                                    value={sleep}
                                    onValueChange={setSleep}
                                    config={SLEEP_QUALITY}
                                    type="sleep"
                                />
                            </View>

                            {/* Notes */}
                            <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
                            <TextInput
                                style={styles.notesInput}
                                placeholder="What's on your mind?"
                                placeholderTextColor={colors.textMuted}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />

                            <TouchableOpacity 
                                style={[styles.submitButton, isSubmitting && { opacity: 0.8 }]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                                activeOpacity={0.8}
                            >
                                {isSubmitting ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                                        <Text style={styles.submitButtonText}>Saving...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.submitButtonText}>Complete Check-in</Text>
                                )}
                            </TouchableOpacity>

                            <View style={{ height: spacing.xl * 2 }} />
                        </ScrollView>
                    </View>
                </KeyboardShiftView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    sheetContainer: {
        maxHeight: SCREEN_HEIGHT * 0.8,
    },
    sheet: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: spacing.lg,
        // paddingHorizontal: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '500',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    fullWidthMoodSection: {
        marginHorizontal: -spacing.lg,
    },
    moodScroll: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    sliderGroup: {
        marginTop: spacing.md,
    },
    sliderSection: {
        marginBottom: spacing.xl,
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    levelValue: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    customSliderContainer: {
        height: 40,
        justifyContent: 'center',
    },
    sliderTrack: {
        height: 6,
        borderRadius: 3,
        width: '100%',
        position: 'absolute',
    },
    activeTrack: {
        height: 6,
        borderRadius: 3,
        position: 'absolute',
    },
    slider: {
        width: '100%',
        height: 40,
        zIndex: 10,
    },
    customThumb: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
        borderColor: colors.background,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    notesInput: {
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
        fontSize: 15,
        color: colors.text,
        minHeight: 120,
        marginBottom: spacing.xl,
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        alignItems: 'center',
        // shadowColor: colors.primary,
        // shadowOffset: { width: 0, height: 6 },
        // shadowOpacity: 0.4,
        // shadowRadius: 12,
        // elevation: 8,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
