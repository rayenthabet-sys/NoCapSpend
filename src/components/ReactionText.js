import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { colors, fonts, animation } from '../lib/theme';

/**
 * ReactionText
 *
 * Fixed: animation ref tracked so any running sequence is explicitly stopped
 * before a new one starts. Prevents ghost opacity (opacity stuck at 0) when
 * text/visible props change while a prior 999999ms-hold animation is active.
 *
 * @param {Object} [props]
 * @param {string | null} [props.text]
 * @param {boolean} [props.visible]
 * @param {() => void} [props.onDone]
 * @param {number} [props.holdMs]
 */
export default function ReactionText({
  text = null,
  visible = false,
  onDone = undefined,
  holdMs = 2200,
} = {}) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
  // Track the running animation so it can be stopped before starting a new one.
  const animRef = useRef(null);

  useEffect(() => {
    // ── Stop any in-flight animation before doing anything else ──────
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }

    if (!visible || !text) {
      opacity.setValue(0);
      return;
    }

    // Reset values to start position before every new animation run.
    opacity.setValue(0);
    translateY.setValue(6);

    const anim = Animated.sequence([
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
      Animated.delay(holdMs),
      Animated.timing(opacity, {
        toValue:  0,
        duration: animation.normal,
        useNativeDriver: true,
      }),
    ]);

    animRef.current = anim;

    anim.start(({ finished }) => {
      animRef.current = null;
      if (finished && onDone) onDone();
    });

    // ── Cleanup: stop animation if component unmounts or deps change ─
    return () => {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
    };
  }, [visible, text, holdMs, opacity, translateY, onDone]);

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
    minHeight:      44,
    justifyContent: 'center',
    alignItems:     'center',
    width:          '100%',
    marginTop:      4,
    paddingHorizontal: 8,
  },
  text: {
    fontFamily:    fonts.display,
    fontSize:      24,
    color:         colors.textPrimary,
    letterSpacing: 1.5,
    textAlign:     'center',
    flexWrap:      'wrap',
  },
});
