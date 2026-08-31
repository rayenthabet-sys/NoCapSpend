// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Daily Spending Meter Component
// Displays today's spending vs. the configured daily budget.
// Receives all data as props — parent is responsible for data fetching.
// ─────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { getDailyStatus } from '../lib/dailyBudget';

/** Map daily state to bar fill color */
function barColor(state) {
  switch (state) {
    case 'exceeded':  return colors.danger;
    case 'critical':  return '#E8793D';  // orange-red
    case 'caution':   return '#D4A237';  // gold / primary
    default:          return colors.income; // green
  }
}

/**
 * DailyMeter
 *
 * @param {Object} props
 * @param {number}       props.dailySpent    — today's actual spending in DT
 * @param {number|null}  props.dailyBudget   — configured daily budget (null = not set)
 * @param {boolean}      props.lockEnabled   — whether the daily expense lock is on
 * @param {boolean}      props.loading       — show skeleton while data loads
 */
export default function DailyMeter({ dailySpent = 0, dailyBudget = null, lockEnabled = false, loading = false }) {
  const status = getDailyStatus(dailySpent, dailyBudget);
  const { ratio, pct, state, remaining } = status;

  const barPct = dailyBudget ? Math.min(ratio * 100, 100) : 0;
  const fillColor = barColor(state);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>DAILY SPENDING</Text>
        <View style={styles.skeletonBar} />
      </View>
    );
  }

  if (!dailyBudget) {
    // No budget set — show prompt
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>DAILY SPENDING</Text>
        <Text style={styles.noBudgetText}>No daily budget set.</Text>
        <Link href="/settings" asChild>
          <TouchableOpacity style={styles.setupBtn}>
            <Text style={styles.setupBtnText}>SET DAILY BUDGET →</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <View style={[styles.card, state === 'exceeded' && styles.cardDanger, state === 'critical' && styles.cardCritical]}>
      {/* ── Header row ─────────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>DAILY SPENDING</Text>
        {lockEnabled && state === 'exceeded' && (
          <Text style={styles.lockBadge}>🔒 LOCKED</Text>
        )}
      </View>

      {/* ── Amount ─────────────────────────────────────── */}
      <Text style={[styles.amounts, state === 'exceeded' && styles.amountsDanger]}>
        {dailySpent.toFixed(2)} / {dailyBudget.toFixed(2)} DT
      </Text>

      {/* ── Progress bar ───────────────────────────────── */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${barPct}%`, backgroundColor: fillColor }]} />
      </View>

      {/* ── Status text ────────────────────────────────── */}
      {state === 'exceeded' ? (
        <Text style={styles.exceededText}>LIMIT EXCEEDED  ({pct}%)</Text>
      ) : state === 'critical' ? (
        <Text style={styles.criticalText}>APPROACHING LIMIT — {remaining.toFixed(2)} DT remaining</Text>
      ) : state === 'caution' ? (
        <Text style={styles.cautionText}>{remaining.toFixed(2)} DT remaining  ({pct}%)</Text>
      ) : (
        <Text style={styles.normalText}>{remaining.toFixed(2)} DT remaining</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardDanger: {
    borderColor: colors.danger,
    backgroundColor: '#1A0E0E',
  },
  cardCritical: {
    borderColor: '#E8793D',
    backgroundColor: '#1A1008',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  lockBadge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.danger,
    letterSpacing: 1,
    flexShrink: 1,
  },

  amounts: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  amountsDanger: {
    color: colors.danger,
  },

  barBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },

  normalText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  cautionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: '#D4A237',
    letterSpacing: 0.5,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  criticalText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: '#E8793D',
    letterSpacing: 0.5,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  exceededText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.danger,
    letterSpacing: 1,
    flexWrap: 'wrap',
    lineHeight: 18,
  },

  noBudgetText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 10,
  },
  setupBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  setupBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1.5,
  },

  skeletonBar: {
    height: 20,
    backgroundColor: colors.border,
    borderRadius: radii.sm,
    marginTop: 8,
    opacity: 0.4,
  },
});
