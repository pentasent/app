import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Hammer, Wrench, RefreshCcw, Mail } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export const MaintenanceScreen = ({ message }: { message: string }) => {
    // Animation for drifting icons
    const driftAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(driftAnim, {
                    toValue: 20,
                    duration: 3500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(driftAnim, {
                    toValue: -15,
                    duration: 4000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [driftAnim]);

    return (
        <View style={styles.outerContainer}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={[colors.primaryLight, colors.background, colors.accent + "30"]}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.container}>
                <Animated.View style={[styles.iconWrapper, { transform: [{ translateY: driftAnim }] }]}>
                    <View style={styles.glow} />
                    <View style={styles.mainIconContainer}>
                        <Hammer size={60} color={colors.primary} />
                    </View>
                    <View style={styles.subIconContainer}>
                         <Wrench size={20} color={colors.primaryDark || colors.primary} />
                    </View>
                </Animated.View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Scheduled Maintenance</Text>
                    <Text style={styles.subtitle}>
                        {message || "We're currently improving Pentasent. Please return shortly as we complete our mission."}
                    </Text>
                </View>

                <TouchableOpacity 
                    style={styles.retryBtn} 
                    onPress={() => Linking.openURL('mailto:support@pentasent.com')}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark || colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.retryGradient}
                    >
                        <Mail size={20} color="#FFF" />
                        <Text style={styles.retryText}>Contact Support</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.footerNote}>Updates in progress...</Text>
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
        paddingHorizontal: spacing.xxl,
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
        borderRadius: 60,
        backgroundColor: colors.primary + "15",
    },
    mainIconContainer: {
        transform: [{ rotate: '-15deg' }],
    },
    subIconContainer: {
        position: 'absolute',
        bottom: -5,
        right: -10,
        backgroundColor: colors.surface,
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
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
    footerNote: {
        marginTop: spacing.xxl,
        ...typography.caption,
        color: colors.textMuted,
        fontStyle: 'italic',
    }
});
