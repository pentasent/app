import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

// Shared animation values to keep clones in sync
const sharedPulseAnim = new Animated.Value(0);
const sharedRotateAnim = new Animated.Value(0);
const sharedMesh1Anim = new Animated.Value(0);
const sharedMesh2Anim = new Animated.Value(0);

// Shared interpolations to prevent single-frame flickers on re-render
const sharedSpin = sharedRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
});

const sharedScale = sharedPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
});

const sharedOpacity = sharedPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.4],
});

const sharedMesh1X = sharedMesh1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
});

const sharedMesh2X = sharedMesh2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -20],
});

// Start shared animations once
Animated.loop(
    Animated.sequence([
        Animated.timing(sharedPulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(sharedPulseAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
    ])
).start();

Animated.loop(
    Animated.timing(sharedRotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
    })
).start();

Animated.loop(
    Animated.sequence([
        Animated.timing(sharedMesh1Anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(sharedMesh1Anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
    ])
).start();

Animated.loop(
    Animated.sequence([
        Animated.timing(sharedMesh2Anim, { toValue: 1, duration: 5500, useNativeDriver: true }),
        Animated.timing(sharedMesh2Anim, { toValue: 0, duration: 5500, useNativeDriver: true }),
    ])
).start();

export const MayaCard = React.memo(({ onPress }: { onPress: () => void }) => {
    // No local interpolations - use shared ones
    const spin = sharedSpin;
    const scale = sharedScale;
    const opacity = sharedOpacity;
    const mesh1X = sharedMesh1X;
    const mesh2X = sharedMesh2X;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <LinearGradient
                colors={[colors.primary, colors.indigoLight, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <Image 
                    source={{ uri: `${process.env.EXPO_PUBLIC_STORAGE_BASE_URL}/avatars/maya/maya_background.jpg` }}
                    style={styles.texture}
                    contentFit="cover"
                    priority="high"
                    cachePolicy="memory-disk"
                />

                <Animated.View style={[styles.mesh, { backgroundColor: '#8B5CF6', right: -30, top: -20, opacity: 0.25, transform: [{ translateX: mesh1X }] }]} />
                <Animated.View style={[styles.mesh, { backgroundColor: colors.primary, left: -20, bottom: -30, opacity: 0.3, transform: [{ translateX: mesh2X }] }]} />
                
                <View style={styles.content}>
                    <View style={styles.iconWrapper}>
                        <Animated.View style={[styles.pulse, { transform: [{ scale }], opacity }]} />
                        <Animated.View style={[styles.halo, { transform: [{ rotate: spin }] }]}>
                            <View style={styles.haloDot} />
                        </Animated.View>
                        <View style={styles.iconContainer}>
                            <Sparkles size={30} color="#FFF" fill="#FFF" />
                        </View>
                    </View>
                    
                    <View style={styles.textContainer}>
                        <View style={styles.headerRow}>
                            <Text style={styles.title}>Maya AI</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>COMPANION</Text>
                            </View>
                        </View>
                        <Text style={styles.subtitle}>I'm Maya. Tell me what's on your mind.</Text>
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
    },
    gradient: {
        flex: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    texture: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.10,
    },
    mesh: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        // @ts-ignore
        filter: 'blur(30px)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
    },
    iconWrapper: {
        width: 68,
        height: 68,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    pulse: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    halo: {
        position: 'absolute',
        width: 66,
        height: 66,
        borderRadius: 33,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
    },
    haloDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        marginTop: -4,
    },
    textContainer: {
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
        color: '#FFF',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    badge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 40,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
