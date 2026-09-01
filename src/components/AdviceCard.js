// ─────────────────────────────────────────────────────────────────
// NoCapSpend — AdviceCard Component (Boondocks Mode)
// Visual redesign to match the reference screenshot.
//
// Layout: character circular portrait LEFT + quote text RIGHT.
// Logic: unchanged — useMemo phrase stability on stateKey,
//        resolveAdviceState() reads context values only.
//
// New props:
//   characterAssetId — passed from dashboard (matches active character)
// ─────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { resolveAdviceState, getAdvicePhrase } from '../lib/advicePhrases';
import CharacterAvatar from './CharacterAvatar';

/**
 * Maps advice state key to a canonical character asset for the advice portrait.
 * This is a visual-only mapping — does not affect character engine priority.
 */
const ADVICE_CHARACTER_MAP = {
  exceeded:  'ruckus_emergency',
  critical:  'ruckus_alarm',
  pressure:  'tom_caution',
  goalNear:  'jazmine_progress',
  goalDone:  'jazmine_complete',
  wealth:    'ed_wealth',
  noIncome:  'stink_stern',
  surplus:   'robert_neutral',
};

/**
 * Maps advice state to the avatar border accent color.
 */
const STATE_COLOR = {
  exceeded:  colors.danger,
  critical:  '#E8793D',
  pressure:  colors.warning,
  goalNear:  colors.goals,
  goalDone:  colors.income,
  wealth:    colors.wealth,
  noIncome:  colors.expense,
  surplus:   colors.primary,
};

/**
 * AdviceCard
 *
 * @param {Object}      props
 * @param {Object}      [props.context]              — financial context (READ-ONLY)
 * @param {number}      [props.context.remaining]
 * @param {number}      [props.context.availableSavings]
 * @param {number}      [props.context.incomeTotal]
 * @param {boolean}     [props.context.isDailyBudgetExceeded]
 * @param {number}      [props.context.dailyBudgetRatio]
 * @param {Object|null} [props.context.goalStatus]
 * @param {Object|null} [props.context.budgetStatus]
 * @param {string}      [props.characterAssetId]     — override portrait asset
 * @param {object}      [props.style]                — optional outer style override
 */
export default function AdviceCard({
  context          = {},
  characterAssetId = undefined,
  style            = undefined,
}) {
  // ── Resolve advice state key from financial context (READ-ONLY) ──
  const stateKey = useMemo(
    () => resolveAdviceState(context),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      context.remaining,
      context.availableSavings,
      context.incomeTotal,
      context.isDailyBudgetExceeded,
      context.dailyBudgetRatio,
      context.goalStatus?.isComplete,
      context.goalStatus?.pct,
      context.budgetStatus?.isOverBudget,
      context.budgetStatus?.ratio,
    ]
  );

  // ── Phrase stable per stateKey — only changes when state changes ─
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const phrase = useMemo(() => getAdvicePhrase(stateKey), [stateKey]);

  // ── Portrait asset — use override if supplied, else state-based ──
  const avatarAsset = characterAssetId || ADVICE_CHARACTER_MAP[stateKey] || 'robert_neutral';
  const accentColor = STATE_COLOR[stateKey] || colors.primary;

  return (
    <View style={[styles.card, style]}>
      {/* Section header */}
      <Text style={styles.sectionLabel}>BOONDOCKS ADVICE</Text>

      {/* Portrait + Quote row */}
      <View style={styles.contentRow}>
        {/* Character portrait — left */}
        <View style={styles.avatarWrap}>
          <CharacterAvatar
            assetId={avatarAsset}
            size={62}
            borderColor={accentColor}
          />
        </View>

        {/* Quote — right */}
        <View style={styles.quoteWrap}>
          <Text style={styles.quoteMark}>"</Text>
          <Text style={styles.phrase}>{phrase}"</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:  colors.cardElevated,
    borderRadius:     radii.md,
    borderWidth:      1.5,
    borderColor:      colors.border,
    paddingVertical:  14,
    paddingHorizontal: spacing.md,
    marginBottom:     12,
  },

  sectionLabel: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom:  10,
  },

  contentRow: {
    flexDirection:  'row',
    alignItems:     'center',
  },

  avatarWrap: {
    marginRight:  14,
    flexShrink:   0,
    alignSelf:    'center',
  },

  quoteWrap: {
    flex:        1,
    flexShrink:  1,
  },

  quoteMark: {
    fontFamily:  fonts.display,
    fontSize:    32,
    color:       colors.primary,
    lineHeight:  24,
    marginBottom: 2,
  },

  phrase: {
    fontFamily:    fonts.display,
    fontSize:      20,
    color:         colors.textPrimary,
    letterSpacing: 0.8,
    lineHeight:    26,
    flexWrap:      'wrap',
  },
});
