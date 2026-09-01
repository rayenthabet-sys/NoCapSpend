import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { safeBack } from '../../lib/nav';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import {
  getStartOfWeekDateString,
  getOffsetWeekStartDateString,
  getWeekCheckins,
  getAllUserCheckins,
} from '../../lib/grindCheckins';
import { getGrindGoals } from '../../lib/grindStore';
import { getWeekIntention } from '../../lib/grindWeek';
import { getReflection } from '../../lib/grindReflections';
import { getUserUnlockedAchievements } from '../../lib/grindAchievements';
import { getCourtCases } from '../../lib/grindCourt';
import {
  calculateWeeklyProgress,
  calculateDailyStreak,
} from '../../lib/grindStreaks';
import { resolveReceiptVerdict } from '../../lib/grindReactions';
import BudgetCharacter from '../../components/BudgetCharacter';

export default function GrindReceiptScreen() {
  const auth: any = useAuth();
  const session = auth?.session;
  const params = useLocalSearchParams();

  const currentWeekStartStr = useMemo(() => getStartOfWeekDateString(), []);
  const initialOffset = useMemo(() => {
    if (params.weekStart && typeof params.weekStart === 'string') {
      const diffMs = new Date(params.weekStart).getTime() - new Date(currentWeekStartStr).getTime();
      return Math.round(diffMs / (7 * 24 * 3600 * 1000));
    }
    return 0;
  }, [params.weekStart, currentWeekStartStr]);

  const [weekOffset, setWeekOffset] = useState<number>(Math.min(0, initialOffset));
  const [loading, setLoading] = useState(true);

  const [goals, setGoals] = useState<any[]>([]);
  const [weekCheckins, setWeekCheckins] = useState<any[]>([]);
  const [allCheckins, setAllCheckins] = useState<any[]>([]);
  const [weekIntention, setWeekIntention] = useState<any>(null);
  const [reflection, setReflection] = useState<any>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
  const [courtCases, setCourtCases] = useState<any[]>([]);

  const selectedWeekStartStr = useMemo(
    () => getOffsetWeekStartDateString(currentWeekStartStr, weekOffset),
    [currentWeekStartStr, weekOffset]
  );

  const isCurrentWeek = weekOffset === 0;

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`.toUpperCase();
  };

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [allGoals, wCheckins, aCheckins, intention, ref, unlocked, cCases] = await Promise.all([
        getGrindGoals(session.user.id),
        getWeekCheckins(session.user.id, selectedWeekStartStr),
        getAllUserCheckins(session.user.id),
        getWeekIntention(session.user.id, selectedWeekStartStr),
        getReflection(session.user.id, selectedWeekStartStr),
        getUserUnlockedAchievements(session.user.id),
        getCourtCases(session.user.id),
      ]);

      setGoals(allGoals.filter((g: any) => !g.isArchived));
      setWeekCheckins(wCheckins);
      setAllCheckins(aCheckins);
      setWeekIntention(intention);
      setReflection(ref);
      setUnlockedAchievements(unlocked);
      setCourtCases(cCases);
    } catch (err) {
      console.warn('[GrindReceiptScreen] loadData error', err);
    } finally {
      setLoading(false);
    }
  }, [session, selectedWeekStartStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived progress and receipt metrics
  const weeklySummary: any = useMemo(() => {
    return calculateWeeklyProgress(goals, weekCheckins, weekIntention);
  }, [goals, weekCheckins, weekIntention]);

  const currentStreak = useMemo(() => {
    return calculateDailyStreak(allCheckins);
  }, [allCheckins]);

  const daysShowedUp = useMemo(() => {
    const doneCheckins = weekCheckins.filter((c) => c.status === 'done');
    const uniqueDates = new Set(doneCheckins.map((c) => c.checkin_date));
    return uniqueDates.size;
  }, [weekCheckins]);

  const verdict = useMemo(() => {
    return resolveReceiptVerdict(weeklySummary.tier?.key || 'SOLID');
  }, [weeklySummary.tier]);

  const hasActivity = weekCheckins.length > 0 || (weekIntention?.commitments?.length || 0) > 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          <Text style={styles.headerTagText}>GRIND RECEIPT</Text>
        </View>
      </View>

      {/* ── WEEK SWITCHER ── */}
      <View style={styles.weekSwitcherRow}>
        <TouchableOpacity
          style={styles.weekNavBtn}
          onPress={() => setWeekOffset((prev) => prev - 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.weekNavBtnText}>← PREV</Text>
        </TouchableOpacity>

        <View style={styles.weekLabelContainer}>
          <Text style={styles.weekSelectorTitle}>
            {isCurrentWeek ? 'THIS WEEK' : 'HISTORICAL RECEIPT'}
          </Text>
          <Text style={styles.weekSelectorRange}>
            {formatWeekRange(selectedWeekStartStr)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.weekNavBtn, isCurrentWeek && styles.weekNavBtnDisabled]}
          onPress={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
          disabled={isCurrentWeek}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.weekNavBtnText, isCurrentWeek && styles.weekNavBtnTextDisabled]}>
            NEXT →
          </Text>
        </TouchableOpacity>
      </View>

      {!hasActivity ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyTitle}>NO RECEIPT YET</Text>
          <Text style={styles.emptySub}>INSUFFICIENT DATA FOR THIS WEEK</Text>
          <Text style={styles.emptyBody}>
            Lock in your weekly intentions and check in daily to generate your weekly performance receipt.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/grind/week' as any)}
          >
            <Text style={styles.primaryBtnText}>→ LOCK IN WEEKLY COMMITMENTS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── THE RECEIPT CARD ── */
        <View style={styles.receiptWrapper}>
          <View style={styles.receiptCard}>
            {/* Top Store Header */}
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptBrand}>THE GRIND</Text>
              <Text style={styles.receiptSubbrand}>OFFICIAL PERFORMANCE RECEIPT</Text>
              <Text style={styles.receiptDate}>WEEK OF {formatWeekRange(selectedWeekStartStr)}</Text>
            </View>

            <View style={styles.dashedDivider} />

            {/* Main Stats Table */}
            <View style={styles.tableSection}>
              <View style={styles.tableRow}>
                <Text style={styles.tableKey}>PROMISES MADE</Text>
                <Text style={styles.tableDots}>....................</Text>
                <Text style={styles.tableVal}>{weeklySummary.totalGoals}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableKey}>PROMISES KEPT</Text>
                <Text style={styles.tableDots}>....................</Text>
                <Text style={[styles.tableVal, { color: colors.income }]}>
                  {weeklySummary.goalsMetCount}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableKey}>TOTAL CHECK-INS</Text>
                <Text style={styles.tableDots}>....................</Text>
                <Text style={styles.tableVal}>{weeklySummary.totalCheckinsCount}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableKey}>DAYS SHOWED UP</Text>
                <Text style={styles.tableDots}>....................</Text>
                <Text style={styles.tableVal}>{daysShowedUp} / 7</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableKey}>CURRENT STREAK</Text>
                <Text style={styles.tableDots}>....................</Text>
                <Text style={[styles.tableVal, { color: colors.warning }]}>
                  🔥 {currentStreak}D
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableKey}>GRIND SCORE</Text>
                <Text style={styles.tableDots}>....................</Text>
                <Text style={[styles.tableVal, styles.tableValScore]}>
                  {weeklySummary.grindScorePercent}%
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableKey}>WEEKLY GRADE</Text>
                <Text style={styles.tableDots}>....................</Text>
                <Text style={[styles.tableVal, { color: colors.primaryBright }]}>
                  {weeklySummary.tier?.label}
                </Text>
              </View>
            </View>

            <View style={styles.dashedDivider} />

            {/* Highlights: Best / Needs Work */}
            <View style={styles.highlightsSection}>
              {weeklySummary.bestGoal && (
                <View style={styles.highlightItem}>
                  <Text style={styles.highlightLabel}>★ BEST PERFORMANCE</Text>
                  <View style={styles.highlightRow}>
                    <Text style={styles.highlightTitle} numberOfLines={1}>
                      {weeklySummary.bestGoal.goal.title}
                    </Text>
                    <Text style={[styles.highlightPercent, { color: colors.income }]}>
                      {weeklySummary.bestGoal.progress.percent}%
                    </Text>
                  </View>
                </View>
              )}

              {weeklySummary.worstGoal && (
                <View style={[styles.highlightItem, { marginTop: 8 }]}>
                  <Text style={[styles.highlightLabel, { color: colors.danger }]}>
                    ⚠ NEEDS WORK
                  </Text>
                  <View style={styles.highlightRow}>
                    <Text style={styles.highlightTitle} numberOfLines={1}>
                      {weeklySummary.worstGoal.goal.title}
                    </Text>
                    <Text style={[styles.highlightPercent, { color: colors.danger }]}>
                      {weeklySummary.worstGoal.progress.percent}%
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Reflection Excerpt if present */}
            {reflection && (
              <>
                <View style={styles.dashedDivider} />
                <View style={styles.reflectionSnippetBox}>
                  <Text style={styles.reflectionSnippetLabel}>YOUR REFLECTION</Text>
                  <Text style={styles.reflectionSnippetText} numberOfLines={2}>
                    “{reflection.lesson || reflection.worked || reflection.nextWeek || 'Saved reflection'}”
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push(`/grind/reflection?weekStart=${selectedWeekStartStr}` as any)}
                  >
                    <Text style={styles.reflectionLinkText}>VIEW FULL REFLECTION →</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Character Court Status if present */}
            {courtCases.some((c) => c.weekStart === selectedWeekStartStr) && (
              <>
                <View style={styles.dashedDivider} />
                <View style={styles.reflectionSnippetBox}>
                  <Text style={[styles.reflectionSnippetLabel, { color: colors.warning }]}>
                    ⚖ CHARACTER COURT
                  </Text>
                  {courtCases
                    .filter((c) => c.weekStart === selectedWeekStartStr)
                    .map((c) => (
                      <Text key={c.id} style={styles.reflectionSnippetText}>
                        • {c.goalTitle}: {c.status === 'open' ? 'CASE IN SESSION' : `RESOLVED (${c.diagnosis?.replace(/_/g, ' ') || 'Resolved'})`}
                      </Text>
                    ))}
                </View>
              </>
            )}

            <View style={styles.dashedDivider} />

            {/* Verdict Section */}
            <View style={styles.verdictBox}>
              <Text style={styles.verdictHeading}>VERDICT</Text>
              <Text style={styles.verdictTitle}>{verdict.verdictTitle}</Text>
              <Text style={styles.verdictBody}>{verdict.verdictBody}</Text>
            </View>

            {/* Character Quote */}
            <View style={styles.characterBubble}>
              <BudgetCharacter
                assetId={verdict.assetId}
                animationType={verdict.animationType as any}
                size="small"
                animated={true}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.speakerLabel}>{verdict.speaker}:</Text>
                <Text style={styles.quoteText}>“{verdict.quote}”</Text>
              </View>
            </View>

            <View style={styles.dashedDivider} />

            {/* Decorative Barcode / Footer */}
            <View style={styles.barcodeSection}>
              <Text style={styles.barcodeLines}>||||| | |||| || ||||| || |||||| | ||||</Text>
              <Text style={styles.barcodeCaption}>THE GRIND • NO EXCUSES</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.receiptActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/grind/reflection?weekStart=${selectedWeekStartStr}` as any)}
            >
              <Text style={styles.actionBtnText}>
                {reflection ? '📝 EDIT REFLECTION' : '📝 WRITE REFLECTION'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => safeBack('/grind')}
            >
              <Text style={styles.actionBtnTextSecondary}>← BACK TO DASHBOARD</Text>
            </TouchableOpacity>
          </View>
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
  weekSwitcherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  weekNavBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  weekNavBtnDisabled: {
    opacity: 0.3,
    borderColor: colors.border,
  },
  weekNavBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  weekNavBtnTextDisabled: {
    color: colors.textMuted,
  },
  weekLabelContainer: {
    alignItems: 'center',
  },
  weekSelectorTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  weekSelectorRange: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
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
    color: colors.primary,
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
  primaryBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  receiptWrapper: {
    gap: 16,
  },
  receiptCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptBrand: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  receiptSubbrand: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 2,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  receiptDate: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  tableSection: {
    gap: 6,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableKey: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  tableDots: {
    flex: 1,
    color: colors.border,
    marginHorizontal: 6,
    fontSize: 10,
  },
  tableVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  tableValScore: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.primaryBright,
  },
  highlightsSection: {
    gap: 4,
  },
  highlightItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.income,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highlightTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
  highlightPercent: {
    fontFamily: fonts.display,
    fontSize: 15,
  },
  reflectionSnippetBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reflectionSnippetLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 3,
  },
  reflectionSnippetText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 15,
    marginBottom: 6,
  },
  reflectionLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  verdictBox: {
    alignItems: 'center',
    marginBottom: 10,
  },
  verdictHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  verdictTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.primaryBright,
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  verdictBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
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
    color: colors.textPrimary,
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  barcodeSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  barcodeLines: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textMuted,
    letterSpacing: 3,
  },
  barcodeCaption: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  receiptActions: {
    gap: 8,
  },
  actionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  actionBtnSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  actionBtnTextSecondary: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
