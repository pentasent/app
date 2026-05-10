import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, Dimensions, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, useAuth } from '@/contexts/AuthContext';
import { Toast } from '@/components/Toast';
import { LinearGradient } from 'expo-linear-gradient';
import { 
    ChevronLeft, 
    Calendar, 
    Clock, 
    Video, 
    Award, 
    Users, 
    CheckCircle2, 
    AlertCircle, 
    Wind, 
    Sparkles, 
    ChevronRight,
    MapPin,
    Flower2,
    Heart
} from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop, Path, Pattern } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const AnimatedChevrons = () => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const renderChevron = (delay: number) => {
        const opacity = anim.interpolate({
            inputRange: [delay, delay + 0.3, delay + 0.6, delay + 1],
            outputRange: [0.1, 1, 0.1, 0.1],
            extrapolate: 'clamp'
        });

        const translateX = anim.interpolate({
            inputRange: [delay, delay + 1],
            outputRange: [-4, 4],
            extrapolate: 'clamp'
        });

        return (
            <Animated.View style={{ opacity, transform: [{ translateX }], marginHorizontal: -4 }}>
                <ChevronRight size={16} color="#FFF" strokeWidth={3} />
            </Animated.View>
        );
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderChevron(0)}
            {renderChevron(0.2)}
            {renderChevron(0.4)}
        </View>
    );
};

