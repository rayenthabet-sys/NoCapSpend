import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { globalCornerAssets, characterAspectRatio } from '../lib/characters';

/**
 * GlobalCornerFigure
 *
 * Displays a lightweight (23KB) cropped figure from the global sheet
 * positioned decoratively in corners or card backgrounds.
 * Powered by expo-image with native caching.
 *
 * Props:
 *   view      "front" | "frontAlt" | "side" | "back" (default: "side")
 *   size      number   height in px (default: 60)
 *   opacity   number   opacity between 0 and 1 (default: 0.35)
 *   position  "bottom-right" | "top-right" | "bottom-left" | "inline"
 *   style     object
 */
function GlobalCornerFigureComponent({
  view = 'side',
  size = 60,
  opacity = 0.35,
  position = 'bottom-right',
  style,
}) {
  const asset = globalCornerAssets[view] || globalCornerAssets.side;
  if (!asset) return null;

  const height = size;
  const width = Math.round(height * characterAspectRatio.corner);
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
