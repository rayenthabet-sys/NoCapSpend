// ─────────────────────────────────────────────────────────────────
// NoCapSpend — Daily Spending Meter Component (Boondocks Mode)
// Visual redesign to match the reference screenshot.
//
// Layout: two-column inside the card.
//   LEFT  — label, amounts, progress bar, status text
//   RIGHT — circular character avatar + state label
//
// UNCHANGED: getDailyStatus(), threshold logic (80/95/100%), barColor().
// ADDED props: characterAssetId, characterLabel (purely visual).
// ─────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { getDailyStatus } from '../lib/dailyBudget';
import CharacterAvatar from './CharacterAvatar';

/** Map daily state to bar fill color — UNCHANGED from original */
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
 * @param {Object}   props
 * @param {number}        props.dailySpent         — today's actual spending in DT
 * @param {number|null}   props.dailyBudget        — configured daily budget (null = not set)
 * @param {boolean}       props.lockEnabled        — whether the daily expense lock is on
 * @param {boolean}       props.loading            — show skeleton while data loads
 * @param {string}        [props.characterAssetId] — asset key to display as avatar
 * @param {string}        [props.characterLabel]   — state label below avatar (e.g. "CAUTION")
 * @param {Object|null}   [props.carryoverInfo]    — informational monthly carryover balance
 */
