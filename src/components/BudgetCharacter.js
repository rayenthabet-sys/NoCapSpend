import React, { useEffect, useRef, useState, memo } from 'react';
import { Animated, StyleSheet, AccessibilityInfo, Platform, Image as RNImageStatic } from 'react-native';
import { Image } from 'expo-image';
import {
  canonicalAssets,
  animationWebPAssets,
  CHARACTER_ASPECT_RATIO,
  characterSizes,
} from '../lib/characters';
import { animation } from '../lib/theme';

// On web, useNativeDriver: true hands off to the CSS animation driver which
// can fail silently inside Animated.loop — the loop callback fires in JS but
// the actual CSS animation does not reliably restart between iterations.
// useNativeDriver: false keeps the entire loop in the JS/requestAnimationFrame
// tick so every frame correctly updates the DOM transform style.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// Bob amplitude — ±10px, clearly perceptible while remaining polished.
const BOB_AMPLITUDE = 10;

/**
 * Resolve a Metro require() asset to a URI string on web.
 * `require()` for images always returns a number (registered asset ID).
 * Image.resolveAssetSource() converts that to the actual served URL.
 * Returns null if resolution fails so we can fall back gracefully.
 */
function resolveWebPSrc(source) {
  if (!source) return null;
  if (typeof source === 'string') return source;
  if (typeof source === 'object' && source !== null && source.uri) return source.uri;
  if (typeof source === 'number') {
    try {
      const resolved = RNImageStatic.resolveAssetSource(source);
      return resolved?.uri || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * BudgetCharacter
 *
 * @param {Object} [props]
 * @param {string} [props.assetId]
 * @param {'webp' | 'native'} [props.animationType]
 * @param {'micro' | 'small' | 'medium' | 'large' | 'hero'} [props.size]
 * @param {boolean} [props.animated]
 * @param {boolean} [props.shake]
 * @param {boolean} [props.pulse]
 * @param {boolean} [props.isOverBudget]
 * @param {object} [props.style]
 * @param {string} [props.accessibilityLabel]
 */
function BudgetCharacterComponent({
  assetId = 'robert_neutral',
  animationType = 'native',
  size = 'medium',
  animated: enableAnimation = true,
  shake = false,
  pulse = false,
  isOverBudget = false,
  style = undefined,
  accessibilityLabel = undefined,
} = {}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ruckusPhase, setRuckusPhase] = useState('entrance');

  const heightPx = characterSizes[size] || characterSizes.medium;
  const widthPx = Math.round(heightPx * CHARACTER_ASPECT_RATIO);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => listener?.remove?.();
  }, []);

  // ── Ruckus state machine (W-01 guard preserved) ─────────────────
  useEffect(() => {
    if (assetId?.startsWith('ruckus')) {
      if (isOverBudget && ruckusPhase !== 'hold') {
        setRuckusPhase('entrance');
        const timer = setTimeout(() => {
          setRuckusPhase('hold');
        }, 5000);
        return () => clearTimeout(timer);
      } else if (!isOverBudget && ruckusPhase === 'hold') {
        setRuckusPhase('exit');
        const timer = setTimeout(() => {
          setRuckusPhase('entrance');
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [assetId, isOverBudget, ruckusPhase]);

  const bobY   = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const scaleV = useRef(new Animated.Value(1)).current;

  const isRuckus = assetId?.startsWith('ruckus');

  // ── Idle bob / Ruckus agitation animation ─────────────────────────
  useEffect(() => {
    if (!enableAnimation || reduceMotion || animationType === 'webp') {
      bobY.setValue(0);
      return;
    }

    if (isRuckus) {
      bobY.setValue(0);
      // Ruckus frantic agitation in place instead of bobbing up and down
      const agitateLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeX, { toValue: 3,  duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(shakeX, { toValue: -3, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(shakeX, { toValue: 2,  duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(shakeX, { toValue: -2, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(shakeX, { toValue: 0,  duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      agitateLoop.start();
      return () => agitateLoop.stop();
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobY, {
          toValue: -BOB_AMPLITUDE,
          duration: animation.bob / 2,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(bobY, {
          toValue: BOB_AMPLITUDE,
          duration: animation.bob / 2,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enableAnimation, reduceMotion, animationType, isRuckus, bobY, shakeX]);

  // ── Shake animation ───────────────────────────────────────────────
  useEffect(() => {
    if (!shake || reduceMotion || isRuckus) return;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 8,  duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: -8, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 5,  duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: -5, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 2,  duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 0,  duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [shake, reduceMotion, isRuckus, shakeX]);

  // ── Pulse animation ───────────────────────────────────────────────
  useEffect(() => {
    if (!pulse || reduceMotion) return;
    Animated.sequence([
      Animated.timing(scaleV, {
        toValue: 1.08,
        duration: animation.fast,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(scaleV, {
        toValue: 1,
        duration: animation.normal,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [pulse, reduceMotion, scaleV]);

  // ── Asset resolution ─────────────────────────────────────────────
  let source = canonicalAssets[assetId] || canonicalAssets.robert_neutral;
  let useWebP = false;

  if (animationType === 'webp' && !reduceMotion) {
    useWebP = true;
    if (assetId === 'ruckus_alarm') {
      source = ruckusPhase === 'hold'
        ? animationWebPAssets.ruckus_alarm_critical_hold
        : ruckusPhase === 'exit'
        ? animationWebPAssets.ruckus_alarm_exit
        : animationWebPAssets.ruckus_alarm;
    } else if (assetId === 'ruckus_emergency') {
      source = ruckusPhase === 'hold'
        ? animationWebPAssets.ruckus_emergency_critical_hold
        : ruckusPhase === 'exit'
        ? animationWebPAssets.ruckus_emergency_exit
        : animationWebPAssets.ruckus_emergency;
    } else if (animationWebPAssets[assetId]) {
      source = animationWebPAssets[assetId];
    } else {
      useWebP = false;
      source = canonicalAssets[assetId] || canonicalAssets.robert_neutral;
    }
  }

  // ── Web-only: resolve animated WebP to a real URL for <img> ──────
  // On web, animated WebP in a plain <img> element autoplay natively in
  // all modern browsers (Chrome, Firefox, Edge, Safari 16+).
  // expo-image on web decodes frames via the browser's Image API and may
  // only display the first frame; a plain <img> avoids that issue.
  // Image.resolveAssetSource() converts the Metro numeric asset ID to the
  // actual URL served by the Metro bundler.
  const webpSrc = (useWebP && Platform.OS === 'web')
    ? resolveWebPSrc(source)
    : null;

  return (
    <Animated.View
      style={[
        styles.panelWrapper,
        {
          width: widthPx,
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
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || `Character ${assetId}`}
    >
      {useWebP && Platform.OS === 'web' && webpSrc ? (
        <img
          src={webpSrc}
          width={widthPx}
          height={heightPx}
          alt={accessibilityLabel || `Character ${assetId}`}
          style={{ width: widthPx, height: heightPx, objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <Image
          source={source}
          style={{ width: widthPx, height: heightPx }}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
          autoplay={!reduceMotion}
        />
      )}
    </Animated.View>
  );
}

export default memo(BudgetCharacterComponent);

const styles = StyleSheet.create({
  panelWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
});
