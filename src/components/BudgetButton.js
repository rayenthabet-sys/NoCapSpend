import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, radii, spacing, animation } from '../lib/theme';

/**
 * BudgetButton
 *
 * Standardized dark button.
 *
 * Variants:
 *   primary   — dark base, white text, red border on press (default)
 *   secondary — dark card bg, gray text, gray border
 *   danger    — red bg, white text
 *   ghost     — transparent bg, gray text, gray border
 *
 * Props:
 *   title       string   button label
 *   onPress     fn
 *   variant     string   "primary" | "secondary" | "danger" | "ghost"
 *   loading     bool     show spinner instead of title
 *   disabled    bool
 *   style       object   container override
 *   textStyle   object   label override
 *   accessibilityLabel  string
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
          color={variant === 'danger' ? colors.white : colors.textSecondary}
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
    borderWidth:     1,
    minHeight:       48,
  },
  // Variants
  primary: {
    backgroundColor: colors.cardElevated,
    borderColor:     colors.border,
  },
  primaryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize:   14,
    color:      colors.text,
    letterSpacing: 1,
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
  danger: {
    backgroundColor: colors.primary,
    borderColor:     colors.primaryBright,
  },
  dangerLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize:   14,
    color:      colors.white,
    letterSpacing: 1,
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
  // States
  disabled: {
    opacity: 0.45,
  },
  label: {
    // base label — always overridden by variant label
  },
});
