import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, shadows } from '@/constants/theme';

export const TicketShimmer = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.6,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [opacity]);

    return (
        <View style={styles.ticketContainer}>
            <View style={styles.ticketMain}>
                <Animated.View style={{ opacity }}>
                    {/* Header Shimmer */}
                    <View style={styles.ticketHeader}>
                        <View style={styles.planInfo}>
                            <View style={styles.iconCirclePlaceholder} />
                            <View>
                                <View style={styles.titlePlaceholder} />
                                <View style={styles.idPlaceholder} />
                            </View>
                        </View>
                    </View>

                    {/* Perforation Row */}
                    <View style={styles.perforationRow}>
                        <View style={styles.leftCutout} />
                        <View style={styles.dashedLine} />
                        <View style={styles.rightCutout} />
                    </View>

                    {/* Body Shimmer */}
                    <View style={styles.ticketBody}>
                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <View style={styles.labelPlaceholder} />
                                <View style={styles.valuePlaceholder} />
                            </View>
                            <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
                                <View style={styles.labelPlaceholder} />
                                <View style={styles.valuePlaceholderSmall} />
                            </View>
                        </View>

                        <View style={[styles.detailRow, { marginTop: 20 }]}>
                            <View style={styles.detailItem}>
                                <View style={styles.labelPlaceholder} />
                                <View style={styles.valuePlaceholderLong} />
                            </View>
                            <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
                                <View style={styles.labelPlaceholder} />
                                <View style={styles.valuePlaceholderSmall} />
                            </View>
                        </View>
                    </View>

                    {/* Barcode Shimmer */}
                    <View style={styles.footerBarcode}>
                        <View style={styles.barcodeTextPlaceholder} />
                    </View>
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    ticketContainer: {
        marginBottom: spacing.xl,
    },
    ticketMain: {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        ...shadows.medium,
    },
    ticketHeader: {
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    planInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconCirclePlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.borderLight,
    },
    titlePlaceholder: {
        width: 100,
        height: 18,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 6,
    },
    idPlaceholder: {
        width: 60,
        height: 10,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
    },
    perforationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 24,
    },
    leftCutout: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.background,
        marginLeft: -12,
    },
    rightCutout: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.background,
        marginRight: -12,
    },
    dashedLine: {
        flex: 1,
        height: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderStyle: 'dashed',
        marginHorizontal: 12,
    },
    ticketBody: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        gap: 6,
    },
    labelPlaceholder: {
        width: 80,
        height: 8,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
    },
    valuePlaceholder: {
        width: 100,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
    },
    valuePlaceholderSmall: {
        width: 60,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
    },
    valuePlaceholderLong: {
        width: 140,
        height: 14,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
    },
    footerBarcode: {
        padding: spacing.sm,
        backgroundColor: colors.surface,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    barcodeLinePlaceholder: {
        width: '80%',
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 4,
        opacity: 0.3,
    },
    barcodeTextPlaceholder: {
        width: 120,
        height: 8,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
    },
});
