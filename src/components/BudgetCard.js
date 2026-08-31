import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../lib/theme';

/**
 * BudgetCard
 *
 * @param {Object} props
 * @param {boolean} [props.accent]
 * @param {boolean} [props.warning]
 * @param {boolean} [props.danger]
 * @param {object} [props.style]
 * @param {React.ReactNode} [props.children]
 */
export default function BudgetCard({
  accent = false,
  warning = false,
  danger = false,
  style = undefined,
  children = null,
} = {}) {
  return (
    <View
      style={[
        styles.card,
        accent && styles.cardAccent,
        warning && styles.cardWarning,
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
    borderWidth:     1.5,
    borderColor:     colors.border,
    padding:         spacing.md,
    marginBottom:    spacing.md,
  },
  cardAccent: {
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
  },
  cardWarning: {
    borderLeftWidth: 3.5,
    borderLeftColor: colors.warning,
    borderColor:     colors.borderAccent,
  },
  cardDanger: {
    borderLeftWidth: 3.5,
    borderLeftColor: colors.danger,
    borderColor:     colors.danger,
  },
});
