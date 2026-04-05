import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WifiOff, Rocket, Moon, RefreshCcw, Star } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export const NoInternetScreen = ({ onRetry }: { onRetry: () => void }) => {
    // Drifting animation
    const driftAnim = React.useRef(new Animated.Value(0)).current;
    const rotateAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        // Drifting loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(driftAnim, {
                    toValue: 20,
                    duration: 3500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(driftAnim, {
                    toValue: -10,
                    duration: 4000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Subtle rotation loop for the icon wrapper
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 20000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [driftAnim]);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.outerContainer}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={[colors.primaryLight, colors.background, colors.accent + "40"]}
                style={StyleSheet.absoluteFill}
            />
            
            {/* Background elements (stars/moons) */}
            <Animated.View style={[styles.moonContainer, { transform: [{ translateY: driftAnim }, { rotate: '-15deg' }] }]}>
                <Moon size={50} color={colors.primary + "60"} fill={colors.primary + "30"} />
            </Animated.View>

            <Animated.View style={[styles.star1, { transform: [{ translateY: driftAnim }, { scale: 0.8 }] }]}>
                <Star size={24} color={colors.primary + "60"} fill={colors.primary + "30"} />
            </Animated.View>

            <Animated.View style={[styles.star2, { transform: [{ translateY: -driftAnim }, { scale: 1.2 }] }]}>
                <Star size={20} color={colors.accent + "80"} fill={colors.accent + "40"} />
            </Animated.View>

            <Animated.View style={[styles.star3, { transform: [{ translateX: driftAnim }] }]}>
                <Star size={16} color={colors.primary + "50"} fill={colors.primary + "20"} />
            </Animated.View>

            <View style={styles.container}>
                <Animated.View style={[styles.iconWrapper, { transform: [{ translateY: driftAnim }] }]}>
                    <View style={styles.glow} />
                    <View style={styles.rocketContainer}>
                        <Rocket size={60} color={colors.primary} />
                    </View>
                    <View style={styles.wifiIcon}>
                        <WifiOff size={24} color={colors.error} />
                    </View>
                </Animated.View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Lost in Space</Text>
                    <Text style={styles.subtitle}>
                        It seems you've drifted away from the signal. {"\n"}
                        {/* Please reconnect to return to mission control. */}
                        Take a deep breath, we'll be right here when you're back online.
                    </Text>
                </View>

                <TouchableOpacity 
                    style={styles.retryBtn} 
                    onPress={onRetry}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark || colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.retryGradient}
                    >
                        <RefreshCcw size={20} color="#FFF" />
                        <Text style={styles.retryText}>Try Reconnecting</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.offlineTextBtn}
                    onPress={onRetry}
                >
                    <Text style={styles.offlineText}>Awaiting Signal...</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    moonContainer: {
        position: 'absolute',
        top: height * 0.12,
        right: width * 0.12,
    },
    star1: {
        position: 'absolute',
        top: height * 0.25,
        left: width * 0.2,
    },
    star2: {
        position: 'absolute',
        bottom: height * 0.2,
        right: width * 0.25,
    },
    star3: {
        position: 'absolute',
        top: height * 0.45,
        right: width * 0.1,
    },
    iconWrapper: {
        marginBottom: spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 70,
        backgroundColor: colors.primary + "15",
    },
    rocketContainer: {
        transform: [{ rotate: '0deg' }],
    },
    wifiIcon: {
        position: 'absolute',
        bottom: -5,
        right: -10,
        backgroundColor: colors.surface,
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        ...typography.h1,
        fontSize: 32,
        color: '#3c2a34',
        marginBottom: spacing.sm,
        textAlign: 'center',
        fontWeight: '300',
    },
    subtitle: {
        ...typography.body,
        color: '#6b4c5c',
        textAlign: 'center',
        lineHeight: 24,
        opacity: 0.8,
    },
    retryBtn: {
        width: '100%',
        maxWidth: 280,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    retryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    retryText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    offlineTextBtn: {
        marginTop: spacing.xl,
    },
    offlineText: {
        ...typography.caption,
        color: colors.textMuted,
        fontStyle: 'italic',
    }
});
