import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../lib/theme';

/**
 * SectionHeader
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.action]
 * @param {() => void} [props.onAction]
 * @param {object} [props.style]
 */
export default function SectionHeader({
  title = '',
  action = undefined,
  onAction = undefined,
  style = undefined,
} = {}) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Text style={styles.action} onPress={onAction} accessibilityRole="button">
          {action}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.sm,
    marginTop:      spacing.xs,
  },
  title: {
    fontFamily:    fonts.display,
    fontSize:      18,
    color:         colors.textMuted,
    letterSpacing: 2.0,
    textTransform: 'uppercase',
  },
  action: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      11,
    color:         colors.primary,
    letterSpacing: 1.2,
  },
});
