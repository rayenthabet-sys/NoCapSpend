import React, { useEffect, useRef, memo } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
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
 * Performant character component powered by expo-image (Glide/Metal hardware acceleration).
 * Subtle native-driven idle bob animation that safely stops on unmount.
 *
 * Props:
 *   character   string   "master" | "selfTitled" | "dieLit" | "wlr" | "global" | "bunny"
 *   reaction    string   see reactionCharacterMap in characters.js
 *   size        string   "nano" | "micro" | "small" | "medium" | "large" | "hero"  (default: "medium")
 *   animated    bool     enable idle bob animation (default: true)
 *   shake       bool     trigger a shake animation (default: false)
 *   pulse       bool     trigger a scale-up pulse (default: false)
 *   globalView  string   for global character: "front"|"frontAlt"|"side"|"back" (default: "front")
 *   style       object   additional container style overrides
 *   accessibilityLabel  string
 */
function BudgetCharacterComponent({
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
  const aspectRatio = characterAspectRatio[resolvedKey] || 0.667;

  // For the global sheet (4-view landscape)
  const isGlobal = resolvedKey === 'global';
  const globalViewIndex = globalViews[globalView] ?? 0;

  // ── Animations ───────────────────────────────────────────────────
  const bobY    = useRef(new Animated.Value(0)).current;
  const shakeX  = useRef(new Animated.Value(0)).current;
  const scaleV  = useRef(new Animated.Value(1)).current;

  // Idle bob — subtle ±3px float with 2200ms cycle
  useEffect(() => {
    if (!enableAnimation) {
      bobY.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobY, {
          toValue: -3,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(bobY, {
          toValue: 3,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enableAnimation, bobY]);

  // Shake — triggered when `shake` prop changes
  useEffect(() => {
    if (!shake) return;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 6,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -4, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 2,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,  duration: 45, useNativeDriver: true }),
    ]).start();
  }, [shake, shakeX]);

  // Pulse — triggered when `pulse` prop changes
  useEffect(() => {
    if (!pulse) return;
    Animated.sequence([
      Animated.timing(scaleV, {
        toValue: 1.06,
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
    return null;
  }

  if (isGlobal) {
    const sheetHeight = heightPx;
    const sheetWidth = sheetHeight * (768 / 512);
    const viewWidth = sheetWidth / 4;
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
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    );
  }

  // Standard portrait character
  const characterWidth = Math.round(heightPx * aspectRatio);

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
        contentFit="contain"
        cachePolicy="memory-disk"
        priority="high"
      />
    </Animated.View>
  );
}

export default memo(BudgetCharacterComponent);

const styles = StyleSheet.create({
  globalContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
});
