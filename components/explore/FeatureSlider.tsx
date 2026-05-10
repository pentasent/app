import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, FlatList, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { colors, spacing } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width;
const AUTO_SLIDE_INTERVAL = 4000;

interface FeatureSliderProps {
    items: React.ReactNode[];
}

export const FeatureSlider = ({ items }: FeatureSliderProps) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const isAutoScrolling = useRef(false);

    useEffect(() => {
        const timer = setInterval(() => {
            if (isAutoScrolling.current) return;
            
            let nextIndex = activeIndex + 1;
            if (nextIndex >= items.length) {
                nextIndex = 0;
            }
            
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            });
            setActiveIndex(nextIndex);
        }, AUTO_SLIDE_INTERVAL);

        return () => clearInterval(timer);
    }, [activeIndex, items.length]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / CARD_WIDTH);
        setActiveIndex(index);
    };

    const onScrollBeginDrag = () => {
        isAutoScrolling.current = true;
    };

    const onScrollEndDrag = () => {
        setTimeout(() => {
            isAutoScrolling.current = false;
        }, AUTO_SLIDE_INTERVAL);
    };

    const renderItem = useCallback(({ item, index }: { item: React.ReactNode, index: number }) => {
        const inputRange = [
            (index - 1) * CARD_WIDTH,
            index * CARD_WIDTH,
            (index + 1) * CARD_WIDTH,
        ];

        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.94, 1, 0.94],
            extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View style={[
                styles.cardContainer,
                { transform: [{ scale }], opacity }
            ]}>
                {item}
            </Animated.View>
        );
    }, [scrollX]);

    return (
        <View style={styles.container}>
            <Animated.FlatList
                ref={flatListRef}
                data={items}
                renderItem={renderItem}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                onMomentumScrollEnd={onMomentumScrollEnd}
                onScrollBeginDrag={onScrollBeginDrag}
                onScrollEndDrag={onScrollEndDrag}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH}
                contentContainerStyle={styles.listContent}
                getItemLayout={(_, index) => ({
                    length: CARD_WIDTH,
                    offset: CARD_WIDTH * index,
                    index,
                })}
            />
            
            <View style={styles.pagination}>
                {items.map((_, index) => {
                    const opacity = scrollX.interpolate({
                        inputRange: [
                            (index - 1) * CARD_WIDTH,
                            index * CARD_WIDTH,
                            (index + 1) * CARD_WIDTH,
                        ],
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    });

                    const width = scrollX.interpolate({
                        inputRange: [
                            (index - 1) * CARD_WIDTH,
                            index * CARD_WIDTH,
                            (index + 1) * CARD_WIDTH,
                        ],
                        outputRange: [6, 16, 6],
                        extrapolate: 'clamp',
                    });

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    opacity,
                                    width,
                                    backgroundColor: activeIndex === index ? colors.surface : colors.card,
                                },
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: spacing.md,
    },
    listContent: {
    },
    cardContainer: {
        width: CARD_WIDTH,
        paddingHorizontal: spacing.lg,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.md,
        gap: 8,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        marginTop: -52
    },
});