export default function YogaEventDetail() {
    const router = useRouter();
    const { user } = useAuth();
    const scrollY = useRef(new Animated.Value(0)).current;
    
    // Registration States
    const [isRegistered, setIsRegistered] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    // Registration Deadline: June 21, 2026
    const today = new Date();
    const deadline = new Date(2026, 5, 21); // Month 5 = June
    const isRegistrationClosed = today >= deadline;

    const CACHE_KEY = 'is_registered_in_yoga_event_2026';

    const checkRegistrationStatus = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        try {
            // 1. Check Cache
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached === 'true') {
                setIsRegistered(true);
                setIsLoading(false);
                return;
            }

            // 2. Check Database
            const { data, error } = await supabase
                .from('yogaday2026')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) {
                setIsRegistered(true);
                await AsyncStorage.setItem(CACHE_KEY, 'true');
            }
        } catch (error) {
            console.log('[ERROR]:', 'Error checking registration:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        checkRegistrationStatus();
    }, [checkRegistrationStatus]);

    const handleRegister = async () => {
        if (!user) {
            setToastMsg('Please login to register');
            setToastType('info');
            return;
        }

        if (isRegistrationClosed) return;
        if (isRegistered) return;

        setIsSubmitting(true);
        try {
            // Re-check DB to be sure
            const { data: existing } = await supabase
                .from('yogaday2026')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                setIsRegistered(true);
                await AsyncStorage.setItem(CACHE_KEY, 'true');
                setToastMsg('You are already registered!');
                setToastType('info');
                return;
            }

            const { error } = await supabase
                .from('yogaday2026')
                .insert({ user_id: user.id });

            if (error) throw error;

            setIsRegistered(true);
            await AsyncStorage.setItem(CACHE_KEY, 'true');
            setToastMsg('Successfully registered for Yoga Day 2026!');
            setToastType('success');
        } catch (error) {
            console.log('[ERROR]:', 'Registration error:', error);
            setToastMsg('Failed to register. Please try again.');
            setToastType('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Banner Auras
    const aura1 = useRef(new Animated.Value(0)).current;
    const aura2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createAnim = (val: Animated.Value, duration: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );
        };
        const a1 = createAnim(aura1, 12000);
        const a2 = createAnim(aura2, 15000);
        a1.start();
        a2.start();
        return () => { a1.stop(); a2.stop(); };
    }, []);

    const aura1Style = {
        transform: [
            { translateX: aura1.interpolate({ inputRange: [0, 1], outputRange: [-50, 100] }) },
            { translateY: aura1.interpolate({ inputRange: [0, 1], outputRange: [-20, 50] }) },
            { scale: aura1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) },
        ],
        opacity: aura1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.3, 0.1] }),
    };

    const aura2Style = {
        transform: [
            { translateX: aura2.interpolate({ inputRange: [0, 1], outputRange: [100, -50] }) },
            { translateY: aura2.interpolate({ inputRange: [0, 1], outputRange: [50, -20] }) },
            { scale: aura2.interpolate({ inputRange: [0, 1], outputRange: [1.3, 1] }) },
        ],
        opacity: aura2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.2, 0.1] }),
    };

    const bannerTranslateY = scrollY.interpolate({
        inputRange: [-height, 0, height],
        outputRange: [height / 2, 0, -height / 3],
    });

    const bannerOpacity = scrollY.interpolate({
        inputRange: [0, height * 0.3],
        outputRange: [1, 0],
    });

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />


            <Animated.ScrollView
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button (In-Scroll) */}
                <View style={styles.inlineBackWrapper}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <ChevronLeft color="#FFF" size={24} />
                    </TouchableOpacity>
                </View>
                {/* Header Banner */}
                <Animated.View style={[styles.banner, { transform: [{ translateY: bannerTranslateY }], opacity: bannerOpacity }]}>
                    <LinearGradient
                        colors={['#6D597A', '#355070', '#1A2F4B']}
                        style={StyleSheet.absoluteFill}
                    />
                    <Animated.View style={[styles.aura, styles.aura1, aura1Style]} />
                    <Animated.View style={[styles.aura, styles.aura2, aura2Style]} />
                    
                    <View style={styles.bannerContent}>
                        <Svg height="120" width={width}>
                            <Defs>
                                <Pattern
                                    id="wavePattern"
                                    patternUnits="userSpaceOnUse"
                                    x="0"
                                    y="0"
                                    width="60"
                                    height="20"
                                    viewBox="0 0 60 20"
                                >
                                    <Path
                                        d="M0 10 Q 15 0, 30 10 T 60 10"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.4)"
                                        strokeWidth="1.5"
                                    />
                                    <Path
                                        d="M0 15 Q 15 5, 30 15 T 60 15"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.2)"
                                        strokeWidth="1"
                                    />
                                </Pattern>
                                <SvgGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0%" stopColor="#FFF" stopOpacity="0.95" />
                                    <Stop offset="100%" stopColor="#FFF" stopOpacity="0.75" />
                                </SvgGradient>
                            </Defs>
                            {/* Base Text */}
                            <SvgText
                                fill="url(#baseGrad)"
                                fontSize="72"
                                fontWeight="900"
                                x={width / 2}
                                y="95"
                                textAnchor="middle"
                                letterSpacing="20"
                                fontStyle="italic"
                                fontFamily={Platform.OS === 'ios' ? 'Savoye LET' : 'serif'}
                            >
                                YOGA
                            </SvgText>
                            {/* Pattern Overlay */}
                            <SvgText
                                fill="url(#wavePattern)"
                                fontSize="72"
                                fontWeight="900"
                                x={width / 2}
                                y="95"
                                textAnchor="middle"
                                letterSpacing="20"
                                fontStyle="italic"
                                fontFamily={Platform.OS === 'ios' ? 'Savoye LET' : 'serif'}
                            >
                                YOGA
                            </SvgText>
                        </Svg>
                    </View>
                </Animated.View>

                {/* Main Content */}
                <View style={styles.contentCard}>
                    <View style={styles.titleSection}>
                        <View style={styles.tagRow}>
                            <View style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                                <Video size={14} color={colors.primary} />
                                <Text style={[styles.tagText, { color: colors.primary }]}>Online Event</Text>
                            </View>
                            <View style={[styles.tag, { backgroundColor: colors.secondary + '15' }]}>
                                <Award size={14} color={colors.secondary} />
                                <Text style={[styles.tagText, { color: colors.secondary }]}>Certificate</Text>
                            </View>
                        </View>
                        
                        <Text style={styles.title}>Global Harmony: International Yoga Day 2026</Text>
                        
                        <View style={styles.infoStack}>
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIcon, { backgroundColor: colors.primary + '10' }]}>
                                    <Calendar size={18} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.infoLabel}>DATE</Text>
                                    <Text style={styles.infoValue}>21 June 2026</Text>
                                </View>
                            </View>
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIcon, { backgroundColor: colors.secondary + '10' }]}>
                                    <Clock size={18} color={colors.secondary} />
                                </View>
                                <View>
                                    <Text style={styles.infoLabel}>TIME</Text>
                                    <Text style={styles.infoValue}>03:00 AM - 11:00 AM</Text>
                                </View>
                            </View>
                        </View>
                    </View>

{/* About Section */}
<View style={styles.section}>
    <Text style={styles.sectionTitle}>About the Event</Text>

    <Text style={styles.sectionText}>
        Celebrate International Yoga Day 2026 with the Pentasent community through a shared day of mindfulness, movement, and wellness.
    </Text>

    <Text style={styles.sectionText}>
        From 3:00 AM to 11:00 AM on 21 June 2026, participants can practice yoga at their own pace, share their yoga journey with the community, and take part in a global wellness movement focused on balance, focus, and healthy living.
    </Text>

    <Text style={styles.sectionText}>
        Participants who register and actively share their yoga participation in the community during the event hours will be eligible to receive a digital participation certificate after the event concludes.
    </Text>
