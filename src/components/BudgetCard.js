import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../lib/theme';

/**
 * BudgetCard
 *
 * Dark card container. Optional `accent` prop adds a thin red left border.
 * Optional `danger` prop colors the border red brighter for over-budget states.
 *
 * Props:
 *   accent    bool     show subtle red left border accent
 *   danger    bool     show bright red border (over-budget)
 *   style     object   additional style overrides
 *   children  node
 */
export default function BudgetCard({ accent, danger, style, children }) {
  return (
    <View
      style={[
        styles.card,
        accent && styles.cardAccent,
        danger && styles.cardDanger,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius:    radii.sm,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.md,
    marginBottom:    spacing.md,
  },
  cardAccent: {
    borderLeftWidth:  3,
    borderLeftColor:  colors.primaryDark,
  },
  cardDanger: {
    borderLeftWidth:  3,
    borderLeftColor:  colors.primaryBright,
    borderColor:      colors.borderAccent,
  },
});
