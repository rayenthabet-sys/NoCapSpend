import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { safeBack } from '../../../lib/nav';
import { useAuth } from '../../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../../lib/theme';
import { showAlert } from '../../../lib/dialog';
import {
  getGrindGoalById,
  deleteGrindGoal,
  archiveGrindGoal,
} from '../../../lib/grindStore';
import {
  getCheckin,
  getWeekCheckins,
  getGoalCheckinHistory,
  getAllUserCheckins,
  upsertCheckin,
  getTodayDateString,
  getStartOfWeekDateString,
} from '../../../lib/grindCheckins';
import { calculateGoalProgress, calculateGoalWeeklyStreak } from '../../../lib/grindStreaks';

export default function GrindGoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth: any = useAuth();
  const session = auth?.session;

  const [goal, setGoal] = useState<any>(null);
  const [todayCheckin, setTodayCheckin] = useState<any>(null);
  const [weekCheckins, setWeekCheckins] = useState<any[]>([]);
  const [allCheckinsList, setAllCheckinsList] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantityInput, setQuantityInput] = useState('1');

  const todayStr = useMemo(() => getTodayDateString(), []);
  const weekStartStr = useMemo(() => getStartOfWeekDateString(), []);

  const loadGoalData = useCallback(async () => {
    if (!session || !id) return;
    setLoading(true);
    try {
      const [goalData, tCheckin, wCheckins, hist, allChk]: [any, any, any, any, any] = await Promise.all([
        getGrindGoalById(session.user.id, id),
        getCheckin(session.user.id, id, todayStr),
        getWeekCheckins(session.user.id, weekStartStr),
        getGoalCheckinHistory(session.user.id, id, 14),
        getAllUserCheckins(session.user.id),
      ]);

      setGoal(goalData);
      setTodayCheckin(tCheckin);
      setWeekCheckins(wCheckins);
      setHistory(hist);
      setAllCheckinsList(allChk);

      if (tCheckin?.value_count !== undefined) {
        setQuantityInput(String(tCheckin.value_count));
      }
    } catch (err) {
      console.warn('[GrindGoalDetail] loadGoalData error', err);
    } finally {
      setLoading(false);
    }
  }, [session, id, todayStr, weekStartStr]);

  useFocusEffect(
    useCallback(() => {
      loadGoalData();
    }, [loadGoalData])
  );

  const weekProgress: any = useMemo(() => {
    return calculateGoalProgress(goal, weekCheckins);
  }, [goal, weekCheckins]);

  const goalWeeklyStreak: number = useMemo(() => {
    return calculateGoalWeeklyStreak(goal, allCheckinsList, weekStartStr);
  }, [goal, allCheckinsList, weekStartStr]);

  const handleCheckInToggle = async (status: 'done' | 'not_done', valueCount: number = 1) => {
    if (!session || !goal) return;

    // Optimistically update
    setTodayCheckin({
      goal_id: goal.id,
      user_id: session.user.id,
      checkin_date: todayStr,
      status,
      value_count: valueCount,
    });

    try {
      await upsertCheckin(session.user.id, goal.id, todayStr, {
        status,
        value_count: valueCount,
      });
      loadGoalData();
    } catch (err) {
      console.warn('[GrindGoalDetail] checkin failed', err);
    }
  };

  const handleArchiveToggle = async () => {
    if (!session || !goal) return;
    const newArchivedState = !goal.isArchived;
    await archiveGrindGoal(session.user.id, goal.id, newArchivedState);
    showAlert(
      newArchivedState ? 'Goal Archived' : 'Goal Unarchived',
      newArchivedState
        ? 'This goal is hidden from your active Grind dashboard.'
        : 'This goal is now active on your Grind dashboard.',
      [{ text: 'OK', onPress: () => loadGoalData() }]
    );
  };

  const handleDelete = () => {
    if (!session || !goal) return;
    showAlert(
      'DELETE GOAL',
      `Are you sure you want to delete "${goal.title}"? This cannot be undone.`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            await deleteGrindGoal(session.user.id, goal.id);
            safeBack('/grind');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundTitle}>GOAL NOT FOUND</Text>
        <Text style={styles.notFoundBody}>This goal may have been deleted.</Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { marginTop: 20 }]}
          onPress={() => safeBack('/grind')}
        >
          <Text style={styles.buttonText}>BACK TO THE GRIND</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTargetLabel = () => {
    if (goal.goalType === 'daily') return 'EVERY DAY (7x / WEEK)';
    if (goal.goalType === 'once') return '1x THIS WEEK';
    if (goal.goalType === 'quantity') return `${goal.targetCount} ${goal.targetUnit.toUpperCase()} / WEEK`;
    return `${goal.targetCount} TIMES / WEEK`;
  };

  const isTodayDone = todayCheckin?.status === 'done';
  const isTodayNotDone = todayCheckin?.status === 'not_done';

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
          <Text style={styles.backLink}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{goal.category?.toUpperCase() || 'GENERAL'}</Text>
        </View>
      </View>

      <Text style={styles.goalTitle}>{goal.title}</Text>

      {goal.isArchived && (
        <View style={styles.archivedBanner}>
          <Text style={styles.archivedBannerText}>ARCHIVED GOAL</Text>
        </View>
      )}

      {/* ── WEEKLY TARGET CARD ── */}
      <View style={styles.targetCard}>
        <View style={styles.targetCardHeader}>
          <Text style={styles.targetLabel}>WEEKLY TARGET</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {goalWeeklyStreak > 0 && (
              <View style={styles.streakPill}>
                <Text style={styles.streakPillText}>🔥 {goalWeeklyStreak}W STREAK</Text>
              </View>
            )}
            <Text style={[styles.targetFraction, weekProgress.isTargetMet && styles.targetMetText]}>
              {weekProgress.completedCount} / {weekProgress.targetCount} {weekProgress.isTargetMet ? '★ MET' : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.targetValue}>{formatTargetLabel()}</Text>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${weekProgress.percent}%` },
              weekProgress.isTargetMet && styles.progressBarFillMet,
            ]}
          />
        </View>
        <Text style={styles.progressPercentText}>
          {weekProgress.percent}% of weekly target • {weekProgress.remainingCount > 0 ? `${weekProgress.remainingCount} remaining` : 'Target achieved!'}
        </Text>
      </View>

      {/* ── TODAY'S CHECK-IN ACTION CARD ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>TODAY'S CHECK-IN</Text>
        <Text style={styles.checkinSub}>
          Status for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}:
        </Text>

        {goal.goalType === 'quantity' ? (
          <View style={styles.qtyCheckInContainer}>
            <View style={styles.qtyInputRow}>
              <Text style={styles.qtyLabel}>Quantity Today:</Text>
              <TextInput
                style={styles.qtyField}
                value={quantityInput}
                onChangeText={setQuantityInput}
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={styles.qtyUnitLabel}>{goal.targetUnit}</Text>
            </View>
            <View style={styles.checkInBtnRow}>
              <TouchableOpacity
                style={[styles.checkBtn, styles.doneBtn, isTodayDone && styles.doneBtnActive]}
                onPress={() => {
                  const val = parseFloat(quantityInput);
                  handleCheckInToggle('done', isNaN(val) || val <= 0 ? 1 : val);
                }}
              >
                <Text style={[styles.checkBtnText, styles.doneBtnText, isTodayDone && styles.btnTextActive]}>
                  {isTodayDone ? '✓ LOGGED DONE' : '+ LOG PROGRESS'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkBtn, styles.notDoneBtn, isTodayNotDone && styles.notDoneBtnActive]}
                onPress={() => handleCheckInToggle('not_done', 0)}
              >
                <Text style={[styles.checkBtnText, styles.notDoneBtnText, isTodayNotDone && styles.btnTextActive]}>
                  {isTodayNotDone ? '✗ SKIPPED' : '✗ SKIP TODAY'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.checkInBtnRow}>
            <TouchableOpacity
              style={[styles.checkBtn, styles.doneBtn, isTodayDone && styles.doneBtnActive]}
              onPress={() => handleCheckInToggle('done', 1)}
            >
              <Text style={[styles.checkBtnText, styles.doneBtnText, isTodayDone && styles.btnTextActive]}>
                {isTodayDone ? '✓ COMPLETED TODAY' : '✓ MARK DONE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkBtn, styles.notDoneBtn, isTodayNotDone && styles.notDoneBtnActive]}
              onPress={() => handleCheckInToggle('not_done', 0)}
            >
              <Text style={[styles.checkBtnText, styles.notDoneBtnText, isTodayNotDone && styles.btnTextActive]}>
                {isTodayNotDone ? '✗ MISSED TODAY' : '✗ NOT DONE'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── DESCRIPTION ── */}
      {Boolean(goal.description) && (
        <View style={styles.sectionBox}>
          <Text style={styles.sectionLabel}>WHY THIS MATTERS</Text>
          <Text style={styles.descriptionText}>{goal.description}</Text>
        </View>
      )}

      {/* ── RECENT CHECK-IN HISTORY ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>RECENT CHECK-IN LOGS</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyHistoryText}>No check-in entries logged yet.</Text>
        ) : (
          <View style={styles.historyList}>
            {history.slice(0, 7).map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{item.checkin_date}</Text>
                <View
                  style={[
                    styles.historyStatusBadge,
                    item.status === 'done' ? styles.badgeDone : styles.badgeNotDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.historyStatusText,
                      item.status === 'done' ? styles.textDone : styles.textNotDone,
                    ]}
                  >
                    {item.status === 'done'
                      ? goal.goalType === 'quantity'
                        ? `✓ +${item.value_count} ${goal.targetUnit}`
                        : '✓ COMPLETED'
                      : '✗ NOT DONE'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── ACTIONS ── */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push(`/grind/add-goal?editId=${goal.id}` as any)}
        >
          <Text style={styles.buttonText}>EDIT GOAL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleArchiveToggle}
        >
          <Text style={styles.buttonTextSecondary}>
            {goal.isArchived ? 'UNARCHIVE GOAL' : 'ARCHIVE GOAL'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleDelete}
        >
          <Text style={styles.buttonTextDanger}>DELETE GOAL</Text>
        </TouchableOpacity>
      </View>
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
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1,
  },
  categoryBadge: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  categoryBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  goalTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 8,
    lineHeight: 36,
  },
  archivedBanner: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.xs,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  archivedBannerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.warning,
    letterSpacing: 1.5,
  },
  targetCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 16,
    marginBottom: 16,
  },
  targetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  targetLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  targetFraction: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primaryBright,
  },
  streakPill: {
    backgroundColor: 'rgba(212, 162, 55, 0.12)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  streakPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  targetMetText: {
    color: colors.income,
  },
  targetValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primaryBright,
    letterSpacing: 1,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressBarFillMet: {
    backgroundColor: colors.income,
  },
  progressPercentText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  checkinSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  checkInBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkBtn: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 44,
  },
  doneBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
  },
  doneBtnActive: {
    backgroundColor: colors.income,
    borderColor: colors.income,
  },
  notDoneBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
  },
  notDoneBtnActive: {
    backgroundColor: colors.expense,
    borderColor: colors.expense,
  },
  checkBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  doneBtnText: {
    color: colors.income,
  },
  notDoneBtnText: {
    color: colors.danger,
  },
  btnTextActive: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
  },
  qtyCheckInContainer: {
    gap: 10,
  },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  qtyField: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.primaryBright,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
  },
  qtyUnitLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  sectionBox: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  emptyHistoryText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  badgeDone: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
    borderWidth: 1,
  },
  badgeNotDone: {
    backgroundColor: colors.expenseCard,
    borderColor: colors.expenseBorder,
    borderWidth: 1,
  },
  historyStatusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  textDone: {
    color: colors.income,
  },
  textNotDone: {
    color: colors.danger,
  },
  actionsContainer: {
    gap: 10,
  },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  buttonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  buttonTextSecondary: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  dangerButton: {
    backgroundColor: colors.expenseCard,
    borderColor: colors.expenseBorder,
  },
  buttonTextDanger: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.danger,
    letterSpacing: 1.5,
  },
  notFoundTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  notFoundBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
