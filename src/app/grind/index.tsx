import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import { showAlert } from '../../lib/dialog';
import { loadCommandCenterData } from '../../lib/grindCommandCenter';
import { upsertCheckin, deleteCheckin, getTodayDateString } from '../../lib/grindCheckins';
import { MISSION_STATES } from '../../lib/grindToday';
import BudgetCharacter from '../../components/BudgetCharacter';
import NavigationDrawer from '../../components/NavigationDrawer';
import WeeklyReviewModal from '../../components/WeeklyReviewModal';
import AchievementUnlockModal from '../../components/AchievementUnlockModal';

export default function GrindCommandCenter() {
  const auth: any = useAuth();
  const session = auth?.session;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Command Center aggregated context
  const [data, setData] = useState<any>(null);
  const [newlyUnlockedAchievement, setNewlyUnlockedAchievement] = useState<any>(null);

  // Inline checkin feedback toast
  const [feedbackToast, setFeedbackToast] = useState<{ id: string; message: string } | null>(null);

  // Quantity checkin modal state
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [quantityGoal, setQuantityGoal] = useState<any>(null);
  const [quantityInput, setQuantityInput] = useState('1');

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const ccData: any = await loadCommandCenterData(session.user.id);
      setData(ccData);
      if (ccData && ccData.newlyUnlockedAchievement) {
        setNewlyUnlockedAchievement(ccData.newlyUnlockedAchievement);
      }
    } catch (err) {
      console.warn('[GrindCommandCenter] loadData failed', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ── Handle Daily Check-in Directly From Command Center ─────────
  const handleCheckin = async (mission: any) => {
    if (!session || !mission) return;

    if (mission.goalType === 'quantity') {
      setQuantityGoal(mission.goal);
      setQuantityInput('1');
      setQuantityModalVisible(true);
      return;
    }

    try {
      const isAlreadyDone = mission.isDoneToday;

      if (isAlreadyDone) {
        // Toggle off if already checked in today
        const chk = data?.todayCheckins?.find((c: any) => c.goal_id === mission.goalId && c.status === 'done');
        if (chk) {
          await deleteCheckin(session.user.id, chk.id);
          setFeedbackToast({ id: mission.goalId, message: 'Check-in removed' });
        }
      } else {
        await upsertCheckin(session.user.id, mission.goalId, getTodayDateString(), {
          status: 'done',
          value_count: 1,
        });

        const newCount = mission.completedCount + 1;
        const isNowComplete = newCount >= mission.targetCount;

        setFeedbackToast({
          id: mission.goalId,
          message: isNowComplete ? '★ GOAL TARGET MET!' : '+1 SESSION • KEEP GOING',
        });
      }

      setTimeout(() => setFeedbackToast(null), 3000);
      await loadData();
    } catch (err) {
      console.warn('[GrindCommandCenter] checkin error', err);
      showAlert('CHECK-IN FAILED', 'Could not record check-in. Please try again.');
    }
  };

  const handleSaveQuantityCheckin = async () => {
    if (!session || !quantityGoal) return;
    const val = parseFloat(quantityInput);
    if (isNaN(val) || val <= 0) {
      showAlert('INVALID QUANTITY', 'Please enter a valid number greater than 0.');
      return;
    }

    try {
      await upsertCheckin(session.user.id, quantityGoal.id, getTodayDateString(), {
        status: 'done',
        value_count: val,
      });
      setQuantityModalVisible(false);
      setFeedbackToast({
        id: quantityGoal.id,
        message: `+${val} ${quantityGoal.targetUnit || 'units'} logged!`,
      });
      setTimeout(() => setFeedbackToast(null), 3000);
      await loadData();
    } catch (err) {
      console.warn('[GrindCommandCenter] quantity checkin error', err);
      showAlert('CHECK-IN FAILED', 'Could not record quantity. Please try again.');
    }
  };

  const formattedDate = useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const month = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    return `${weekday} • ${month}`;
  }, []);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const missions: any[] = data?.missions || [];
  const primaryMissions = missions.slice(0, 5);
  const remainingMissionsCount = Math.max(0, missions.length - 5);
  const smartOneThing = data?.smartOneThing;
  const weeklySummary = data?.weeklySummary;
  const weeklyStatus = data?.weeklyStatus;
  const briefing = data?.briefing;
  const streak = data?.streak || 0;
  const openCourtCases = data?.openCourtCases || [];
  const topInsight = data?.topInsight;
  const personalRecords = data?.personalRecords;
  const isWeekLocked = Boolean(data?.weekIntention?.locked);

  return (
    <View style={styles.wrapper}>
      {/* Navigation Drawer */}
      <NavigationDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/grind"
      />

      {/* Weekly Review Modal */}
      {weeklySummary && (
        <WeeklyReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          weeklySummary={weeklySummary}
          currentStreak={streak}
          reaction={briefing}
          weekLabel="THIS WEEK"
          hasCourtPattern={openCourtCases.length > 0}
          topInsight={topInsight}
        />
      )}

      {/* Achievement Unlock Modal */}
      <AchievementUnlockModal
        visible={Boolean(newlyUnlockedAchievement)}
        onClose={() => setNewlyUnlockedAchievement(null)}
        achievement={newlyUnlockedAchievement}
      />

      {/* Quantity Check-in Modal */}
      <Modal
        visible={quantityModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQuantityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>LOG QUANTITY</Text>
            <Text style={styles.modalSub}>{quantityGoal?.title}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={quantityInput}
              onChangeText={setQuantityInput}
              placeholder="e.g. 10"
              placeholderTextColor={colors.textMuted}
              autoFocus={true}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setQuantityModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveQuantityCheckin}
              >
                <Text style={styles.modalConfirmBtnText}>LOG PROGRESS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => setDrawerVisible(true)}
            accessibilityLabel="Open navigation menu"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.menuIconBox}>
              <View style={styles.menuLine} />
              <View style={[styles.menuLine, { width: 14 }]} />
              <View style={styles.menuLine} />
            </View>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerDate}>{formattedDate}</Text>
            <Text style={styles.headerTitle}>THE GRIND</Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.streakPill}>
              <Text style={styles.streakPillText}>🔥 {streak}D</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/grind/add-goal' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── COURT ALERT (IF OPEN CASE) ── */}
        {openCourtCases.length > 0 && (
          <TouchableOpacity
            style={styles.courtAlertBanner}
            onPress={() => router.push('/grind/court' as any)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.courtAlertTitle}>⚖ HABIT ON TRIAL</Text>
              <Text style={styles.courtAlertSub} numberOfLines={1}>
                {openCourtCases[0].goalTitle}: {openCourtCases[0].trigger?.replace(/_/g, ' ')}
              </Text>
            </View>
            <View style={styles.courtAlertPill}>
              <Text style={styles.courtAlertPillText}>ENTER COURT →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── CHARACTER DAILY BRIEFING ── */}
        {briefing && (
          <View style={styles.briefingCard}>
            <BudgetCharacter
              assetId={briefing.assetId}
              animationType={briefing.animationType as any}
              size="small"
              animated={true}
            />
            <View style={styles.briefingBody}>
              <Text style={styles.briefingSpeaker}>{briefing.speaker}:</Text>
              <Text style={styles.briefingQuote}>“{briefing.quote}”</Text>
              <Text style={styles.briefingSubtext}>{briefing.subtext}</Text>
            </View>
            {briefing.actionRoute && (
              <TouchableOpacity
                style={styles.briefingActionBtn}
                onPress={() => router.push(briefing.actionRoute as any)}
              >
                <Text style={styles.briefingActionBtnText}>{briefing.actionLabel || 'VIEW'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── SMART "ONE THING" MOVE (IF AT RISK) ── */}
        {smartOneThing && smartOneThing.state === MISSION_STATES.AT_RISK && (
          <View style={styles.smartMoveBox}>
            <View style={styles.smartMoveHeader}>
              <Text style={styles.smartMoveTag}>⚡ PRIORITY MOVE</Text>
              <Text style={styles.smartMoveSub}>ONE ACTION GETS YOU BACK ON TRACK</Text>
            </View>
            <View style={styles.smartMoveRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.smartMoveTitle}>{smartOneThing.title}</Text>
                <Text style={styles.smartMoveFraction}>
                  {smartOneThing.completedCount} / {smartOneThing.targetCount}{' '}
                  {smartOneThing.goalType === 'quantity' ? smartOneThing.targetUnit : 'sessions'} • {smartOneThing.progress.percent}%
                </Text>
              </View>
              <TouchableOpacity
                style={styles.smartMoveCheckinBtn}
                onPress={() => handleCheckin(smartOneThing)}
                activeOpacity={0.8}
              >
                <Text style={styles.smartMoveCheckinBtnText}>
                  {smartOneThing.isDoneToday ? 'CHECKED IN ✓' : '✓ CHECK IN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TODAY'S MISSION SECTION ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>TODAY'S MISSION</Text>
          <Text style={styles.missionFractionText}>
            {missions.filter((m) => m.isDoneToday || m.isDoneForWeek).length} / {missions.length} RESOLVED
          </Text>
        </View>

        {missions.length === 0 ? (
          /* ── NO GOALS EMPTY STATE ── */
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>NO ACTIVE MISSIONS</Text>
            <Text style={styles.emptyBody}>
              You don't have any Grind goals set up yet. Make the first move and set your targets.
            </Text>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/grind/add-goal' as any)}
            >
              <Text style={styles.primaryActionBtnText}>+ CREATE FIRST GOAL</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.missionsList}>
            {primaryMissions.map((mission) => {
              const isFeedbackActive = feedbackToast?.id === mission.goalId;

              return (
                <View
                  key={mission.goalId}
                  style={[
                    styles.missionCard,
                    mission.state === MISSION_STATES.AT_RISK && styles.missionCardAtRisk,
                    mission.state === MISSION_STATES.DONE_FOR_WEEK && styles.missionCardDone,
                  ]}
                >
                  <View style={styles.missionCardTop}>
                    <View style={styles.missionTitleWrap}>
                      <Text style={[styles.missionTitle, mission.isDoneForWeek && styles.missionTitleDone]}>
                        {mission.title}
                      </Text>
                      <Text style={styles.missionTodayAction}>{mission.todayActionLabel}</Text>
                    </View>

                    {/* State Badge */}
                    <View
                      style={[
                        styles.stateBadge,
                        mission.state === MISSION_STATES.AT_RISK && styles.stateBadgeAtRisk,
                        mission.state === MISSION_STATES.DONE_FOR_WEEK && styles.stateBadgeDone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stateBadgeText,
                          mission.state === MISSION_STATES.AT_RISK && styles.stateBadgeTextAtRisk,
                          mission.state === MISSION_STATES.DONE_FOR_WEEK && styles.stateBadgeTextDone,
                        ]}
                      >
                        {mission.state.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Line */}
                  <View style={styles.progressLine}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(100, mission.progress.percent)}%` },
                          mission.isDoneForWeek && styles.progressBarFillDone,
                          mission.state === MISSION_STATES.AT_RISK && styles.progressBarFillAtRisk,
                        ]}
                      />
                    </View>
                    <Text style={styles.progressFraction}>
                      {mission.completedCount} / {mission.targetCount}{' '}
                      {mission.goalType === 'quantity' ? mission.targetUnit : ''} ({mission.progress.percent}%)
                    </Text>
                  </View>

                  {/* Action & Feedback Row */}
                  <View style={styles.missionActionRow}>
                    {isFeedbackActive && feedbackToast ? (
                      <View style={styles.feedbackBox}>
                        <Text style={styles.feedbackText}>{feedbackToast.message}</Text>
                      </View>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}

                    <TouchableOpacity
                      style={[
                        styles.checkinBtn,
                        mission.isDoneToday && styles.checkinBtnDone,
                        mission.isDoneForWeek && styles.checkinBtnComplete,
                      ]}
                      onPress={() => handleCheckin(mission)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.checkinBtnText,
                          mission.isDoneToday && styles.checkinBtnTextDone,
                          mission.isDoneForWeek && styles.checkinBtnTextComplete,
                        ]}
                      >
                        {mission.isDoneForWeek
                          ? 'TARGET MET ★'
                          : mission.isDoneToday
                          ? 'DONE TODAY ✓'
                          : mission.goalType === 'quantity'
                          ? '+ LOG PROGRESS'
                          : '✓ CHECK IN'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {remainingMissionsCount > 0 && (
              <TouchableOpacity
                style={styles.moreMissionsBtn}
                onPress={() => router.push('/grind/week' as any)}
              >
                <Text style={styles.moreMissionsBtnText}>
                  + {remainingMissionsCount} MORE GOALS IN THIS WEEK →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── WEEK PROGRESS STRIP ── */}
        {weeklySummary && (
          <View style={styles.weekStripCard}>
            <View style={styles.weekStripHeader}>
              <View>
                <Text style={styles.weekStripTitle}>THIS WEEK STATUS</Text>
                <Text style={styles.weekStripSub}>
                  {weeklySummary.goalsMetCount} / {weeklySummary.totalGoals} COMMITMENTS MET • {data?.daysRemainingInWeek}D LEFT
                </Text>
              </View>
              <View
                style={[
                  styles.weekStatusPill,
                  weeklyStatus === 'ON TRACK' && styles.weekStatusPillTrack,
                  weeklyStatus === 'CATCH UP' && styles.weekStatusPillCatch,
                  weeklyStatus === 'WEEK COMPLETE' && styles.weekStatusPillComplete,
                ]}
              >
                <Text style={styles.weekStatusPillText}>{weeklyStatus}</Text>
              </View>
            </View>

            <View style={styles.weekProgressBarBg}>
              <View
                style={[
                  styles.weekProgressBarFill,
                  { width: `${weeklySummary.grindScorePercent}%` },
                  weeklySummary.grindScorePercent >= 80 && styles.weekProgressBarFillHigh,
                ]}
              />
            </View>

            <View style={styles.weekStripFooter}>
              <Text style={styles.weekScoreText}>
                SCORE: <Text style={{ color: colors.primaryBright }}>{weeklySummary.grindScorePercent}%</Text>
              </Text>
              <TouchableOpacity onPress={() => router.push('/grind/week' as any)}>
                <Text style={styles.weekStripLink}>
                  {isWeekLocked ? 'VIEW COMMITMENTS →' : 'LOCK IN WEEK →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TOP BEHAVIORAL INSIGHT (IF AVAILABLE) ── */}
        {topInsight && (
          <TouchableOpacity
            style={styles.insightBanner}
            onPress={() => router.push('/grind/insights' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.insightHeader}>
              <Text style={styles.insightTag}>📈 BEHAVIORAL PATTERN</Text>
              <Text style={styles.insightConfidence}>{topInsight.confidence} CONFIDENCE</Text>
            </View>
            <Text style={styles.insightTitle}>{topInsight.title}</Text>
            <Text style={styles.insightDesc} numberOfLines={2}>{topInsight.description}</Text>
          </TouchableOpacity>
        )}

        {/* ── YOUR RECORD SUMMARY ── */}
        {personalRecords && (
          <View style={styles.recordSection}>
            <View style={styles.recordHeaderRow}>
              <Text style={styles.recordSectionTitle}>YOUR RECORD</Text>
              <TouchableOpacity onPress={() => router.push('/grind/achievements' as any)}>
                <Text style={styles.recordLinkText}>VIEW WALL →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recordsGrid}>
              <View style={styles.recordBox}>
                <Text style={styles.recordLabel}>CURRENT STREAK</Text>
                <Text style={[styles.recordVal, { color: colors.warning }]}>🔥 {streak}D</Text>
              </View>
              <View style={styles.recordDivider} />
              <View style={styles.recordBox}>
                <Text style={styles.recordLabel}>TOTAL CHECK-INS</Text>
                <Text style={styles.recordVal}>{personalRecords.totalCheckins || 0}</Text>
              </View>
              <View style={styles.recordDivider} />
              <View style={styles.recordBox}>
                <Text style={styles.recordLabel}>ACHIEVEMENTS</Text>
                <Text style={[styles.recordVal, { color: colors.primaryBright }]}>
                  🏆 {data?.unlockedAchievementsCount || 0}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── WAR ROOM NOTES QUICK STRIP ── */}
        <TouchableOpacity
          style={styles.quickNoteStrip}
          onPress={() => router.push('/grind/notes' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.quickNoteIcon}>📝</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickNoteTitle}>WAR ROOM NOTES</Text>
            <Text style={styles.quickNoteSub} numberOfLines={1}>
              {data?.recentNote?.title || 'Dump thoughts, strategies, and convert to goals'}
            </Text>
          </View>
          <Text style={styles.quickNoteAction}>OPEN →</Text>
        </TouchableOpacity>

        {/* ── UNIFIED TOOLS DOCK ── */}
        <Text style={styles.toolsHeading}>GRIND COMMAND DOCK</Text>
        <View style={styles.toolsDockGrid}>
          <TouchableOpacity
            style={styles.dockButton}
            onPress={() => router.push('/grind/week' as any)}
          >
            <Text style={styles.dockIcon}>🔒</Text>
            <Text style={styles.dockLabel}>THIS WEEK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockButton}
            onPress={() => router.push('/grind/receipt' as any)}
          >
            <Text style={styles.dockIcon}>🧾</Text>
            <Text style={styles.dockLabel}>RECEIPTS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockButton}
            onPress={() => router.push('/grind/reflection' as any)}
          >
            <Text style={styles.dockIcon}>💭</Text>
            <Text style={styles.dockLabel}>REFLECTION</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockButton}
            onPress={() => router.push('/grind/court' as any)}
          >
            <Text style={styles.dockIcon}>⚖</Text>
            <Text style={styles.dockLabel}>COURT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockButton}
            onPress={() => router.push('/grind/insights' as any)}
          >
            <Text style={styles.dockIcon}>📈</Text>
            <Text style={styles.dockLabel}>PATTERNS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockButton}
            onPress={() => router.push('/grind/timeline' as any)}
          >
            <Text style={styles.dockIcon}>⏳</Text>
            <Text style={styles.dockLabel}>JOURNEY</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockButton}
            onPress={() => router.push('/grind/achievements' as any)}
          >
            <Text style={styles.dockIcon}>🏆</Text>
            <Text style={styles.dockLabel}>RECORD</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
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
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 48,
    maxWidth: 580,
    alignSelf: 'center',
    width: '100%',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    padding: 4,
  },
  menuIconBox: {
    gap: 4,
    padding: 2,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerDate: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    lineHeight: 26,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakPill: {
    backgroundColor: colors.card,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  streakPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.warning,
  },
  addBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1,
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.primaryBright,
    lineHeight: 18,
  },

  // Court alert banner
  courtAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  courtAlertTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.warning,
    letterSpacing: 1,
    marginBottom: 2,
  },
  courtAlertSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  courtAlertPill: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  courtAlertPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.warning,
    letterSpacing: 0.5,
  },

  // Character Briefing Card
  briefingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  briefingBody: {
    flex: 1,
  },
  briefingSpeaker: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 1,
  },
  briefingQuote: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.primaryBright,
    letterSpacing: 0.5,
    lineHeight: 18,
    marginBottom: 2,
  },
  briefingSubtext: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  briefingActionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.xs,
  },
  briefingActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },

  // Smart "One Thing" Box
  smartMoveBox: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
  },
  smartMoveHeader: {
    marginBottom: 6,
  },
  smartMoveTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.warning,
    letterSpacing: 1,
  },
  smartMoveSub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  smartMoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  smartMoveTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  smartMoveFraction: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  smartMoveCheckinBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.warning,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.xs,
  },
  smartMoveCheckinBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.warning,
    letterSpacing: 0.5,
  },

  // Mission Section
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  missionFractionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1,
  },
  missionsList: {
    gap: 8,
    marginBottom: 16,
  },
  missionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
  },
  missionCardAtRisk: {
    borderColor: colors.warning,
    backgroundColor: colors.surface,
  },
  missionCardDone: {
    borderColor: colors.incomeBorder,
    backgroundColor: colors.incomeCard,
    opacity: 0.85,
  },
  missionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  missionTitleWrap: {
    flex: 1,
  },
  missionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  missionTitleDone: {
    color: colors.income,
  },
  missionTodayAction: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  stateBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  stateBadgeAtRisk: {
    borderColor: colors.warning,
  },
  stateBadgeDone: {
    borderColor: colors.income,
  },
  stateBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  stateBadgeTextAtRisk: {
    color: colors.warning,
  },
  stateBadgeTextDone: {
    color: colors.income,
  },
  progressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressBarFillDone: {
    backgroundColor: colors.income,
  },
  progressBarFillAtRisk: {
    backgroundColor: colors.warning,
  },
  progressFraction: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  missionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackBox: {
    flex: 1,
  },
  feedbackText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.income,
    letterSpacing: 0.5,
  },
  checkinBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.xs,
  },
  checkinBtnDone: {
    borderColor: colors.income,
    backgroundColor: colors.surface,
  },
  checkinBtnComplete: {
    borderColor: colors.income,
    backgroundColor: colors.incomeCard,
  },
  checkinBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primaryBright,
    letterSpacing: 0.8,
  },
  checkinBtnTextDone: {
    color: colors.income,
  },
  checkinBtnTextComplete: {
    color: colors.income,
  },
  moreMissionsBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  moreMissionsBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
  },

  // Week Progress Strip
  weekStripCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 14,
    marginBottom: 16,
  },
  weekStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekStripTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  weekStripSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  weekStatusPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  weekStatusPillTrack: {
    borderColor: colors.income,
  },
  weekStatusPillCatch: {
    borderColor: colors.warning,
  },
  weekStatusPillComplete: {
    borderColor: colors.primary,
  },
  weekStatusPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  weekProgressBarBg: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  weekProgressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  weekProgressBarFillHigh: {
    backgroundColor: colors.income,
  },
  weekStripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekScoreText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  weekStripLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.8,
  },

  // Behavioral Insight Card
  insightBanner: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  insightConfidence: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  insightTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  insightDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },

  // Records Section
  recordSection: {
    marginBottom: 16,
  },
  recordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  recordSectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  recordLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  recordsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  recordBox: {
    flex: 1,
    alignItems: 'center',
  },
  recordLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  recordVal: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
  },
  recordDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // Quick War Room Note Strip
  quickNoteStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 18,
    gap: 10,
  },
  quickNoteIcon: {
    fontSize: 16,
  },
  quickNoteTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  quickNoteSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
  },
  quickNoteAction: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // Tools Dock
  toolsHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  toolsDockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dockButton: {
    width: '31.5%',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dockIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  dockLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },

  // Empty state
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  primaryActionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.xs,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primaryBright,
    letterSpacing: 1,
  },

  // Quantity modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  modalSub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    padding: 12,
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.xs,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
});