export default function DailyMeter({
  dailySpent        = 0,
  dailyBudget       = null,
  lockEnabled       = false,
  loading           = false,
  characterAssetId  = 'robert_neutral',
  characterLabel    = '',
  carryoverInfo     = null,
}) {
  const status = getDailyStatus(dailySpent, dailyBudget);
  const { ratio, pct, state, remaining } = status;
  const overAmount = dailyBudget ? Math.max(0, dailySpent - dailyBudget) : 0;

  const barPct   = dailyBudget ? Math.min(ratio * 100, 100) : 0;
  const fillColor = barColor(state);

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TODAY'S SPENDING</Text>
        <View style={styles.skeletonBar} />
      </View>
    );
  }

  // ── No budget set — prompt ───────────────────────────────────────
  if (!dailyBudget) {
    return (
      <View style={styles.card}>
        <View style={styles.contentRow}>
          <View style={styles.leftCol}>
            <Text style={styles.cardTitle}>TODAY'S SPENDING</Text>
            <Text style={styles.noBudgetText}>No daily budget set.</Text>
            <Link href="/settings" asChild>
              <TouchableOpacity style={styles.setupBtn}>
                <Text style={styles.setupBtnText}>SET DAILY BUDGET →</Text>
              </TouchableOpacity>
            </Link>
          </View>
          <View style={styles.rightCol}>
            <CharacterAvatar
              assetId={characterAssetId}
              size={84}
              borderColor={colors.primary}
            />
            {!!characterLabel && (
              <Text style={[styles.charLabel, { color: colors.primary }]}>
                {characterLabel}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Main meter ───────────────────────────────────────────────────
  const cardStyle = [
    styles.card,
    state === 'exceeded' && styles.cardDanger,
    state === 'critical' && styles.cardCritical,
  ];

  const avatarBorderColor =
    state === 'exceeded' ? colors.danger :
    state === 'critical' ? '#E8793D' :
    state === 'caution'  ? colors.primary :
    colors.income;

  const charLabelColor =
    state === 'exceeded' ? colors.danger :
    state === 'critical' ? '#E8793D' :
    state === 'caution'  ? colors.primary :
    colors.income;

  return (
    <View style={cardStyle}>
      <View style={styles.contentRow}>
        {/* ── LEFT: spending info ──────────────────────── */}
        <View style={styles.leftCol}>
          <Text style={styles.cardTitle}>TODAY'S SPENDING</Text>

          {/* Amounts */}
          <Text
            style={[styles.amounts, state === 'exceeded' && styles.amountsDanger]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {dailySpent.toFixed(2)} DT
            <Text style={styles.amountsSep}> / </Text>
            <Text style={styles.amountsBudget}>{dailyBudget.toFixed(2)} DT</Text>
          </Text>

          {/* Progress bar */}
          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                { width: `${barPct}%`, backgroundColor: fillColor },
              ]}
            />
          </View>

          {/* Status text */}
          {state === 'exceeded' ? (
            <Text style={styles.exceededText}>⛔ LIMIT EXCEEDED  (+{overAmount.toFixed(2)} DT)</Text>
          ) : state === 'critical' ? (
            <Text style={styles.criticalText}>APPROACHING LIMIT : {remaining.toFixed(2)} DT left</Text>
          ) : state === 'caution' ? (
            <Text style={styles.cautionText}>⚡ CAUTION : {remaining.toFixed(2)} DT left</Text>
          ) : (
            <Text style={styles.normalText}>{remaining.toFixed(2)} DT remaining</Text>
          )}

          {/* Informational Month Balance Carryover Pill */}
          {!!carryoverInfo && (
            <View style={styles.carryoverRow}>
              <Text style={styles.carryoverTitle}>MONTH BALANCE:</Text>
              <View
                style={[
                  styles.carryoverPill,
                  carryoverInfo.type === 'shortfall' && styles.carryoverShortfall,
                  carryoverInfo.type === 'surplus' && styles.carryoverSurplus,
                  carryoverInfo.type === 'target' && styles.carryoverTarget,
                ]}
              >
                <Text
                  style={[
                    styles.carryoverPillText,
                    carryoverInfo.type === 'shortfall' && styles.carryoverShortfallText,
                    carryoverInfo.type === 'surplus' && styles.carryoverSurplusText,
                    carryoverInfo.type === 'target' && styles.carryoverTargetText,
                  ]}
                >
                  {carryoverInfo.label}
                </Text>
              </View>
            </View>
          )}

          {/* Lock badge */}
          {lockEnabled && state === 'exceeded' && (
            <Text style={styles.lockBadge}>🔒 SPENDING LOCKED</Text>
          )}
        </View>

        {/* ── RIGHT: character avatar ──────────────────── */}
        <View style={styles.rightCol}>
          <CharacterAvatar
            assetId={characterAssetId}
            size={84}
            borderColor={avatarBorderColor}
          />
          {!!characterLabel && (
            <Text style={[styles.charLabel, { color: charLabelColor }]}>
              {characterLabel}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardSecondary,
    borderRadius:    radii.md,
    borderWidth:     1.5,
    borderColor:     colors.border,
    padding:         spacing.md,
    marginBottom:    12,
  },
  cardDanger: {
    borderColor:     colors.danger,
    backgroundColor: '#190D0D',
  },
  cardCritical: {
    borderColor:     '#E8793D',
    backgroundColor: '#191008',
  },

  // Two-column layout
  contentRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
  },
  leftCol: {
    flex:       1,
    marginRight: 12,
  },
  rightCol: {
    alignItems:      'center',
    justifyContent:  'flex-start',
    paddingTop:      2,
    flexShrink:      0,
  },

  cardTitle: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom:  8,
  },

  // Amounts
  amounts: {
    fontFamily:    fonts.bodyBold,
    fontSize:      24,
    color:         colors.textPrimary,
    marginBottom:  10,
    flexWrap:      'wrap',
  },
  amountsDanger: {
    color: colors.danger,
  },
  amountsSep: {
    fontFamily: fonts.body,
    fontSize:   18,
    color:      colors.textMuted,
  },
  amountsBudget: {
    fontFamily: fonts.body,
    fontSize:   18,
    color:      colors.textSecondary,
  },

  // Progress bar — 10px height (from previous visual pass)
  barBg: {
    height:          10,
    backgroundColor: colors.border,
    borderRadius:    5,
    overflow:        'hidden',
    marginBottom:    8,
  },
  barFill: {
    height:       '100%',
    borderRadius: 5,
  },

  // Status text variants
  normalText: {
    fontFamily: fonts.body,
    fontSize:   12,
    color:      colors.textSecondary,
    flexWrap:   'wrap',
    lineHeight: 18,
  },
  cautionText: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      12,
    color:         '#D4A237',
    letterSpacing: 0.5,
    flexWrap:      'wrap',
    lineHeight:    18,
  },
  criticalText: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      12,
    color:         '#E8793D',
    letterSpacing: 0.5,
    flexWrap:      'wrap',
    lineHeight:    18,
  },
  exceededText: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      13,
    color:         colors.danger,
    letterSpacing: 1,
    flexWrap:      'wrap',
    lineHeight:    18,
  },
  lockBadge: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      11,
    color:         colors.danger,
    letterSpacing: 1,
    marginTop:     6,
    flexWrap:      'wrap',
  },

  // Informational Month Carryover Balance
  carryoverRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginTop:     8,
  },
  carryoverTitle: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      9,
    color:         colors.textMuted,
    letterSpacing: 0.8,
  },
  carryoverPill: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radii.xs,
    borderWidth:       1,
  },
  carryoverShortfall: {
    backgroundColor: '#2A1414',
    borderColor:     colors.danger,
  },
  carryoverShortfallText: {
    color: colors.danger,
  },
  carryoverSurplus: {
    backgroundColor: '#142A16',
    borderColor:     colors.income,
  },
  carryoverSurplusText: {
    color: colors.income,
  },
  carryoverTarget: {
    backgroundColor: colors.surface,
    borderColor:     colors.primary,
  },
  carryoverTargetText: {
    color: colors.primaryBright,
  },
  carryoverPillText: {
    fontFamily:    fonts.bodyBold,
    fontSize:      9,
    letterSpacing: 0.5,
  },

  // Character label below avatar
  charLabel: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      10,
    letterSpacing: 1.5,
    textAlign:     'center',
    marginTop:     6,
    textTransform: 'uppercase',
  },

  // No budget state
  noBudgetText: {
    fontFamily:   fonts.body,
    fontSize:     13,
    color:        colors.textMuted,
    marginBottom: 10,
  },
  setupBtn: {
    paddingVertical:  10,
    alignItems:       'center',
    borderWidth:      1.5,
    borderColor:      colors.primary,
    borderRadius:     radii.sm,
    minHeight:        44,
    justifyContent:   'center',
  },
  setupBtnText: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      12,
    color:         colors.primary,
    letterSpacing: 1.5,
  },

  // Loading skeleton
  skeletonBar: {
    height:          20,
    backgroundColor: colors.border,
    borderRadius:    radii.sm,
    marginTop:       8,
    opacity:         0.4,
  },
});
