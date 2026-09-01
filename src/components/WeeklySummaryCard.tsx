import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

interface WeeklySummaryCardProps {
  weeklySummary: {
    grindScorePercent: number;
    goalsMetCount: number;
    totalGoals: number;
    totalCheckinsCount: number;
    tier: {
      key: string;
      label: string;
      headline: string;
      description: string;
    };
    bestGoal: any;
    worstGoal: any;
    allGoalsCleared: boolean;
  };
  currentStreak: number;
  onPressReview: () => void;
  previousWeekScore?: number | null;
}

export default function WeeklySummaryCard({
  weeklySummary,
  currentStreak,
  onPressReview,
  previousWeekScore,
}: WeeklySummaryCardProps) {
  const score = weeklySummary.grindScorePercent || 0;
  const tier = weeklySummary.tier || { key: 'DISASTER', label: 'DISASTER', description: '' };

  const getTierColor = () => {
    if (tier.key === 'ELITE') return colors.primaryBright;
    if (tier.key === 'SOLID') return colors.income;
    if (tier.key === 'SHAKY') return colors.warning;
    return colors.danger;
  };

  const tierColor = getTierColor();

  // Prior week comparison delta
  const hasPriorComparison = previousWeekScore !== null && previousWeekScore !== undefined;
  const delta = hasPriorComparison ? score - (previousWeekScore || 0) : 0;

  return (
    <View style={styles.card}>
      {/* ── CARD HEADER ── */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>THIS WEEK'S SCORE</Text>
        <View style={[styles.tierBadge, { borderColor: tierColor }]}>
          <Text style={[styles.tierBadgeText, { color: tierColor }]}>
            {tier.label}
          </Text>
        </View>
      </View>

      {/* ── SCORE DISPLAY & PROGRESS ── */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreLeft}>
          <Text style={[styles.scoreNumber, { color: tierColor }]}>
            {score}%
          </Text>
          <Text style={styles.scoreDesc}>{tier.headline}</Text>
        </View>

        {hasPriorComparison ? (
          <View style={styles.deltaBox}>
            <Text
              style={[
                styles.deltaText,
                { color: delta >= 0 ? colors.income : colors.danger },
              ]}
            >
              {delta >= 0 ? `▲ +${delta}%` : `▼ ${delta}%`}
            </Text>
            <Text style={styles.deltaLabel}>vs last week</Text>
          </View>
        ) : (
          <View style={styles.deltaBox}>
            <Text style={styles.firstWeekLabel}>FIRST WEEK</Text>
            <Text style={styles.deltaLabel}>Keep showing up</Text>
          </View>
        )}
      </View>

      {/* ── PROGRESS BAR ── */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${score}%`, backgroundColor: tierColor },
          ]}
        />
      </View>

      {/* ── 3-METRIC STAT PILLS ── */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>GOALS HIT</Text>
          <Text style={styles.statValue}>
            {weeklySummary.goalsMetCount} / {weeklySummary.totalGoals}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statPill}>
          <Text style={styles.statLabel}>CHECK-INS</Text>
          <Text style={styles.statValue}>
            {weeklySummary.totalCheckinsCount || 0}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statPill}>
          <Text style={styles.statLabel}>STREAK</Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            🔥 {currentStreak}D
          </Text>
        </View>
      </View>

      {/* ── BEST / WORST PERFORMANCE HIGHLIGHTS ── */}
      {(weeklySummary.bestGoal || weeklySummary.worstGoal) && (
        <View style={styles.highlightsContainer}>
          {weeklySummary.allGoalsCleared ? (
            <View style={styles.clearedBanner}>
              <Text style={styles.clearedText}>★ ALL GOALS 100% CLEARED THIS WEEK ★</Text>
            </View>
          ) : (
            <View style={styles.highlightsRow}>
              {weeklySummary.bestGoal && (
                <View style={styles.highlightItem}>
                  <Text style={styles.highlightTagBest}>TOP PERFORMING</Text>
                  <Text style={styles.highlightTitle} numberOfLines={1}>
                    {weeklySummary.bestGoal.goal.title}
                  </Text>
                  <Text style={[styles.highlightPercent, { color: colors.income }]}>
                    {weeklySummary.bestGoal.progress.percent}%
                  </Text>
                </View>
              )}

              {weeklySummary.worstGoal && (
                <View style={styles.highlightItem}>
                  <Text style={styles.highlightTagWorst}>NEEDS WORK</Text>
                  <Text style={styles.highlightTitle} numberOfLines={1}>
                    {weeklySummary.worstGoal.goal.title}
                  </Text>
                  <Text style={[styles.highlightPercent, { color: colors.danger }]}>
                    {weeklySummary.worstGoal.progress.percent}%
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ── ACTION TRIGGER ── */}
      <TouchableOpacity
        style={styles.reviewTriggerBtn}
        onPress={onPressReview}
        activeOpacity={0.8}
      >
        <Text style={styles.reviewTriggerText}>📊 VIEW FULL WEEKLY REVIEW</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  tierBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  scoreLeft: {
    flex: 1,
  },
  scoreNumber: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: 1,
  },
  scoreDesc: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  deltaBox: {
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  deltaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  deltaLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  firstWeekLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  highlightsContainer: {
    marginBottom: 12,
  },
  clearedBanner: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
    borderWidth: 1,
    borderRadius: radii.xs,
    paddingVertical: 8,
    alignItems: 'center',
  },
  clearedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.income,
    letterSpacing: 1,
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  highlightItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  highlightTagBest: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: colors.income,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  highlightTagWorst: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: colors.danger,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  highlightTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  highlightPercent: {
    fontFamily: fonts.display,
    fontSize: 15,
  },
  reviewTriggerBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTriggerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primaryBright,
    letterSpacing: 1.2,
  },
});
