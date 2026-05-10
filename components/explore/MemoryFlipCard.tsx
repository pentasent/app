import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, Layers } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Shared animation values for flipping sync
const sharedFlip1 = new Animated.Value(0);
const sharedFlip2 = new Animated.Value(0);
const sharedFlip3 = new Animated.Value(0);

const startFlipAnim = (val: Animated.Value, delay: number, duration: number) => {
    Animated.loop(
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, {
                toValue: 1,
                duration: duration / 2,
                useNativeDriver: true,
            }),
            Animated.timing(val, {
                toValue: 2,
                duration: duration / 2,
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

startFlipAnim(sharedFlip1, 0, 5000);
startFlipAnim(sharedFlip2, 1200, 6000);
startFlipAnim(sharedFlip3, 2500, 5500);

export const MemoryFlipCard = React.memo(({ onPress }: { onPress: () => void }) => {
    const flip1 = sharedFlip1;
    const flip2 = sharedFlip2;
    const flip3 = sharedFlip3;

    const renderCard = (anim: Animated.Value, size: number, top: string | number, left: string | number) => {
        const rotateY = anim.interpolate({
            inputRange: [0, 1, 2],
            outputRange: ['0deg', '180deg', '360deg'],
        });
        
        const opacity = anim.interpolate({
            inputRange: [0, 0.2, 0.8, 1, 1.2, 1.8, 2],
            outputRange: [0, 0.6, 0.6, 0.3, 0.6, 0.6, 0],
        });

        const scale = anim.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [0.8, 1.1, 0.8],
        });

        return (
            <Animated.View 
                style={[
                    styles.bgCard, 
                    { 
                        width: size, 
                        height: size, 
                        top: top as any,
                        left: left as any, 
                        transform: [{ rotateY }, { scale }] as any,
                        opacity 
                    }
                ]}
            >
                <View style={styles.cardGloss} />
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
                colors={['#8E94F2', '#6E75EF']} // Soft Lavender to Vibrant Purple
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Glassy overlay */}
                <View style={styles.glassOverlay} />

                {/* Animated Background Cards */}
                {renderCard(flip1, 40, '15%', '10%')}
                {renderCard(flip2, 32, '55%', '78%')}
                {renderCard(flip3, 36, '25%', '45%')}

                <View style={styles.content}>
                    <View style={styles.iconSection}>
                        <View style={styles.iconCircle}>
                            <View style={styles.innerCircle}>
                                <Brain size={26} color="#FFF" fill="rgba(255,255,255,0.2)" />
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.textSection}>
                        <View style={styles.headerRow}>
                            <Text style={styles.gameTitle}>Memory Flip</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>GAME</Text>
                            </View>
                        </View>
                        <Text style={styles.gameDescription}>
                            Match symbols to sharpen your focus and memory.
                        </Text>
                    </View>
                </View>

                {/* Tilted Corner HOT Badge */}
                <View style={styles.cornerBadge}>
                    <Text style={styles.cornerText}>HOT</Text>
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
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    bgCard: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    cardGloss: {
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '30%',
        height: '30%',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
    innerCircle: {
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
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 40,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
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
        color: '#6E75EF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 15,
    },
});
