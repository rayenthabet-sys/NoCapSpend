import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect, Ellipse } from 'react-native-svg';
import { colors } from '../lib/theme';

const STATES = {
  idle: { eyeScale: 1, mouthType: 'neutral', bodyTilt: 0 },
  income: { eyeScale: 1.2, mouthType: 'happy', bodyTilt: 0 },
  expense: { eyeScale: 0.8, mouthType: 'frown', bodyTilt: -3 },
  overspending: { eyeScale: 1.4, mouthType: 'shock', bodyTilt: 0 },
  broke: { eyeScale: 0.6, mouthType: 'dead', bodyTilt: 8 },
  saving: { eyeScale: 1.1, mouthType: 'happy', bodyTilt: -2 },
  goal_contributed: { eyeScale: 1, mouthType: 'smirk', bodyTilt: 0 },
  goal_completed: { eyeScale: 1.3, mouthType: 'happy', bodyTilt: 0 },
};

function VampBunnyFace({ state = 'idle', size = 80 }) {
  const s = STATES[state] || STATES.idle;
  const cx = size / 2;
  const cy = size / 2;
  const bodyR = size * 0.32;
  const earH = size * 0.28;
  const earW = size * 0.1;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Cape / hood shadow */}
      <Ellipse cx={cx} cy={cy + bodyR * 0.5} rx={bodyR * 1.3} ry={bodyR * 0.5} fill="#111" opacity={0.6} />

      {/* Ears */}
      <Ellipse cx={cx - bodyR * 0.5} cy={cy - bodyR - earH * 0.5} rx={earW} ry={earH} fill="#1a1a1a" />
      <Ellipse cx={cx + bodyR * 0.5} cy={cy - bodyR - earH * 0.5} rx={earW} ry={earH} fill="#1a1a1a" />
      {/* Inner ear */}
      <Ellipse cx={cx - bodyR * 0.5} cy={cy - bodyR - earH * 0.45} rx={earW * 0.5} ry={earH * 0.6} fill="#8B0000" opacity={0.5} />
      <Ellipse cx={cx + bodyR * 0.5} cy={cy - bodyR - earH * 0.45} rx={earW * 0.5} ry={earH * 0.6} fill="#8B0000" opacity={0.5} />

      {/* Body */}
      <Circle cx={cx} cy={cy} r={bodyR} fill="#1a1a1a" />

      {/* Eyes */}
      {s.mouthType === 'dead' ? (
        <>
          {/* X eyes for dead state */}
          <Path d={`M${cx - 10} ${cy - 6} l6 6 l-6 6`} stroke="#C1121F" strokeWidth={2} fill="none" />
          <Path d={`M${cx - 4} ${cy - 6} l-6 6 l6 6`} stroke="#C1121F" strokeWidth={2} fill="none" />
          <Path d={`M${cx + 4} ${cy - 6} l6 6 l-6 6`} stroke="#C1121F" strokeWidth={2} fill="none" />
          <Path d={`M${cx + 10} ${cy - 6} l-6 6 l6 6`} stroke="#C1121F" strokeWidth={2} fill="none" />
        </>
      ) : (
        <>
          {/* Normal red eyes */}
          <Circle cx={cx - bodyR * 0.3} cy={cy - bodyR * 0.15} r={3 * s.eyeScale} fill="#C1121F" />
          <Circle cx={cx + bodyR * 0.3} cy={cy - bodyR * 0.15} r={3 * s.eyeScale} fill="#C1121F" />
          {/* Eye glow */}
          <Circle cx={cx - bodyR * 0.3} cy={cy - bodyR * 0.15} r={1.5} fill="#FF4444" opacity={0.6} />
          <Circle cx={cx + bodyR * 0.3} cy={cy - bodyR * 0.15} r={1.5} fill="#FF4444" opacity={0.6} />
        </>
      )}

      {/* Mouth variations */}
      {s.mouthType === 'neutral' && (
        <Path d={`M${cx - 4} ${cy + bodyR * 0.2} L${cx + 4} ${cy + bodyR * 0.2}`} stroke="#888" strokeWidth={1.5} fill="none" />
      )}
      {s.mouthType === 'happy' && (
        <Path d={`M${cx - 6} ${cy + bodyR * 0.15} Q${cx} ${cy + bodyR * 0.35} ${cx + 6} ${cy + bodyR * 0.15}`} stroke="#D8D8D8" strokeWidth={1.5} fill="none" />
      )}
      {s.mouthType === 'frown' && (
        <Path d={`M${cx - 5} ${cy + bodyR * 0.3} Q${cx} ${cy + bodyR * 0.15} ${cx + 5} ${cy + bodyR * 0.3}`} stroke="#888" strokeWidth={1.5} fill="none" />
      )}
      {s.mouthType === 'shock' && (
        <Ellipse cx={cx} cy={cy + bodyR * 0.25} rx={4} ry={5} fill="#333" stroke="#888" strokeWidth={1} />
      )}
      {s.mouthType === 'smirk' && (
        <Path d={`M${cx - 3} ${cy + bodyR * 0.2} Q${cx + 2} ${cy + bodyR * 0.3} ${cx + 6} ${cy + bodyR * 0.15}`} stroke="#D8D8D8" strokeWidth={1.5} fill="none" />
      )}
      {s.mouthType === 'dead' && (
        <Path d={`M${cx - 6} ${cy + bodyR * 0.25} L${cx - 2} ${cy + bodyR * 0.2} L${cx + 2} ${cy + bodyR * 0.3} L${cx + 6} ${cy + bodyR * 0.25}`} stroke="#888" strokeWidth={1.5} fill="none" />
      )}

      {/* Fangs (always visible — it's a vampire) */}
      {s.mouthType !== 'dead' && (
        <>
          <Polygon points={`${cx - 4},${cy + bodyR * 0.2} ${cx - 2},${cy + bodyR * 0.35} ${cx - 6},${cy + bodyR * 0.2}`} fill="#D8D8D8" />
          <Polygon points={`${cx + 4},${cy + bodyR * 0.2} ${cx + 2},${cy + bodyR * 0.35} ${cx + 6},${cy + bodyR * 0.2}`} fill="#D8D8D8" />
        </>
      )}
    </Svg>
  );
}

export default function VampCharacter({ state = 'idle', size = 80 }) {
  const bobAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Idle bob animation
  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -3, duration: 1200, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 3, duration: 1200, useNativeDriver: true }),
      ])
    );
    bobLoop.start();
    return () => bobLoop.stop();
  }, [bobAnim]);

  // Event-based animations
  useEffect(() => {
    if (state === 'overspending' || state === 'broke') {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }

    if (state === 'goal_completed' || state === 'income') {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [state, shakeAnim, scaleAnim]);

  return (
    <Animated.View
      style={{
        alignItems: 'center',
        transform: [
          { translateY: bobAnim },
          { translateX: shakeAnim },
          { scale: scaleAnim },
        ],
      }}
    >
      <VampBunnyFace state={state} size={size} />
    </Animated.View>
  );
}
