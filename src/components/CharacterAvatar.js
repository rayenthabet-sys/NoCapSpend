// ─────────────────────────────────────────────────────────────────
// NoCapSpend — CharacterAvatar Component
// Renders a character canonical PNG as a circular avatar portrait.
//
// Used inside cards (DailyMeter, AdviceCard) to integrate the
// character engine's visual identity.
//
// Precision Viewport Alignment:
// Uses pixel-analyzed focal points (focusX, focusY) and zoom scales
// so that EVERY character's face, eyes, and expressions perfectly
// fill and center within the circular frame.
// ─────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, memo } from 'react';
import { View, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { canonicalAssets, CHARACTER_ASPECT_RATIO } from '../lib/characters';
import { colors } from '../lib/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Precision facial focal coordinates for every character asset.
 * Derived from raw pixel centroid analysis of canonical assets.
 */
export const AVATAR_FOCAL_MAP = {
  // Uncle Ruckus (Sitting / falling in panic at bottom third of canvas)
  ruckus_emergency: { focusY: 0.73, focusX: 0.49, scale: 1.2 },
  ruckus_alarm:     { focusY: 0.68, focusX: 0.48, scale: 1.1 },

  // Robert Freeman (Host / Baseline)
  robert_neutral:  { focusY: 0.25, focusX: 0.52, scale: 2.3 },
  robert_guidance: { focusY: 0.25, focusX: 0.55, scale: 2.3 },
  robert_reassure: { focusY: 0.52, focusX: 0.46, scale: 2.3 },

  // Jazmine DuBois (Victory celebration / Goal progress)
  jazmine_complete: { focusY: 0.38, focusX: 0.46, scale: 2.3 },
  jazmine_progress: { focusY: 0.27, focusX: 0.45, scale: 2.3 },

  // Tom DuBois (Preventive warning / Alarm)
  tom_alarm:   { focusY: 0.44, focusX: 0.53, scale: 2.3 },
  tom_caution: { focusY: 0.35, focusX: 0.48, scale: 1.2 },

  // A Pimp Named Slickback (Fedora & cash)
  slickback_bigcash: { focusY: 0.25, focusX: 0.49, scale: 2.3 },
  slickback_cash:    { focusY: 0.25, focusX: 0.47, scale: 2.3 },

  // Colonel Stinkmeaner (Hunched posture with cane)
  stink_explosive: { focusY: 0.25, focusX: 0.58, scale: 2.3 },
  stink_stern:     { focusY: 0.25, focusX: 0.52, scale: 2.3 },

  // Riley Freeman (Discretionary spending / Grind check-ins)
  riley_light: { focusY: 0.26, focusX: 0.51, scale: 2.3 },
  riley_spend: { focusY: 0.28, focusX: 0.62, scale: 2.3 },

  // Huey Freeman (Analytics & Reviews)
  huey_neutral: { focusY: 0.34, focusX: 0.50, scale: 2.2 },
  huey_analyze: { focusY: 0.30, focusX: 0.36, scale: 2.2 },
  huey_review:  { focusY: 0.27, focusX: 0.55, scale: 2.2 },

  // Ed Wuncler III (Wealth & Surplus)
  ed_wealth:  { focusY: 0.4, focusX: 0.49, scale: 1 },
  ed_surplus: { focusY: 0.4, focusX: 0.50, scale: 1 },
};

/**
 * CharacterAvatar
 *
 * @param {Object}  props
 * @param {string}  [props.assetId]      — character asset key
 * @param {number}  [props.size]         — diameter of the circle in px (default 84)
 * @param {string}  [props.borderColor]  — ring color (default colors.primary)
 * @param {number}  [props.borderWidth]  — ring width (default 2.5)
 * @param {object}  [props.style]        — outer container style override
 */
function CharacterAvatarComponent({
  assetId      = 'robert_neutral',
  size         = 84,
  borderColor  = colors.primary,
  borderWidth  = 2.5,
  style        = undefined,
}) {
  const source = canonicalAssets[assetId] || canonicalAssets.robert_neutral;
  const config = AVATAR_FOCAL_MAP[assetId] || { focusY: 0.29, focusX: 0.50, scale: 2.3 };

  const scaledWidth = size * config.scale;
  const scaledHeight = scaledWidth / CHARACTER_ASPECT_RATIO;

  const imgTop = size / 2 - scaledHeight * config.focusY;
  const imgLeft = size / 2 - scaledWidth * config.focusX;

  // Agitation animation for Uncle Ruckus
  const agitateX = useRef(new Animated.Value(0)).current;
  const isRuckus = assetId?.startsWith('ruckus');

  useEffect(() => {
    if (!isRuckus) {
      agitateX.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(agitateX, { toValue: 2.5, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(agitateX, { toValue: -2.5, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(agitateX, { toValue: 1.5, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(agitateX, { toValue: -1.5, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(agitateX, { toValue: 0, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRuckus, agitateX]);

  return (
    <View
      style={[
        {
          width:           size,
          height:          size,
          borderRadius:    size / 2,
          overflow:        'hidden',
          borderWidth,
          borderColor,
          backgroundColor: colors.cardElevated,
          flexShrink:      0,
          position:        'relative',
        },
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Character ${assetId}`}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: imgTop,
          left: imgLeft,
          width: scaledWidth,
          height: scaledHeight,
          transform: [{ translateX: agitateX }],
        }}
      >
        <Image
          source={source}
          style={{ width: scaledWidth, height: scaledHeight }}
          contentFit="fill"
          cachePolicy="memory-disk"
          priority="normal"
        />
      </Animated.View>
    </View>
  );
}

export default memo(CharacterAvatarComponent);
