import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

/**
 * BudgetButton
 *
 * Standardized high-tactility comic-panel button.
 *
 * Variants:
 *   primary   — dark elevated base, gold border, white text
 *   secondary — dark card bg, muted text, border
 *   income    — dark base, green border (Bag In)
 *   danger    — dark base, red border (Bleed / Over-budget)
 *   ghost     — transparent bg, muted text
 */
export default function BudgetButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
}) {
  const containerStyle = [
    styles.base,
    styles[variant] || styles.primary,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`${variant}Label`] || styles.primaryLabel,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'income' ? colors.income : variant === 'danger' ? colors.danger : colors.primary}
        />
      ) : (
        <Text style={labelStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius:    radii.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    minHeight:       48,
  },
  // Variants
  primary: {
    backgroundColor: colors.cardElevated,
    borderColor:     colors.primary,
  },
  primaryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize:   14,
    color:      colors.textPrimary,
    letterSpacing: 1.2,
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor:     colors.border,
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize:   14,
    color:      colors.textSecondary,
    letterSpacing: 1,
  },
  income: {
    backgroundColor: colors.cardElevated,
    borderColor:     colors.income,
  },
  incomeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize:   14,
    color:      colors.textPrimary,
    letterSpacing: 1.2,
  },
  danger: {
    backgroundColor: colors.cardElevated,
    borderColor:     colors.danger,
  },
  dangerLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize:   14,
    color:      colors.danger,
    letterSpacing: 1.2,
  },
  ghost: {
    backgroundColor: colors.transparent,
    borderColor:     colors.border,
  },
  ghostLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize:   14,
    color:      colors.textSecondary,
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {},
});
