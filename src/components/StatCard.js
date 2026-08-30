import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

/**
 * StatCard
 *
 * Small dark card showing a label + value pair.
 * Can be used in a row for Income / Expense side-by-side.
 *
 * Props:
 *   label     string
 *   value     string | number
 *   color     string   override value text color (e.g. colors.income, colors.expense)
 *   flex      number   flex value for row layouts (default: 1)
 *   style     object
 */
export default function StatCard({ label, value, color, flex = 1, style }) {
  return (
    <View style={[styles.card, { flex }, style]}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, color && { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardSecondary,
    borderRadius:    radii.sm,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.md,
    alignItems:      'flex-start',
  },
  label: {
    fontFamily:    fonts.body,
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 2,
    marginBottom:  4,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: fonts.bodyBold,
    fontSize:   18,
    color:      colors.text,
  },
});
