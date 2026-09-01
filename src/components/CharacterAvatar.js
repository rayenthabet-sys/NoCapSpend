// ─────────────────────────────────────────────────────────────────
// NoCapSpend — CharacterAvatar Component
// Renders a character canonical PNG as a circular avatar portrait.
//
// Used inside cards (DailyMeter, AdviceCard) to integrate the
// character engine's visual identity without the full animated panel.
//
// Design: circle clip, gold border ring, face portion shown via
// expo-image contentFit="cover" + contentPosition="top".
// ─────────────────────────────────────────────────────────────────

import React, { memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { canonicalAssets } from '../lib/characters';
import { colors } from '../lib/theme';

/**
 * CharacterAvatar
 *
 * @param {Object}  props
 * @param {string}  [props.assetId]      — character asset key (e.g. 'robert_neutral')
 * @param {number}  [props.size]         — diameter of the circle in px (default 56)
 * @param {string}  [props.borderColor]  — ring color (default colors.primary)
 * @param {number}  [props.borderWidth]  — ring width (default 2)
 * @param {object}  [props.style]        — outer container style override
 */
function CharacterAvatarComponent({
  assetId      = 'robert_neutral',
  size         = 56,
  borderColor  = colors.primary,
  borderWidth  = 2,
  style        = undefined,
}) {
  const source = canonicalAssets[assetId] || canonicalAssets.robert_neutral;

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
        },
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Character ${assetId}`}
    >
      {/*
       * contentFit="cover" + contentPosition="top":
       * - cover: scales image so its width fills the container (512px wide char
       *   scaled to `size`px wide → natural height = size × 768/512 = size × 1.5)
       * - top: anchors visible region to the top of the scaled image
       * Result: the top `size` px of the 1.5×size scaled image is shown —
       * the face/head which sits in the upper portion of all character portraits.
       */}
      <Image
        source={source}
        style={{ width: size, height: size }}
        contentFit="cover"
        contentPosition="top"
        cachePolicy="memory-disk"
        priority="normal"
      />
    </View>
  );
}

export default memo(CharacterAvatarComponent);
