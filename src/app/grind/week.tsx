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
import { showAlert } from '../../lib/dialog';
import { getGrindGoals } from '../../lib/grindStore';
import {
  getWeekCheckins,
  getTodayDateString,
  getStartOfWeekDateString,
} from '../../lib/grindCheckins';
import {
  getWeekIntention,
  lockCurrentWeek,
  renegotiateCommitment,
} from '../../lib/grindWeek';
import { getTopInsight } from '../../lib/grindInsights';
import {
  calculateWeeklyProgress,
  calculateGoalProgress,
  calculateGoalWeeklyStreak,
} from '../../lib/grindStreaks';
import { resolveWeekIntentionReaction } from '../../lib/grindReactions';
import BudgetCharacter from '../../components/BudgetCharacter';
import RenegotiateCommitmentModal from '../../components/RenegotiateCommitmentModal';

export default function GrindWeekScreen() {
  const auth: any = useAuth();
  const session = auth?.session;

  const currentWeekStartStr = useMemo(() => getStartOfWeekDateString(), []);
  const todayStr = useMemo(() => getTodayDateString(), []);

  const [goals, setGoals] = useState<any[]>([]);
  const [weekIntention, setWeekIntention] = useState<any>(null);
  const [weekCheckins, setWeekCheckins] = useState<any[]>([]);
  const [topInsight, setTopInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Planning mode selection state
  const [selectedGoalIds, setSelectedGoalIds] = useState<Record<string, boolean>>({});
  const [plannedTargets, setPlannedTargets] = useState<Record<string, number>>({});

  // Renegotiation modal state
  const [renegotiateGoal, setRenegotiateGoal] = useState<any>(null);
  const [renegotiateCommitmentData, setRenegotiateCommitmentData] = useState<any>(null);
  const [renegotiateModalVisible, setRenegotiateModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [allGoals, intention, checkins, insight]: [any, any, any, any] = await Promise.all([
        getGrindGoals(session.user.id),
        getWeekIntention(session.user.id, currentWeekStartStr),
        getWeekCheckins(session.user.id, currentWeekStartStr),
        getTopInsight(session.user.id),
      ]);

      const active = allGoals.filter((g: any) => !g.isArchived && !g.isPaused && !g.isCompleted);
      const displayGoals = intention?.locked
        ? allGoals.filter((g: any) => intention.commitments?.some((c: any) => c.goalId === g.id))
        : active;

      setGoals(displayGoals);
      setWeekIntention(intention);
      setWeekCheckins(checkins);
      setTopInsight(insight);

      // Initialize planning selections if week is not locked
      if (!intention || !intention.locked) {
        const initialSelected: Record<string, boolean> = {};
        const initialTargets: Record<string, number> = {};
        active.forEach((g: any) => {
          initialSelected[g.id] = true;
          initialTargets[g.id] = Number(g.targetCount) || 1;
        });
        setSelectedGoalIds(initialSelected);
        setPlannedTargets(initialTargets);
      }
    } catch (err) {
      console.warn('[GrindWeekScreen] loadData failed', err);
    } finally {
      setLoading(false);
    }
  }, [session, currentWeekStartStr]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const isLocked = Boolean(weekIntention?.locked);

  const weeklySummary: any = useMemo(() => {
    return calculateWeeklyProgress(goals, weekCheckins, weekIntention);
  }, [goals, weekCheckins, weekIntention]);

  const daysRemainingInWeek = useMemo(() => {
    const today = new Date(todayStr + 'T00:00:00');
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const daysLeft = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    return daysLeft;
  }, [todayStr]);

  const formatWeekRange = () => {
    const start = new Date(currentWeekStartStr + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`.toUpperCase();
  };

  // ── Handle Lock-In ─────────────────────────────────────────────
  const handleLockInWeek = () => {
    if (!session) return;

    const committedGoals = goals
      .filter((g) => selectedGoalIds[g.id])
      .map((g) => ({
        goalId: g.id,
        targetCount: plannedTargets[g.id] || g.targetCount,
        goalType: g.goalType,
      }));

    if (committedGoals.length === 0) {
      showAlert(
        'No Commitments Selected',
        'Please select at least one Grind goal to lock in for this week.'
      );
      return;
    }

    const commitmentSummary = goals
      .filter((g) => selectedGoalIds[g.id])
      .map((g) => `• ${plannedTargets[g.id] || g.targetCount}× ${g.title}`)
      .join('\n');

    showAlert(
      'LOCK IN THIS WEEK?',
      `You are committing to:\n\n${commitmentSummary}\n\nOnce locked, these become your weekly commitments. You can still renegotiate an unrealistic target later if necessary.`,
      [
        { text: 'GO BACK', style: 'cancel' },
        {
          text: 'LOCK IT IN',
          style: 'default',
          onPress: async () => {
            try {
              const updated = await lockCurrentWeek(session.user.id, currentWeekStartStr, committedGoals);
              setWeekIntention(updated);
              const reaction = resolveWeekIntentionReaction('LOCK_IN');
              showAlert(
                reaction.quote,
                `Week locked in with ${committedGoals.length} commitments.\n\n${reaction.subtext}`,
                [{ text: 'LET’S GRIND', onPress: () => loadData() }]
              );
            } catch (err: any) {
              showAlert('Lock-In Error', err.message || 'Could not lock week.');
            }
          },
        },
      ]
    );
  };

  // ── Handle Renegotiation ───────────────────────────────────────
  const openRenegotiate = (goal: any, commitment: any) => {
    if (commitment.adjustedAt) {
      showAlert(
        'Already Adjusted',
        'This commitment has already been renegotiated once for this week.'
      );
      return;
    }
    setRenegotiateGoal(goal);
    setRenegotiateCommitmentData(commitment);
    setRenegotiateModalVisible(true);
  };

  const handleSaveRenegotiation = async (newTarget: number, reason: string) => {
    if (!session || !renegotiateGoal) return;
    const updated = await renegotiateCommitment(
      session.user.id,
      currentWeekStartStr,
      renegotiateGoal.id,
      newTarget,
      reason
    );
    setWeekIntention(updated);
    const reaction = resolveWeekIntentionReaction('RENEGOTIATION');
    showAlert(
      reaction.quote,
      `Target for "${renegotiateGoal.title}" adjusted to ${newTarget}.\n\n${reaction.subtext}`,
      [{ text: 'OK', onPress: () => loadData() }]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <RenegotiateCommitmentModal
        visible={renegotiateModalVisible}
        onClose={() => setRenegotiateModalVisible(false)}
        goal={renegotiateGoal}
        commitment={renegotiateCommitmentData}
        onSaveRenegotiation={handleSaveRenegotiation}
      />

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
          <View style={[styles.statusBadge, isLocked ? styles.statusBadgeLocked : styles.statusBadgeUnlocked]}>
            <Text style={[styles.statusBadgeText, isLocked ? styles.statusTextLocked : styles.statusTextUnlocked]}>
              {isLocked ? '🔒 LOCKED IN' : '⚡ PLANNING'}
            </Text>
          </View>
        </View>

        <Text style={styles.screenTitle}>THIS WEEK</Text>
        <Text style={styles.screenSubtitle}>
          WEEK OF {formatWeekRange()} • {daysRemainingInWeek} {daysRemainingInWeek === 1 ? 'DAY' : 'DAYS'} LEFT
        </Text>

        {goals.length === 0 ? (
          /* ── NO GOALS EMPTY STATE ── */
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>NOTHING TO COMMIT TO YET</Text>
            <Text style={styles.emptyBody}>
              Create your Grind goals first, then come here at the start of each week to lock in your weekly commitments.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/grind/add-goal' as any)}
            >
              <Text style={styles.primaryBtnText}>+ CREATE A GRIND GOAL</Text>
            </TouchableOpacity>
          </View>
        ) : isLocked ? (
          /* ── STATE 2: LOCKED IN (EXECUTION MODE) ── */
          <View style={styles.lockedContainer}>
            {/* Overview Banner */}
            <View style={styles.summaryBanner}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryTitle}>WEEKLY COMMITMENTS</Text>
                <Text style={styles.summaryFraction}>
                  {weeklySummary.goalsMetCount} / {weeklySummary.totalGoals} MET
                </Text>
              </View>

              <View style={styles.summaryScoreRow}>
                <Text style={[styles.summaryScoreNumber, { color: colors.primaryBright }]}>
                  {weeklySummary.grindScorePercent}%
                </Text>
                <View style={styles.summaryBadgePill}>
                  <Text style={styles.summaryBadgeText}>{weeklySummary.tier?.label}</Text>
                </View>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${weeklySummary.grindScorePercent}%` },
                    weeklySummary.grindScorePercent >= 90 && styles.progressBarFillElite,
                  ]}
                />
              </View>
            </View>

            {/* Character Motivation Box */}
            <View style={styles.characterBanner}>
              <BudgetCharacter
                assetId="ed_wealth"
                animationType="native"
                size="small"
                animated={true}
              />
              <View style={styles.dialogueBox}>
                <Text style={styles.dialogueTitle}>WEEKLY ACCOUNTABILITY</Text>
                <Text style={styles.dialogueQuote}>
                  “YOU SAID YOU'D DO IT. NOW STAND ON BUSINESS.”
                </Text>
                <Text style={styles.dialogueSub}>
                  Execute your commitments or renegotiate before the week ends.
                </Text>
              </View>
            </View>

            {/* Commitments List */}
            <Text style={styles.sectionHeading}>ACTIVE COMMITMENTS</Text>
            <View style={styles.commitmentsList}>
              {goals
                .filter((g) => {
                  const commitment = weekIntention.commitments?.find((c: any) => c.goalId === g.id);
                  return Boolean(commitment);
                })
                .map((goal) => {
                  const commitment = weekIntention.commitments?.find((c: any) => c.goalId === goal.id);
                  const progress: any = calculateGoalProgress(goal, weekCheckins, commitment);
                  const isRenegotiated = commitment?.status === 'renegotiated' || Boolean(commitment?.adjustedAt);

                  return (
                    <View key={goal.id} style={styles.commitmentCard}>
                      <View style={styles.commitmentCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.goalCardTitle} numberOfLines={1}>
                            {goal.title}
                          </Text>
                          <Text style={styles.categoryLabel}>
                            {goal.category?.toUpperCase() || 'GENERAL'}
                          </Text>
                        </View>

                        {isRenegotiated && (
                          <View style={styles.renegotiatedTag}>
                            <Text style={styles.renegotiatedTagText}>ADJUSTED</Text>
                          </View>
                        )}
                      </View>

                      {/* Progress summary */}
                      <View style={styles.progressRow}>
                        <Text style={styles.progressText}>
                          {progress.completedCount} / {progress.targetCount}{' '}
                          {goal.goalType === 'quantity' ? goal.targetUnit : 'times'}{' '}
                          {progress.isTargetMet ? '★ TARGET MET' : ''}
                        </Text>
                        <Text style={[styles.percentText, progress.isTargetMet && styles.percentTextMet]}>
                          {progress.percent}%
                        </Text>
                      </View>

                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${progress.percent}%` },
                            progress.isTargetMet && styles.progressBarFillMet,
                          ]}
                        />
                      </View>

                      {/* Footer / Renegotiate trigger */}
                      <View style={styles.commitmentCardFooter}>
                        {isRenegotiated ? (
                          <Text style={styles.renegotiatedNote}>
                            Original: {commitment.originalTarget} → {commitment.adjustedTarget} ({commitment.adjustmentReason || 'Adjusted'})
                          </Text>
                        ) : (
                          <Text style={styles.committedDateText}>
                            Locked target: {progress.targetCount}
                          </Text>
                        )}

                        {!progress.isTargetMet && (
                          <TouchableOpacity
                            style={[styles.renegotiateBtn, isRenegotiated && styles.renegotiateBtnDisabled]}
                            onPress={() => openRenegotiate(goal, commitment)}
                            disabled={isRenegotiated}
                          >
                            <Text style={[styles.renegotiateBtnText, isRenegotiated && styles.renegotiateBtnTextDisabled]}>
                              {isRenegotiated ? '✓ ADJUSTED' : '⚖ RENEGOTIATE'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
            </View>

            {/* Quick check-in shortcut */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/grind' as any)}
            >
              <Text style={styles.primaryBtnText}>→ GO TO TODAY'S CHECK-IN</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── STATE 1: UNLOCKED (PLANNING MODE) ── */
          <View style={styles.planningContainer}>
            <View style={styles.planningIntroBox}>
              <Text style={styles.planningIntroTitle}>WHAT ARE WE GETTING DONE THIS WEEK?</Text>
              <Text style={styles.planningIntroBody}>
                Select the goals you deliberately promise to work on this week. Once locked, they become your binding weekly commitments.
              </Text>
            </View>

            <Text style={styles.sectionHeading}>CHOOSE YOUR COMMITMENTS</Text>
            <View style={styles.goalsSelectionList}>
              {goals.map((goal) => {
                const isSelected = Boolean(selectedGoalIds[goal.id]);
                const target = plannedTargets[goal.id] || goal.targetCount || 1;

                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.selectionCard, isSelected && styles.selectionCardActive]}
                    onPress={() =>
                      setSelectedGoalIds((prev) => ({
                        ...prev,
                        [goal.id]: !prev[goal.id],
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.selectionCardHeader}>
                      <View style={styles.checkboxWrap}>
                        <Text style={[styles.checkboxIcon, isSelected && styles.checkboxIconActive]}>
                          {isSelected ? '☑' : '☐'}
                        </Text>
                        <Text style={[styles.selectionTitle, isSelected && styles.selectionTitleActive]}>
                          {goal.title}
                        </Text>
                      </View>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{goal.category?.toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text style={styles.targetSpec}>
                      Target: {target} {goal.goalType === 'quantity' ? goal.targetUnit : 'times'} / week
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Optional Evidence-based Guidance if selecting high load */}
            {topInsight && Object.values(selectedGoalIds).filter(Boolean).length > 3 && (topInsight.id === 'COMMITMENT_LOAD' || topInsight.id === 'SWEET_SPOT') && (
              <View style={styles.guidanceBox}>
                <Text style={styles.guidanceTag}>💡 HISTORICAL PATTERN</Text>
                <Text style={styles.guidanceText}>
                  {topInsight.description} You currently have {Object.values(selectedGoalIds).filter(Boolean).length} goals selected.
                </Text>
              </View>
            )}

            <View style={{ height: 16 }} />

            <TouchableOpacity
              style={styles.lockInActionBtn}
              onPress={handleLockInWeek}
              activeOpacity={0.8}
            >
              <Text style={styles.lockInActionBtnText}>
                🔒 LOCK IN {Object.values(selectedGoalIds).filter(Boolean).length} COMMITMENTS
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
  },
  statusBadgeLocked: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
  },
  statusBadgeUnlocked: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
  },
  statusBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  statusTextLocked: {
    color: colors.income,
  },
  statusTextUnlocked: {
    color: colors.warning,
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.textPrimary,
    letterSpacing: 2,
    lineHeight: 38,
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
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
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
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  lockedContainer: {
    gap: 14,
  },
  summaryBanner: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 16,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  summaryFraction: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
  },
  summaryScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryScoreNumber: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: 1,
  },
  summaryBadgePill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  summaryBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressBarFillElite: {
    backgroundColor: colors.primaryBright,
  },
  progressBarFillMet: {
    backgroundColor: colors.income,
  },
  characterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    borderRadius: radii.md,
    padding: 12,
    gap: 12,
  },
  dialogueBox: {
    flex: 1,
  },
  dialogueTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dialogueQuote: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.primaryBright,
    letterSpacing: 1,
    marginBottom: 2,
  },
  dialogueSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  sectionHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  commitmentsList: {
    gap: 10,
  },
  commitmentCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
    padding: 14,
  },
  commitmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  goalCardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  categoryLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  renegotiatedTag: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  renegotiatedTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  percentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  percentTextMet: {
    color: colors.income,
  },
  commitmentCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  renegotiatedNote: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.warning,
    flex: 1,
  },
  committedDateText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
  },
  renegotiateBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  renegotiateBtnDisabled: {
    opacity: 0.5,
    borderColor: colors.border,
  },
  renegotiateBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  renegotiateBtnTextDisabled: {
    color: colors.textMuted,
  },
  primaryBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  planningContainer: {
    gap: 12,
  },
  planningIntroBox: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 14,
  },
  planningIntroTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.primaryBright,
    letterSpacing: 1,
    marginBottom: 4,
  },
  planningIntroBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  goalsSelectionList: {
    gap: 8,
  },
  selectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
  },
  selectionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardElevated,
  },
  selectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkboxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkboxIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  checkboxIconActive: {
    color: colors.primaryBright,
  },
  selectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectionTitleActive: {
    color: colors.textPrimary,
  },
  categoryPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  categoryPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primary,
  },
  targetSpec: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 26,
  },
  guidanceBox: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 12,
    marginTop: 10,
  },
  guidanceTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.warning,
    letterSpacing: 1,
    marginBottom: 2,
  },
  guidanceText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  lockInActionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockInActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primaryBright,
    letterSpacing: 2,
  },
});
