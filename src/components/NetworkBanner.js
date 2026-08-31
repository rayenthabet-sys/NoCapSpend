// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Network Status Banner
// Subtle indicator shown at the top of scrollable screens.
// Does not dominate the UI.
//
// States:
//   online  — tiny green dot, minimal
//   offline — amber bar with sync reminder
//   syncing — gold animated indicator
// ─────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, fonts } from '../lib/theme';

/**
 * @param {Object} props
 * @param {any} [props.status]
 */
export default function NetworkBanner(props) {
  const status = props?.status || 'online';
  const opacity = useRef(new Animated.Value(0)).current;
  const prevStatus = useRef(status);

  useEffect(() => {
    if (status === 'online' && prevStatus.current === 'online') {
      // Already online and staying online — keep fully hidden
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } else if (status === 'online') {
      // Just came back online — briefly show then fade
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    } else {
      // offline or syncing — show immediately, stay visible
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    prevStatus.current = status;
  }, [status, opacity]);

  if (status === 'online') {
    return (
      <Animated.View style={[styles.onlineBanner, { opacity }]}>
        <View style={styles.onlineDot} />
        <Text style={styles.onlineText}>ONLINE</Text>
      </Animated.View>
    );
  }

  if (status === 'syncing') {
    return (
      <Animated.View style={[styles.syncingBanner, { opacity }]}>
        <Text style={styles.syncingText}>↻  SYNCING...</Text>
      </Animated.View>
    );
  }

  // offline
  return (
    <Animated.View style={[styles.offlineBanner, { opacity }]}>
      <Text style={styles.offlineText}>
        ⚠  OFFLINE — Changes will sync when you're back online
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Online — tiny, discrete, fades out after a moment
  onlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.income,
    marginRight: 6,
  },
  onlineText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.income,
    letterSpacing: 1.5,
  },

  // Offline — amber bar
  offlineBanner: {
    backgroundColor: '#1A1400',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8C6818',
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  offlineText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: '#D4A237',
    letterSpacing: 0.8,
    textAlign: 'center',
    flexShrink: 1,
  },

  // Syncing — gold
  syncingBanner: {
    backgroundColor: '#1A1400',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  syncingText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1,
  },
});
