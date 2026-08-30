import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { characterAssets, globalViews } from '../lib/characters';

/**
 * GlobalCornerFigure
 *
 * Displays a subtle cropped rotation figure from the global sheet (carti-global.png)
 * positioned decoratively in corners or card backgrounds.
 *
 * Props:
 *   view      "front" | "frontAlt" | "side" | "back" (default: "side")
 *   size      number   height in px (default: 65)
 *   opacity   number   opacity between 0 and 1 (default: 0.45)
 *   position  "bottom-right" | "top-right" | "bottom-left" | "inline"
 *   style     object
 */
export default function GlobalCornerFigure({
  view = 'side',
  size = 65,
  opacity = 0.45,
  position = 'bottom-right',
  style,
}) {
  const asset = characterAssets.global;
  if (!asset) return null;

  const viewIndex = globalViews[view] ?? 2;
  const sheetHeight = size;
  const sheetWidth = sheetHeight * (1536 / 1024);
  const viewWidth = sheetWidth / 4;
  const offsetX = -(viewIndex * viewWidth);

  const posStyle = positionStyles[position] || positionStyles['bottom-right'];

  return (
    <View
      style={[
        styles.container,
        posStyle,
        { width: viewWidth, height: sheetHeight, opacity },
        style,
      ]}
      pointerEvents="none"
    >
      <Image
        source={asset}
        style={{
          width: sheetWidth,
          height: sheetHeight,
          position: 'absolute',
          left: offsetX,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
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
