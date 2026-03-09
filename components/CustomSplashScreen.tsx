import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/contexts/FeedContext';
import { colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const AnimatedImage = Animated.createAnimatedComponent(Image);

export const CustomSplashScreen = () => {
    const { loading: authLoading, user } = useAuth();
    const { loading: feedLoading } = useFeed();
    const [visible, setVisible] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // We are ready to dismiss when auth is done loading,
    // AND if the user is authenticated, the feed is also done loading.
    const isReady = !authLoading && (!user || !feedLoading);

    useEffect(() => {
        if (isReady) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 400, // Shorter, smoother fade out
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1.05, // Subtle zoom out effect
                    duration: 400,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                })
            ]).start(() => {
                setVisible(false);
            });
        }
    }, [isReady, fadeAnim, scaleAnim]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.overlay}>
                {/* We use standard RN Image for the SVG if metro is configured for SVG, else need to handle properly. 
            However, our CustomImage uses expo-image which supports SVG gracefully if imported correctly,
            BUT the placeholder logic might fire if the layout triggers early. 
            We bypass CustomImage loader by using standard RN Image for local asset. */}
                <AnimatedImage
                    source={require('@/assets/images/logo/logo_light.svg')}
                    style={styles.logo}
                    contentFit="contain"
                    // tintColor="#FFFFFF"
                />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99999,
        backgroundColor: colors.background, // Using primary theme color as background
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 225,
        height: 110,
    },
});
