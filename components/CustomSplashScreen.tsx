import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography } from '@/constants/theme';
import { WELLNESS_MESSAGES } from '@/constants/splashMessage';

const { width, height } = Dimensions.get('window');

const AnimatedImage = Animated.createAnimatedComponent(Image);

// Global flag to ensure splash only shows once per app session
let hasShownSplashGlobal = false;

interface CustomSplashScreenProps {
    isReady: boolean;
}

export const CustomSplashScreen = ({ isReady }: CustomSplashScreenProps) => {
    const [visible, setVisible] = useState(!hasShownSplashGlobal);
    
    // Pick a random message once on mount
    const messageRef = useRef(WELLNESS_MESSAGES[Math.floor(Math.random() * WELLNESS_MESSAGES.length)]);
    const currentMessage = messageRef.current;

    // Core removal animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    // Premium entry animations
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.95)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const taglineTranslateY = useRef(new Animated.Value(10)).current;
    
    // Atmospheric Light animations
    const aura1Pos = useRef(new Animated.Value(0)).current;
    const aura2Pos = useRef(new Animated.Value(0)).current;
    const auraOpacity = useRef(new Animated.Value(0)).current;


    useEffect(() => {
        // 1. ENTRY ANIMATIONS (Always run on mount)
        const startTimer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(logoOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.spring(logoScale, { toValue: 1, friction: 9, tension: 20, useNativeDriver: true }),
                Animated.timing(auraOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.sequence([
                    Animated.delay(600),
                    Animated.parallel([
                        Animated.timing(taglineOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
                        Animated.timing(taglineTranslateY, { toValue: 0, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true })
                    ])
                ])
            ]).start();
        }, 100);

        // 2. CONTINUOUS MOTION (Auras)
        const auraAnimations = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(aura1Pos, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(aura1Pos, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(aura2Pos, { toValue: 1, duration: 15000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(aura2Pos, { toValue: 0, duration: 15000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            ])
        );
        auraAnimations.start();

        return () => {
            clearTimeout(startTimer);
            auraAnimations.stop();
        };
    }, []);

    useEffect(() => {
        // 3. FAILSAFE (Hide after 15s regardless of isReady if still visible)
        let failsafeTimer: NodeJS.Timeout;
        
        if (visible && !isReady) {
            failsafeTimer = setTimeout(() => {
                // console.log('[DEBUG]: Splash screen failsafe triggered');
                setVisible(false);
                hasShownSplashGlobal = true;
            }, 15000);
        }

        return () => {
            if (failsafeTimer) clearTimeout(failsafeTimer);
        };
    }, [visible, isReady]);

    useEffect(() => {
        // 4. EXIT LOGIC
        // We ensure a minimum cinematic duration of 3.5s (1s start + 2.5s display)
        if (isReady && visible) {
            const exitTimer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 800,
                        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1.08,
                        duration: 800,
                        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                        useNativeDriver: true,
                    })
                ]).start(() => {
                    setVisible(false);
                    hasShownSplashGlobal = true;
                });
            }, 3000); // 3s + the initial 100ms + the transition time ~ 4s total premium experience

            return () => clearTimeout(exitTimer);
        }
    }, [isReady, visible]);

    const containerStyle = {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        display: visible ? 'flex' as const : 'none' as const,
    };

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Base theme color for seamless transition */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
            
            <LinearGradient
                colors={[colors.surface, colors.background, colors.primaryLight]}
                style={StyleSheet.absoluteFill}
            />
            
            {/* Atmospheric Light Layers - Solid colors with optimized opacity for premium visibility */}
            <Animated.View style={[styles.aura, styles.aura1, { 
                opacity: Animated.multiply(auraOpacity, 0.25),
                transform: [
                    { translateX: aura1Pos.interpolate({ inputRange: [0, 1], outputRange: [-50, 30] }) },
                    { translateY: aura1Pos.interpolate({ inputRange: [0, 1], outputRange: [-30, 50] }) },
                    { scale: aura1Pos.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }
                ] 
            }]} />
            
            <Animated.View style={[styles.aura, styles.aura2, { 
                opacity: Animated.multiply(auraOpacity, 0.2),
                transform: [
                    { translateX: aura2Pos.interpolate({ inputRange: [0, 1], outputRange: [50, -30] }) },
                    { translateY: aura2Pos.interpolate({ inputRange: [0, 1], outputRange: [70, -10] }) },
                    { scale: aura2Pos.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1] }) }
                ] 
            }]} />

            <View style={styles.content}>
                <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
                    <Image
                        source={require('@/assets/images/logo/logo_light.svg')}
                        style={styles.logo}
                        contentFit="contain"
                    />
                </Animated.View>

                <Animated.View style={{ 
                    opacity: taglineOpacity, 
                    transform: [{ translateY: taglineTranslateY }],
                    marginTop: spacing.xl,
                    paddingHorizontal: spacing.xl,
                }}>
                    <Text style={styles.tagline}>
                        {currentMessage.text}{'\n'}
                        <Text style={styles.taglineHighlight}>{currentMessage.highlight}</Text> {currentMessage.suffix}
                    </Text>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Made for you by Pentasent</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99999,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aura: {
        position: 'absolute',
        width: width * 1.4,
        height: width * 1.4,
        borderRadius: width * 0.7,
    },
    aura1: {
        backgroundColor: colors.primary, // Dusty Rose
        top: -width * 0.5,
        left: -width * 0.5,
    },
    aura2: {
        backgroundColor: colors.secondary, // Sage
        bottom: -width * 0.5,
        right: -width * 0.5,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    logo: {
        width: 180,
        height: 90,
    },
    tagline: {
        fontSize: 18,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 28,
        fontWeight: '400',
        letterSpacing: 0.5,
        fontStyle: 'italic',
    },
    taglineHighlight: {
        fontWeight: '700',
        color: colors.primary,
        fontStyle: 'normal',
    },
    footer: {
        position: 'absolute',
        bottom: 60,
    },
    footerText: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '300',
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'ios' ? 'Savoye LET' : 'serif',
        opacity: 0.8,
    }
});
