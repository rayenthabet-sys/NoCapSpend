import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

interface AccountSuccessBannerProps {
  visible: boolean;
  onDismiss?: () => void;
  holdDurationMs?: number;
}

/**
 * AccountSuccessBanner
 *
 * Renders an isolated, zero-layout-shift notification badge above branding.
 * CRITICAL: Must remain positioned absolutely so it has 0px measured document
 * height impact on surrounding elements.
 */
export default function AccountSuccessBanner({
  visible,
  onDismiss,
  holdDurationMs = 2500,
}: AccountSuccessBannerProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(6)).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      opacityAnim.setValue(0);
      translateYAnim.setValue(6);
      return;
    }

    // Entrance animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      // Hold visible
      const timer = setTimeout(() => {
        if (!isMountedRef.current) return;
        // Exit animation (fade out)
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => {
          if (onDismiss && isMountedRef.current) {
            onDismiss();
          }
        });
      }, holdDurationMs);

      return () => clearTimeout(timer);
    });
  }, [visible, holdDurationMs, onDismiss, opacityAnim, translateYAnim]);

  if (!visible) return null;

  return (
    <View style={styles.absoluteAnchor} pointerEvents="none">
      <Animated.View
        style={[
          styles.bannerCard,
          {
            opacity: opacityAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        <Text style={styles.bannerText}>✓ ACCOUNT CREATED SUCCESSFULLY</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteAnchor: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 999,
  },
  bannerCard: {
    backgroundColor: '#142A16',
    borderWidth: 1.5,
    borderColor: '#4E9A51',
    borderRadius: radii.sm,
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  bannerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: '#5FD466',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
