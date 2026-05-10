import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Gamepad2 } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Shared animation values for bubble sync
const sharedBubble1 = new Animated.Value(0);
const sharedBubble2 = new Animated.Value(0);
const sharedBubble3 = new Animated.Value(0);

const startBubbleAnim = (val: Animated.Value, delay: number, duration: number) => {
    Animated.loop(
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, {
                toValue: 1,
                duration,
                useNativeDriver: true,
            }),
            Animated.timing(val, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            })
        ])
    ).start();
};

startBubbleAnim(sharedBubble1, 0, 4000);
startBubbleAnim(sharedBubble2, 1500, 5000);
startBubbleAnim(sharedBubble3, 3000, 4500);

export const BubbleGameCard = React.memo(({ onPress }: { onPress: () => void }) => {
    const bubble1 = sharedBubble1;
    const bubble2 = sharedBubble2;
    const bubble3 = sharedBubble3;

    // No local useEffect needed

    const renderBubble = (anim: Animated.Value, size: number, left: string | number, value: string) => {
        const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [150, -50], // Move up instead of down for a "rising" bubble feel
        });
        const opacity = anim.interpolate({
            inputRange: [0, 0.2, 0.8, 1],
            outputRange: [0, 0.8, 0.8, 0],
        });
        const scale = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.8, 1.2, 1],
        });

        return (
            <Animated.View 
                style={[
                    styles.bubble, 
                    { 
                        width: size, 
                        height: size, 
                        borderRadius: size / 2, 
                        left: left as any, 
                        transform: [{ translateY }, { scale }] as any,
                        opacity 
                    }
                ]}
            >
                <View style={styles.bubbleGloss} />
                <Text style={styles.bubbleText}>{value}</Text>
            </Animated.View>
        );
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <LinearGradient
                colors={['#00B4DB', '#0083B0']} // Vibrant Sky Blue to Deep Blue
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Glassy overlay for premium feel */}
                <View style={styles.glassOverlay} />

                {/* Animated Background Bubbles */}
                {renderBubble(bubble1, 44, '10%', '+10')}
                {renderBubble(bubble2, 34, '75%', '+50')}
                {renderBubble(bubble3, 38, '50%', '-30')}

                <View style={styles.content}>
                    <View style={styles.iconSection}>
                        <View style={styles.iconCircle}>
                            <View style={styles.bubbleMain}>
                                <View style={styles.bubbleGlossMain} />
                                <Text style={styles.bubbleTextMain}>+10</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.textSection}>
                        <View style={styles.headerRow}>
                            <Text style={styles.gameTitle}>Bubble Rush</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>GAME</Text>
                            </View>
                        </View>
                        <Text style={styles.gameDescription}>
                            Pop bubbles to release stress and focus.
                        </Text>
                    </View>
                </View>

                {/* Tilted Corner NEW Badge */}
                <View style={styles.cornerBadge}>
                    <Text style={styles.cornerText}>NEW</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        width: '100%',
        height: 120, // Match MayaCard
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        // elevation: 8,
        // shadowColor: '#0083B0',
        // shadowOffset: { width: 0, height: 4 },
        // shadowOpacity: 0.3,
        // shadowRadius: 10,
    },
    gradient: {
        flex: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    bubble: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    bubbleGloss: {
        position: 'absolute',
        top: '15%',
        left: '15%',
        width: '30%',
        height: '30%',
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    bubbleText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFF',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
    },
    iconSection: {
        width: 68,
        height: 68,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    iconCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    bubbleMain: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    bubbleGlossMain: {
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '35%',
        height: '35%',
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    bubbleTextMain: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
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
    gameTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
    },
    gameDescription: {
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
    cornerBadge: {
        position: 'absolute',
        top: -10,
        left: -35,
        backgroundColor: '#FFF',
        width: 100,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '-45deg' }],
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    cornerText: {
        color: '#0083B0',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 15, // Adjust for rotation offset
    },
});
