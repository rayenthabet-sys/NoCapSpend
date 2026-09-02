import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
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
  pauseGrindGoal,
  resumeGrindGoal,
  completeGrindGoal,
  restoreGrindGoal,
  getGoalLifecycleState,
  GOAL_LIFECYCLE_STATES,
  PAUSE_REASONS,
} from '../../../lib/grindStore';
import {
  getCheckin,
  getWeekCheckins,
  getGoalCheckinHistory,
  getAllUserCheckins,
  upsertCheckin,
  getTodayDateString,
  getStartOfWeekDateString,
  formatLocalDate,
} from '../../../lib/grindCheckins';
import { calculateGoalProgress, calculateGoalWeeklyStreak } from '../../../lib/grindStreaks';
import { resolveGoalLifecycleReaction } from '../../../lib/grindReactions';

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

  // Pause modal state
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [selectedPauseReason, setSelectedPauseReason] = useState<string>(PAUSE_REASONS.TAKING_A_BREAK);

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

  const lifecycleState = useMemo(() => {
    return getGoalLifecycleState(goal);
  }, [goal]);

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

  // ── LIFECYCLE ACTIONS ──

  const handlePauseGoal = async () => {
    if (!session || !goal) return;
    try {
      await pauseGrindGoal(session.user.id, goal.id, selectedPauseReason);
      setPauseModalVisible(false);
      const reaction = resolveGoalLifecycleReaction('PAUSE');
      showAlert(
        'GOAL PAUSED',
        `"${goal.title}" is now paused.\nReason: ${selectedPauseReason}\n\n${reaction.speaker}: “${reaction.quote}”`,
        [{ text: 'OK', onPress: () => loadGoalData() }]
      );
    } catch (err) {
      console.warn('[GrindGoalDetail] pause error', err);
    }
  };

  const handleResumeGoal = async () => {
    if (!session || !goal) return;
    try {
      await resumeGrindGoal(session.user.id, goal.id);
      const reaction = resolveGoalLifecycleReaction('RESUME');
      showAlert(
        'GOAL RESUMED',
        `"${goal.title}" is back in your active goals.\n\n${reaction.speaker}: “${reaction.quote}”`,
        [{ text: 'LET’S WORK', onPress: () => loadGoalData() }]
      );
    } catch (err) {
      console.warn('[GrindGoalDetail] resume error', err);
    }
  };

  const handleCompleteGoal = async () => {
    if (!session || !goal) return;
    try {
      await completeGrindGoal(session.user.id, goal.id);
      const reaction = resolveGoalLifecycleReaction('COMPLETE');
      showAlert(
        'GOAL COMPLETED ✓',
        `You successfully completed "${goal.title}"!\n\n${reaction.speaker}: “${reaction.quote}”`,
        [{ text: 'TAKE THE WIN', onPress: () => loadGoalData() }]
      );
    } catch (err) {
      console.warn('[GrindGoalDetail] complete error', err);
    }
  };

  const handleArchiveToggle = async () => {
    if (!session || !goal) return;
    if (goal.isArchived) {
      await restoreGrindGoal(session.user.id, goal.id);
      showAlert('GOAL RESTORED', 'This goal has been restored to your active goals.', [
        { text: 'OK', onPress: () => loadGoalData() },
      ]);
    } else {
      await archiveGrindGoal(session.user.id, goal.id, true);
      showAlert('GOAL ARCHIVED', 'This goal has been archived and hidden from active views. All history is preserved.', [
        { text: 'OK', onPress: () => loadGoalData() },
      ]);
    }
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

  if (loading || !goal) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isTodayDone = todayCheckin?.status === 'done';
  const isTodayNotDone = todayCheckin?.status === 'not_done';

  const formatTargetLabel = () => {
    if (goal.goalType === 'daily') return '7 days / week (Daily habit)';
    if (goal.goalType === 'quantity') return `${goal.targetCount} ${goal.targetUnit} / week`;
    if (goal.goalType === 'once') return '1 time (One-time objective)';
    return `${goal.targetCount} times / week`;
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── PAUSE REASON MODAL ── */}
      <Modal
        visible={pauseModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPauseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>PAUSE GOAL?</Text>
            <Text style={styles.modalSub}>{goal.title}</Text>
            <Text style={styles.modalDesc}>
              This temporarily removes it from Today’s Missions, This Week commitments, and active Court detection. All your history stays intact.
            </Text>

            <Text style={styles.modalReasonHeading}>SELECT REASON:</Text>
            {Object.values(PAUSE_REASONS).map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedPauseReason === reason && styles.reasonOptionActive,
                ]}
                onPress={() => setSelectedPauseReason(reason)}
              >
                <Text
                  style={[
                    styles.reasonOptionText,
                    selectedPauseReason === reason && styles.reasonOptionTextActive,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPauseModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handlePauseGoal}
              >
                <Text style={styles.modalConfirmBtnText}>PAUSE GOAL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => safeBack('/grind')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backLink}>← THE GRIND</Text>
        </TouchableOpacity>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{(goal.category || 'General').toUpperCase()}</Text>
        </View>
      </View>

      {/* ── GOAL TITLE & LIFECYCLE BADGE ── */}
      <View style={styles.titleSection}>
        <Text style={styles.goalTitle}>{goal.title}</Text>

        <View style={styles.lifecycleRow}>
          <View
            style={[
              styles.lifecyclePill,
              lifecycleState === GOAL_LIFECYCLE_STATES.ACTIVE && styles.pillActive,
              lifecycleState === GOAL_LIFECYCLE_STATES.PAUSED && styles.pillPaused,
              lifecycleState === GOAL_LIFECYCLE_STATES.COMPLETED && styles.pillCompleted,
              lifecycleState === GOAL_LIFECYCLE_STATES.ARCHIVED && styles.pillArchived,
            ]}
          >
            <Text style={styles.lifecyclePillText}>
              {lifecycleState === GOAL_LIFECYCLE_STATES.COMPLETED ? 'COMPLETED ✓' : lifecycleState}
            </Text>
          </View>

          {lifecycleState === GOAL_LIFECYCLE_STATES.PAUSED && goal.pausedAt && (
            <Text style={styles.lifecycleMetaText}>
              Paused {goal.pausedAt.slice(0, 10)} {goal.pauseReason ? `• ${goal.pauseReason}` : ''}
            </Text>
          )}

          {lifecycleState === GOAL_LIFECYCLE_STATES.COMPLETED && goal.completedAt && (
            <Text style={styles.lifecycleMetaText}>
              Finished {goal.completedAt.slice(0, 10)}
            </Text>
          )}
        </View>
      </View>

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

      {/* ── TODAY'S CHECK-IN ACTION CARD (ACTIVE ONLY) ── */}
      {lifecycleState === GOAL_LIFECYCLE_STATES.ACTIVE && (
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
      )}

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

      {/* ── LIFECYCLE MANAGEMENT CONTROLS ── */}
      <View style={styles.lifecycleSectionCard}>
        <Text style={styles.sectionLabel}>LIFECYCLE MANAGEMENT</Text>

        <View style={styles.lifecycleBtnGrid}>
          {lifecycleState === GOAL_LIFECYCLE_STATES.ACTIVE && (
            <>
              <TouchableOpacity
                style={[styles.lifecycleActionBtn, styles.pauseBtn]}
                onPress={() => setPauseModalVisible(true)}
              >
                <Text style={styles.pauseBtnText}>⏸ PAUSE GOAL</Text>
              </TouchableOpacity>

              {goal.goalType === 'once' && (
                <TouchableOpacity
                  style={[styles.lifecycleActionBtn, styles.completeBtn]}
                  onPress={handleCompleteGoal}
                >
                  <Text style={styles.completeBtnText}>✓ COMPLETE GOAL</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.lifecycleActionBtn, styles.archiveBtn]}
                onPress={handleArchiveToggle}
              >
                <Text style={styles.archiveBtnText}>📦 ARCHIVE</Text>
              </TouchableOpacity>
            </>
          )}

          {lifecycleState === GOAL_LIFECYCLE_STATES.PAUSED && (
            <>
              <TouchableOpacity
                style={[styles.lifecycleActionBtn, styles.resumeBtn]}
                onPress={handleResumeGoal}
              >
                <Text style={styles.resumeBtnText}>▶ RESUME GOAL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.lifecycleActionBtn, styles.archiveBtn]}
                onPress={handleArchiveToggle}
              >
                <Text style={styles.archiveBtnText}>📦 ARCHIVE</Text>
              </TouchableOpacity>
            </>
          )}

          {lifecycleState === GOAL_LIFECYCLE_STATES.COMPLETED && (
            <TouchableOpacity
              style={[styles.lifecycleActionBtn, styles.archiveBtn]}
              onPress={handleArchiveToggle}
            >
              <Text style={styles.archiveBtnText}>📦 ARCHIVE</Text>
            </TouchableOpacity>
          )}

          {lifecycleState === GOAL_LIFECYCLE_STATES.ARCHIVED && (
            <TouchableOpacity
              style={[styles.lifecycleActionBtn, styles.restoreBtn]}
              onPress={handleArchiveToggle}
            >
              <Text style={styles.restoreBtnText}>🔄 RESTORE GOAL</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── STANDARD ACTIONS ── */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push(`/grind/add-goal?editId=${goal.id}` as any)}
        >
          <Text style={styles.buttonText}>EDIT GOAL</Text>
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
  titleSection: {
    marginBottom: 16,
  },
  goalTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 32,
    letterSpacing: 1,
    marginBottom: 6,
  },
  lifecycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lifecyclePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: colors.surface,
    borderColor: colors.income,
  },
  pillPaused: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
  },
  pillCompleted: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.income,
  },
  pillArchived: {
    backgroundColor: colors.surface,
    borderColor: colors.textMuted,
  },
  lifecyclePillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 0.8,
  },
  lifecycleMetaText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
  },
  targetCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 16,
    marginBottom: 16,
  },
  targetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  targetLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  streakPill: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  streakPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  targetFraction: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  targetMetText: {
    color: colors.income,
  },
  targetValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 10,
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
  },
  progressBarFillMet: {
    backgroundColor: colors.income,
  },
  progressPercentText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  checkinSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  checkInBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radii.xs,
    borderWidth: 1.5,
  },
  doneBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.income,
  },
  doneBtnActive: {
    backgroundColor: colors.income,
  },
  notDoneBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  notDoneBtnActive: {
    backgroundColor: colors.border,
  },
  checkBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  doneBtnText: {
    color: colors.income,
  },
  notDoneBtnText: {
    color: colors.textMuted,
  },
  btnTextActive: {
    color: colors.background,
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
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  qtyField: {
    width: 64,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xs,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  qtyUnitLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  sectionBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: 14,
    marginBottom: 16,
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: 4,
  },
  historyList: {
    gap: 8,
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  historyDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  badgeDone: {
    backgroundColor: colors.incomeCard,
  },
  badgeNotDone: {
    backgroundColor: colors.surface,
  },
  historyStatusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  textDone: {
    color: colors.income,
  },
  textNotDone: {
    color: colors.textMuted,
  },
  emptyHistoryText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Lifecycle Card & Buttons
  lifecycleSectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  lifecycleBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  lifecycleActionBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.xs,
  },
  pauseBtn: {
    borderColor: colors.warning,
  },
  pauseBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.warning,
    letterSpacing: 0.8,
  },
  resumeBtn: {
    borderColor: colors.income,
  },
  resumeBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.income,
    letterSpacing: 0.8,
  },
  completeBtn: {
    borderColor: colors.income,
  },
  completeBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.income,
    letterSpacing: 0.8,
  },
  archiveBtn: {
    borderColor: colors.borderAccent,
  },
  archiveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  restoreBtn: {
    borderColor: colors.primary,
  },
  restoreBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primaryBright,
    letterSpacing: 0.8,
  },

  // Actions
  actionsContainer: {
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radii.xs,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderColor: colors.danger,
  },
  buttonTextDanger: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.danger,
    letterSpacing: 1,
  },

  // Pause Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.warning,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.warning,
    letterSpacing: 1,
    marginBottom: 2,
  },
  modalSub: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 14,
  },
  modalReasonHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  reasonOption: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  reasonOptionActive: {
    borderColor: colors.warning,
    backgroundColor: colors.cardElevated,
  },
  reasonOptionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  reasonOptionTextActive: {
    color: colors.warning,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderColor: colors.warning,
    borderWidth: 1.5,
    borderRadius: radii.xs,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.warning,
    letterSpacing: 0.8,
  },
});
