import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { canonicalAssets } from '../lib/characters';

/**
 * GlobalCornerFigure
 *
 * @param {Object} [props]
 * @param {string} [props.assetId]
 * @param {number} [props.size]
 * @param {number} [props.opacity]
 * @param {'bottom-right' | 'top-right' | 'bottom-left' | 'inline'} [props.position]
 * @param {object} [props.style]
 */
function GlobalCornerFigureComponent({
  assetId = 'robert_guidance',
  size = 60,
  opacity = 0.25,
  position = 'bottom-right',
  style = undefined,
} = {}) {
  const asset = canonicalAssets[assetId] || canonicalAssets.robert_guidance;
  if (!asset) return null;

  const height = size;
  const width = Math.round(height * (512 / 768));
  const posStyle = positionStyles[position] || positionStyles['bottom-right'];

  return (
    <View
      style={[
        styles.container,
        posStyle,
        { width, height, opacity },
        style,
      ]}
      pointerEvents="none"
    >
      <Image
        source={asset}
        style={{ width, height }}
        contentFit="contain"
        cachePolicy="memory-disk"
        priority="low"
      />
    </View>
  );
}

export default memo(GlobalCornerFigureComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1,
  },
});

const positionStyles = StyleSheet.create({
  'bottom-right': {
    bottom: 8,
    right: 12,
  },
  'top-right': {
    top: 10,
    right: 12,
  },
  'bottom-left': {
    bottom: 8,
    left: 12,
  },
  'inline': {
    position: 'relative',
  },
});
