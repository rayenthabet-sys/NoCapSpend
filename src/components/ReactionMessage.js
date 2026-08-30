import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { fonts, colors } from '../lib/theme';

/**
 * Floating reaction text that fades in from below, holds, then fades out upward.
 *
 * Usage:
 *   <ReactionMessage text="FWÄÄH?!" visible={show} onDone={() => setShow(false)} />
 */
export default function ReactionMessage({ text, visible, onDone, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible && text) {
      // Reset
      opacity.setValue(0);
      translateY.setValue(10);

      Animated.sequence([
        // Fade in + slide up
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        // Hold
        Animated.delay(1500),
        // Fade out + slide up more
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -15, duration: 400, useNativeDriver: true }),
        ]),
      ]).start(() => {
        if (onDone) onDone();
      });
    }
  }, [visible, text, opacity, translateY, onDone]);

  if (!visible || !text) return null;

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }, style]}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  text: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primaryBright,
    textAlign: 'center',
    textShadowColor: 'rgba(193, 18, 31, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
