import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../lib/theme';

/**
 * SectionHeader
 *
 * Section label in uppercase condensed style.
 * Optionally shows a right-side action label.
 *
 * Props:
 *   title       string
 *   action      string   optional right-side text (e.g. "SEE ALL")
 *   onAction    fn       called when action is pressed
 *   style       object
 */
export default function SectionHeader({ title, action, onAction, style }) {
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
    marginTop:      spacing.sm,
  },
  title: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      11,
    color:         colors.textMuted,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  action: {
    fontFamily:    fonts.body,
    fontSize:      11,
    color:         colors.textSecondary,
    letterSpacing: 1,
  },
});
