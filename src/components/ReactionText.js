import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { colors, fonts, animation } from '../lib/theme';

/**
 * ReactionText
 *
 * Floating reaction phrase with zero layout shift.
 * Keeps its reserved layout container height so components below never move.
 *
 * Props:
 *   text      string   the phrase to display
 *   visible   bool     set to true to trigger the animation
 *   onDone    fn       called when fade-out completes
 *   holdMs    number   how long to hold the text visible (default: 2000ms)
 */
export default function ReactionText({ text, visible, onDone, holdMs = 2000 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (!visible || !text) {
      opacity.setValue(0);
      return;
    }

    // Reset
    opacity.setValue(0);
    translateY.setValue(6);

    Animated.sequence([
      // Fade + float in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue:  1,
          duration: animation.fast,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue:  0,
          duration: animation.fast,
          useNativeDriver: true,
        }),
      ]),
      // Hold
      Animated.delay(holdMs),
      // Fade out
      Animated.timing(opacity, {
        toValue:  0,
        duration: animation.normal,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
  }, [visible, text, holdMs]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.Text
        style={[
          styles.text,
          { opacity, transform: [{ translateY }] },
        ]}
        accessibilityLiveRegion="polite"
      >
        {text || ' '}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height:         36,
    minHeight:      36,
    maxHeight:      36,
    justifyContent: 'center',
    alignItems:     'center',
    width:          '100%',
    marginTop:      4,
  },
  text: {
    fontFamily:    fonts.display,
    fontSize:      26,
    color:         colors.text,
    letterSpacing: 2,
    textAlign:     'center',
  },
});
