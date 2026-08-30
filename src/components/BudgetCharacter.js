import React, { useEffect, useRef } from 'react';
import { Animated, View, Image, StyleSheet } from 'react-native';
import {
  characterAssets,
  characterAspectRatio,
  reactionCharacterMap,
  characterSizes,
  globalViews,
} from '../lib/characters';
import { animation } from '../lib/theme';

/**
 * BudgetCharacter
 *
 * Reusable character component. Accepts either:
 *   - `character` prop: explicit character key ("master", "wlr", etc.)
 *   - `reaction` prop: semantic event key ("overBudget", "incomeAdded", etc.)
 *     which resolves to a character via reactionCharacterMap
 *
 * If both are provided, `reaction` takes precedence.
 *
 * Props:
 *   character   string   "master" | "selfTitled" | "dieLit" | "wlr" | "global" | "bunny"
 *   reaction    string   see reactionCharacterMap in characters.js
 *   size        string   "small" | "medium" | "large" | "hero"  (default: "medium")
 *   animated    bool     enable idle bob animation (default: true)
 *   shake       bool     trigger a shake animation on mount (default: false)
 *   pulse       bool     trigger a scale-up pulse on mount (default: false)
 *   globalView  string   for global character: "front"|"frontAlt"|"side"|"back" (default: "front")
 *   style       object   additional container style overrides
 *   accessibilityLabel  string
 */
export default function BudgetCharacter({
  character,
  reaction,
  size = 'medium',
  animated: enableAnimation = true,
  shake = false,
  pulse = false,
  globalView = 'front',
  style,
  accessibilityLabel,
}) {
  // Resolve character key: reaction takes precedence over explicit character prop
  const resolvedKey = reaction
    ? (reactionCharacterMap[reaction] || 'master')
    : (character || 'master');

  const asset = characterAssets[resolvedKey];

  // Pixel height for this size preset
  const heightPx = characterSizes[size] || characterSizes.medium;
  // Width auto-calculated from stored aspect ratio
  const aspectRatio = characterAspectRatio[resolvedKey] || 1;

  // For the global sheet (4-view landscape), we window into one quadrant
  const isGlobal = resolvedKey === 'global';
  // Each view is 25% of the total sheet width
  const globalViewIndex = globalViews[globalView] ?? 0;

  // ── Animations ───────────────────────────────────────────────────
  const bobY    = useRef(new Animated.Value(0)).current;
  const shakeX  = useRef(new Animated.Value(0)).current;
  const scaleV  = useRef(new Animated.Value(1)).current;

  // Idle bob — runs continuously while `animated` is true
  useEffect(() => {
    if (!enableAnimation) {
      bobY.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobY, {
          toValue: -4,
          duration: animation.bob,
          useNativeDriver: true,
        }),
        Animated.timing(bobY, {
          toValue: 4,
          duration: animation.bob,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enableAnimation, bobY]);

  // Shake — triggered when `shake` prop changes to true
  useEffect(() => {
    if (!shake) return;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 7,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -7, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 5,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 3,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,  duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shake, shakeX]);

  // Pulse — triggered when `pulse` prop changes to true
  useEffect(() => {
    if (!pulse) return;
    Animated.sequence([
      Animated.timing(scaleV, {
        toValue: 1.08,
        duration: animation.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scaleV, {
        toValue: 1,
        duration: animation.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulse, scaleV]);

  // ── Rendering ─────────────────────────────────────────────────────
  if (!asset) {
    // bunny fallback — simple emoji placeholder
    return (
      <View
        style={[styles.bunnyContainer, { width: heightPx, height: heightPx }, style]}
        accessible
        accessibilityLabel={accessibilityLabel || 'character'}
      >
        <Animated.Text
          style={[
            styles.bunnyText,
            { fontSize: heightPx * 0.75, transform: [{ translateY: bobY }] },
          ]}
        >
          🐰
        </Animated.Text>
      </View>
    );
  }

  if (isGlobal) {
    // Render the global 4-view sheet windowed to one view
    // The full sheet width at the rendered height
    const sheetHeight = heightPx;
    // The full sheet is 1536×1024, so at `sheetHeight` the total width is:
    const sheetWidth = sheetHeight * (1536 / 1024);
    // Each view is 1/4 of the total sheet width
    const viewWidth = sheetWidth / 4;
    // Offset to show the correct view
    const offsetX = -(globalViewIndex * viewWidth);

    return (
      <Animated.View
        style={[
          styles.globalContainer,
          {
            width: viewWidth,
            height: sheetHeight,
            transform: [
              { translateY: bobY },
              { translateX: shakeX },
              { scale: scaleV },
            ],
          },
          style,
        ]}
        accessible
        accessibilityLabel={accessibilityLabel || `character: global ${globalView}`}
      >
        <Image
          source={asset}
          style={{
            width:  sheetWidth,
            height: sheetHeight,
            position: 'absolute',
            left: offsetX,
          }}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }

  // Standard portrait character
  const characterWidth = heightPx * aspectRatio;

  return (
    <Animated.View
      style={[
        {
          width:  characterWidth,
          height: heightPx,
          transform: [
            { translateY: bobY },
            { translateX: shakeX },
            { scale: scaleV },
          ],
        },
        style,
      ]}
      accessible
      accessibilityLabel={accessibilityLabel || `character: ${resolvedKey}`}
    >
      <Image
        source={asset}
        style={{ width: characterWidth, height: heightPx }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bunnyContainer: {
    justifyContent: 'center',
    alignItems:     'center',
  },
  bunnyText: {
    textAlign: 'center',
  },
  globalContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
});
