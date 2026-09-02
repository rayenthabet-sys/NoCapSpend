import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { safeBack } from '../../lib/nav';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import {
  getAvailableInsights,
  MIN_COMPLETED_WEEKS,
} from '../../lib/grindInsights';
import { resolveInsightReaction } from '../../lib/grindReactions';
import BudgetCharacter from '../../components/BudgetCharacter';

export default function GrindInsightsScreen() {
  const auth: any = useAuth();
  const session = auth?.session;

  const [loading, setLoading] = useState(true);
  const [insightsData, setInsightsData] = useState<{
    insights: any[];
    completedWeeksCount: number;
    hasEnoughData: boolean;
  }>({
    insights: [],
    completedWeeksCount: 0,
    hasEnoughData: false,
  });

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await getAvailableInsights(session.user.id);
      setInsightsData(data);
    } catch (err) {
      console.warn('[GrindInsightsScreen] loadData error', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { insights, completedWeeksCount, hasEnoughData } = insightsData;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => safeBack('/grind')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backLink}>← THE GRIND</Text>
        </TouchableOpacity>
        <View style={styles.headerTag}>
          <Text style={styles.headerTagText}>BEHAVIORAL REPORT</Text>
        </View>
      </View>

      <Text style={styles.screenTitle}>YOUR PATTERNS</Text>
      <Text style={styles.screenSubtitle}>
        DERIVED EVIDENCE • {completedWeeksCount} COMPLETED {completedWeeksCount === 1 ? 'WEEK' : 'WEEKS'} AUDITED
      </Text>

      {!hasEnoughData ? (
        /* ── INSUFFICIENT DATA STATE ── */
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyTitle}>PATTERNS STILL FORMING</Text>
          <Text style={styles.emptySub}>WE NEED AT LEAST 4 COMPLETED WEEKS</Text>
          <Text style={styles.emptyBody}>
            The Grind identifies real behavioral patterns from your execution history. Show up, lock in your weeks, and let the data accumulate.
          </Text>

          <View style={styles.progressCounterBox}>
            <Text style={styles.progressCounterText}>
              {completedWeeksCount} / {MIN_COMPLETED_WEEKS} WEEKS OF DATA
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.round((completedWeeksCount / MIN_COMPLETED_WEEKS) * 100))}%` },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => safeBack('/grind')}
          >
            <Text style={styles.primaryActionBtnText}>← BACK TO THE GRIND</Text>
          </TouchableOpacity>
        </View>
      ) : insights.length === 0 ? (
        /* ── NO POLAR PATTERNS DETECTED YET ── */
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⚖</Text>
          <Text style={styles.emptyTitle}>NO DOMINANT IMBALANCES</Text>
          <Text style={styles.emptySub}>YOUR EXECUTION IS EVENLY DISTRIBUTED</Text>
          <Text style={styles.emptyBody}>
            Your performance across commitment sizes and goal formats has remained balanced with no severe bottlenecks detected.
          </Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => safeBack('/grind')}
          >
            <Text style={styles.primaryActionBtnText}>← BACK TO THE GRIND</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── INSIGHTS LIST ── */
        <View style={styles.insightsList}>
          {insights.map((insight) => {
            const reaction = resolveInsightReaction(insight.id);

            return (
              <View key={insight.id} style={styles.insightCard}>
                <View style={styles.insightCardHeader}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{insight.type}</Text>
                  </View>
                  <View style={styles.confidencePill}>
                    <Text style={styles.confidencePillText}>{insight.confidence} CONFIDENCE</Text>
                  </View>
                </View>

                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightConclusion}>{insight.conclusion}</Text>
                <Text style={styles.insightDesc}>{insight.description}</Text>

                {/* Optional native visual comparison */}
                {insight.comparison && (
                  <View style={styles.comparisonBox}>
                    <View style={styles.comparisonRow}>
                      <View style={styles.comparisonLabelRow}>
                        <Text style={styles.compLabel}>{insight.comparison.primaryLabel}</Text>
                        <Text style={[styles.compScore, { color: colors.income }]}>
                          {insight.comparison.primaryScore}%
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            styles.progressBarFillPrimary,
                            { width: `${insight.comparison.primaryScore}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={[styles.comparisonRow, { marginTop: 8 }]}>
                      <View style={styles.comparisonLabelRow}>
                        <Text style={styles.compLabel}>{insight.comparison.secondaryLabel}</Text>
                        <Text style={[styles.compScore, { color: colors.warning }]}>
                          {insight.comparison.secondaryScore}%
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            styles.progressBarFillSecondary,
                            { width: `${insight.comparison.secondaryScore}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Character Reaction Bubble */}
                <View style={styles.characterBubble}>
                  <BudgetCharacter
                    assetId={reaction.assetId}
                    animationType={reaction.animationType as any}
                    size="small"
                    animated={true}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.speakerLabel}>{reaction.speaker}:</Text>
                    <Text style={styles.quoteText}>“{reaction.quote}”</Text>
                    <Text style={styles.subtextText}>{reaction.subtext}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  container: {
    padding: 20,
    paddingTop: 52,
    paddingBottom: 48,
    maxWidth: 580,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1,
  },
  headerTag: {
    backgroundColor: colors.card,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  headerTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: 2,
    lineHeight: 36,
  },
  screenSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.warning,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  progressCounterBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCounterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressBarFillPrimary: {
    backgroundColor: colors.income,
  },
  progressBarFillSecondary: {
    backgroundColor: colors.warning,
  },
  primaryActionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  primaryActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  insightsList: {
    gap: 14,
  },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
    padding: 16,
  },
  insightCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  typeBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  confidencePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  confidencePillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  insightTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  insightConclusion: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    marginBottom: 6,
  },
  insightDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  comparisonBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  comparisonRow: {},
  comparisonLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  compScore: {
    fontFamily: fonts.display,
    fontSize: 13,
  },
  characterBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.xs,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    gap: 10,
  },
  speakerLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 1,
  },
  quoteText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.primaryBright,
    letterSpacing: 0.5,
    lineHeight: 18,
    marginBottom: 2,
  },
  subtextText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
});