</View>

{/* Event Overview */}
<View style={styles.section}>
    <Text style={styles.sectionTitle}>Event Overview</Text>

    <View style={styles.programList}>
        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Users size={20} color={colors.primary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Community-Based Yoga Event</Text>
                <Text style={styles.programDesc}>
                    Join the Pentasent community and participate in Yoga Day by sharing your practice, progress, and wellness moments throughout the event.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Video size={20} color={colors.secondary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Live Community Participation</Text>
                <Text style={styles.programDesc}>
                    Follow real-time updates, yoga posts, and wellness activities shared by participants between 3:00 AM and 11:00 AM.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Award size={20} color={colors.info} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Digital Participation Certificate</Text>
                <Text style={styles.programDesc}>
                    Eligible participants will receive their Yoga Day 2026 participation certificate after the event ends at 11:00 AM.
                </Text>
            </View>
        </View>
    </View>
</View>

{/* Program Highlights */}
<View style={styles.section}>
    <Text style={styles.sectionTitle}>Program Highlights</Text>

    <View style={styles.programList}>
        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Flower2 size={20} color={colors.primary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Yoga Asanas You Can Practice</Text>
                <Text style={styles.programDesc}>
                    Participants can practice simple yoga poses such as Surya Namaskar, Tadasana, Bhujangasana, Vrikshasana, Vajrasana, and Balasana based on their comfort level.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Wind size={20} color={colors.secondary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Pranayama & Breathing Practices</Text>
                <Text style={styles.programDesc}>
                    Practice calming breathing exercises including Anulom Vilom, Bhramari, Kapalbhati, and deep breathing for relaxation and mindfulness.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Sparkles size={20} color={colors.info} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Wellness & Mindfulness</Text>
                <Text style={styles.programDesc}>
                    Focus on stretching, body awareness, meditation, hydration, and maintaining a peaceful and healthy routine throughout the day.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Heart size={20} color={colors.primary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Community Sharing</Text>
                <Text style={styles.programDesc}>
                    Share your yoga images, wellness activities, and progress updates in the community using <Text style={styles.hashtag}>#YogaDay2026</Text>.
                </Text>
            </View>
        </View>
    </View>
</View>

{/* How to Participate */}
<View style={styles.section}>
    <Text style={styles.sectionTitle}>How to Participate</Text>

    <View style={styles.programList}>
        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <CheckCircle2 size={20} color={colors.primary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Register for the Event</Text>
                <Text style={styles.programDesc}>
                    Complete your registration through the event page before participating in Yoga Day activities.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <MapPin size={20} color={colors.secondary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Prepare Your Yoga Space</Text>
                <Text style={styles.programDesc}>
                    Choose a clean, quiet, and well-ventilated area where you can comfortably practice yoga and breathing exercises.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Flower2 size={20} color={colors.info} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Keep Essentials Ready</Text>
                <Text style={styles.programDesc}>
                    Keep your yoga mat, water bottle, towel, and comfortable clothing ready before starting your practice.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Users size={20} color={colors.primary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Share in the Community</Text>
                <Text style={styles.programDesc}>
                    Upload your yoga photos or wellness updates in the community between 3:00 AM and 11:00 AM on 21 June 2026.
                </Text>
            </View>
        </View>

        <View style={styles.programItem}>
            <View style={styles.programIcon}>
                <Award size={20} color={colors.secondary} />
            </View>
            <View style={styles.programDetails}>
                <Text style={styles.programName}>Get Your Certificate</Text>
                <Text style={styles.programDesc}>
                    Participants who register and share their participation posts during the event will receive a digital certificate after 11:00 AM on the same day.
                </Text>
            </View>
        </View>
    </View>
</View>

{/* Safety Section */}
<View style={styles.section}>
    <View style={styles.warningHeader}>
        <AlertCircle size={20} color="#EF4444" />
        <Text style={styles.warningTitle}>Safety Instructions</Text>
    </View>

    <Text style={styles.cleanWarningText}>
        Practice yoga according to your comfort and flexibility level. Avoid difficult postures if you are a beginner or feel discomfort during practice.
    </Text>

    <Text style={[styles.cleanWarningText, { marginTop: 12 }]}>
        Wear comfortable clothing, stay hydrated, and practice in a safe and open space with proper ventilation.
    </Text>

    <Text style={[styles.cleanWarningText, { marginTop: 12 }]}>
        If you have any medical conditions, recent injuries, breathing difficulties, heart-related concerns, or are recovering from surgery, please consult a medical professional before participating.
    </Text>

    <Text style={[styles.cleanWarningText, { marginTop: 12 }]}>
        Participants are encouraged to take breaks whenever needed and avoid overexertion during yoga or pranayama practices.
    </Text>
</View>

{/* Closing */}
<View style={styles.section}>
    <Text style={styles.sectionTitle}>International Yoga Day 2026</Text>

    <Text style={styles.sectionText}>
        Take a moment for your physical and mental well-being by joining the Pentasent community this International Yoga Day.
    </Text>

    <Text style={styles.sectionText}>
        Practice yoga, share your journey, inspire others, and celebrate wellness together on 21 June 2026.
    </Text>
</View>

                    <View style={{ height: 120 }} />
                </View>
            </Animated.ScrollView>


            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[
                        styles.registerButton,
                        (isRegistrationClosed || isSubmitting) && styles.disabledBtn
                    ]}
                    onPress={handleRegister}
                    disabled={isRegistrationClosed || isRegistered || isSubmitting}
                >
                    <LinearGradient
                        colors={isRegistrationClosed ? ['#9CA3AF', '#6B7280'] : ['#6D597A', '#355070']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.btnGradient}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Text style={styles.registerText}>
                                    {isRegistrationClosed ? 'Registration Closed' : (isRegistered ? 'Attending' : 'Register for Event')}
                                </Text>
                                {!isRegistrationClosed && !isRegistered && (
                                    <View style={styles.arrowContainer}>
                                        <AnimatedChevrons />
                                    </View>
                                )}
                                {isRegistered && <CheckCircle2 size={20} color="#FFF" style={{ marginLeft: 8 }} />}
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {toastMsg && (
                <Toast 
                    message={toastMsg} 
                    type={toastType} 
                    onHide={() => setToastMsg(null)} 
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    backButtonWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    inlineBackWrapper: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 50 : 60,
        left: 0,
        zIndex: 100,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        marginLeft: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    scrollContent: {
        flexGrow: 1,
    },
    banner: {
        height: height * 0.35,
        width: width,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    aura: {
        position: 'absolute',
        width: width,
        height: width,
        borderRadius: width / 2,
    },
    aura1: {
        backgroundColor: '#E5989B',
        top: -width / 4,
        left: -width / 4,
    },
    aura2: {
        backgroundColor: '#8B5CF6',
        bottom: -width / 4,
        right: -width / 4,
    },
    bannerContent: {
        alignItems: 'center',
        zIndex: 10,
    },
    yogaHeroText: {
        fontSize: 72,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 20,
        fontFamily: Platform.OS === 'ios' ? 'Savoye LET' : 'serif',
        fontStyle: 'italic',
        opacity: 0.95,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginTop: -10,
    },
    heroBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
    },
    contentCard: {
        backgroundColor: colors.background,
        marginTop: -80,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        paddingTop: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    titleSection: {
        marginBottom: spacing.xl,
    },
    tagRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '700',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 16,
        lineHeight: 36,
    },
    infoStack: {
        gap: spacing.md,
        // backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        // borderRadius: borderRadius.xl,
        // borderWidth: 1,
        // borderColor: colors.borderLight,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 10,
        color: colors.textLight,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '700',
    },
    section: {
        marginBottom: spacing.xxl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    sectionText: {
        fontSize: 15,
        color: colors.textLight,
        lineHeight: 22,
        marginBottom: 12,
    },
    programList: {
        gap: 20,
    },
    programItem: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    programIcon: {
        marginTop: 2.5,
    },
    programDetails: {
        flex: 1,
    },
    programName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    programDesc: {
        fontSize: 15,
        color: colors.textLight,
        lineHeight: 22,
    },
    guideBox: {
        backgroundColor: colors.surface,
        padding: spacing.xl,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: spacing.md,
    },
    guideStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    stepDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginTop: 8,
    },
    guideText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 22,
        flex: 1,
    },
    linkText: {
        color: colors.primary,
        fontWeight: '700',
    },
    hashtag: {
        color: colors.secondary,
        fontWeight: '700',
    },
    warningSection: {
        backgroundColor: '#FEF2F2',
        padding: spacing.xl,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: spacing.md,
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    cleanWarningText: {
        fontSize: 15,
        color: colors.textLight,
        lineHeight: 22,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: 'transparent',
    },
    registerButton: {
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: '#6D597A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl,
    },
    registerText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        marginRight: 12,
    },
    arrowContainer: {
        width: 60,
        height: 25,
        borderRadius: 50,
        borderWidth: 1.2,
        borderColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 10
    },
    disabledBtn: {
        opacity: 0.7,
    },
});
