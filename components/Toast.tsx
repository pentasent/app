import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, Dimensions, View } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastProps {
    message: string | null;
    onHide: () => void;
    duration?: number;
    type?: 'error' | 'success' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, onHide, duration = 5000, type = 'error' }) => {
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-150)).current;
    const isHiding = useRef(false);

    useEffect(() => {
        if (message) {
            isHiding.current = false;
            Animated.spring(translateY, {
                toValue: insets.top + spacing.sm,
                useNativeDriver: true,
                bounciness: 10,
                speed: 12
            }).start();

            const timer = setTimeout(() => {
                hideToast();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [message]);

    const hideToast = () => {
        if (isHiding.current) return;
        isHiding.current = true;

        Animated.timing(translateY, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onHide();
        });
    };

    if (!message) return null;

    let bgColor = colors.error;
    let icon = <AlertCircle size={20} color={colors.surface} />;

    if (type === 'success') {
        bgColor = colors.success;
    } else if (type === 'info') {
        bgColor = colors.primary;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: bgColor, transform: [{ translateY }] }
            ]}
        >
            <View style={styles.content}>
                {icon}
                <Text style={styles.text}>{message}</Text>
                <TouchableOpacity
                    onPressIn={hideToast}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    style={styles.closeButton}
                >
                    <X size={20} color={colors.surface} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        borderRadius: borderRadius.lg,
        ...shadows.medium,
        elevation: 6,
        zIndex: 9999, // Ensure it floats above all other absolute/fixed elements
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    text: {
        ...typography.bodySmall,
        color: colors.surface,
        flex: 1,
        marginHorizontal: spacing.sm,
        fontWeight: '500'
    },
    closeButton: {
        padding: 4,
    }
});
