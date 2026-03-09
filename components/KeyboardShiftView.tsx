import React, { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform, ViewStyle, View, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export default function KeyboardShiftView({ children, style }: Props) {
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      Animated.timing(keyboardHeight, {
        toValue: event.endCoordinates.height,
        duration: event.duration || 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false, // Cannot use native driver for layout properties or translateY with Safe Area dependent heights cleanly on all versions, keeping false but smooth
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: event ? event.duration || 250 : 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateY: Animated.multiply(keyboardHeight, -1) }],
          paddingBottom: Math.max(0, insets.bottom), // Ensure content is pushed above bottom safe area
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}