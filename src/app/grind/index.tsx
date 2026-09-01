import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import { getGrindGoals } from '../../lib/grindStore';
import {
  getCheckins,
  getWeekCheckins,
  getAllUserCheckins,
  upsertCheckin,
  getTodayDateString,
  getStartOfWeekDateString,
  getOffsetWeekStartDateString,
} from '../../lib/grindCheckins';
import { getWeekIntention } from '../../lib/grindWeek';
import {
  evaluateAndSyncAchievements,
  getUserUnlockedAchievements,
  calculatePersonalRecords,
} from '../../lib/grindAchievements';
import {
  evaluateAndDetectCourtCases,
  getOpenCourtCases,
} from '../../lib/grindCourt';
import {
  calculateWeeklyProgress,
  calculateDailyCompletion,
  calculateDailyStreak,
  calculateGoalProgress,
  calculateWeeklyTrend,
} from '../../lib/grindStreaks';
import {
  resolveGrindReaction,
  resolveWeeklyReviewReaction,
  markDailyReviewShown,
} from '../../lib/grindReactions';
import BudgetCharacter from '../../components/BudgetCharacter';
import NavigationDrawer from '../../components/NavigationDrawer';
import DailyCheckInCard from '../../components/DailyCheckInCard';
import WeeklySummaryCard from '../../components/WeeklySummaryCard';
import WeeklyReviewModal from '../../components/WeeklyReviewModal';
import AchievementUnlockModal from '../../components/AchievementUnlockModal';

export default function GrindDashboard() {
  const auth: any = useAuth();
  const session = auth?.session;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newlyUnlockedAchievement, setNewlyUnlockedAchievement] = useState<any>(null);
  const [openCourtCases, setOpenCourtCases] = useState<any[]>([]);

  // Week offset: 0 = current week, -1 = last week, etc. (cannot go > 0)
  const [weekOffset, setWeekOffset] = useState(0);

  const [goals, setGoals] = useState<any[]>([]);
  const [todayCheckins, setTodayCheckins] = useState<any[]>([]);
  const [selectedWeekCheckins, setSelectedWeekCheckins] = useState<any[]>([]);
  const [priorWeekCheckins, setPriorWeekCheckins] = useState<any[]>([]);
  const [allUserCheckinsList, setAllUserCheckinsList] = useState<any[]>([]);
  const [selectedWeekIntention, setSelectedWeekIntention] = useState<any>(null);
  const [unlockedAchievementsCount, setUnlockedAchievementsCount] = useState<number>(0);
  const [personalRecords, setPersonalRecords] = useState<any>({
    bestStreak: 0,
    totalCheckins: 0,
    totalGoalsCompleted: 0,
  });
  const [loading, setLoading] = useState(true);

  const todayStr = useMemo(() => getTodayDateString(), []);
  const currentWeekStartStr = useMemo(() => getStartOfWeekDateString(), []);
  const selectedWeekStartStr = useMemo(
    () => getOffsetWeekStartDateString(currentWeekStartStr, weekOffset),
    [currentWeekStartStr, weekOffset]
  );
  const priorWeekStartStr = useMemo(
    () => getOffsetWeekStartDateString(selectedWeekStartStr, -1),
    [selectedWeekStartStr]
  );

  const isCurrentWeek = weekOffset === 0;

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Evaluate new achievements & court cases
      const newlyEarned = await evaluateAndSyncAchievements(session.user.id);
      if (newlyEarned.length > 0) {
        setNewlyUnlockedAchievement(newlyEarned[0]);
      }

      await evaluateAndDetectCourtCases(session.user.id);
      const courtCases = await getOpenCourtCases(session.user.id);
      setOpenCourtCases(courtCases);

      const [allGoals, tCheckins, selWeekCheckins, pWeekCheckins, allCheckins, weekIntention, unlocked] = await Promise.all([
        getGrindGoals(session.user.id),
        getCheckins(session.user.id, todayStr),
        getWeekCheckins(session.user.id, selectedWeekStartStr),
        getWeekCheckins(session.user.id, priorWeekStartStr),
        getAllUserCheckins(session.user.id),
        getWeekIntention(session.user.id, selectedWeekStartStr),
        getUserUnlockedAchievements(session.user.id),
      ]);

      const active = allGoals.filter((g: any) => !g.isArchived);
      setGoals(active);
      setTodayCheckins(tCheckins);
      setSelectedWeekCheckins(selWeekCheckins);
      setPriorWeekCheckins(pWeekCheckins);
      setAllUserCheckinsList(allCheckins);
      setSelectedWeekIntention(weekIntention);
      setUnlockedAchievementsCount(unlocked.length);

      const curStreak = calculateDailyStreak(allCheckins);
      const records = calculatePersonalRecords(allGoals, allCheckins, weekIntention ? [weekIntention] : [], curStreak);
      setPersonalRecords(records);
    } catch (err) {
      console.warn('[GrindDashboard] loadData failed', err);
    } finally {
      setLoading(false);
    }
  }, [session, todayStr, selectedWeekStartStr, priorWeekStartStr]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ── Calculations ───────────────────────────────────────────────
  const weeklySummary: any = useMemo(
    () => calculateWeeklyProgress(goals, selectedWeekCheckins, selectedWeekIntention),
    [goals, selectedWeekCheckins, selectedWeekIntention]
  );

  const priorWeekSummary: any = useMemo(
    () => calculateWeeklyProgress(goals, priorWeekCheckins),
    [goals, priorWeekCheckins]
  );

  const dailySummary: any = useMemo(
    () => calculateDailyCompletion(goals, todayCheckins),
    [goals, todayCheckins]
  );

  const currentStreak: number = useMemo(
    () => calculateDailyStreak(allUserCheckinsList),
    [allUserCheckinsList]
  );

  const weeklyTrend: any[] = useMemo(
    () => calculateWeeklyTrend(goals, allUserCheckinsList, currentWeekStartStr, 4),
    [goals, allUserCheckinsList, currentWeekStartStr]
  );

  const dailyReaction: any = useMemo(() => {
    return resolveGrindReaction({
      totalTodayGoals: dailySummary.totalTodayGoals,
      completedTodayCount: dailySummary.completedTodayCount,
      notDoneTodayCount: dailySummary.notDoneTodayCount,
      streak: currentStreak,
    });
  }, [dailySummary, currentStreak]);

  const weeklyReviewReaction: any = useMemo(() => {
    return resolveWeeklyReviewReaction(
      session?.user?.id || '',
      selectedWeekStartStr,
      weeklySummary.tier?.key || 'SOLID',
      weeklySummary.grindScorePercent || 0
    );
  }, [session, selectedWeekStartStr, weeklySummary]);

  // ── Handle Check-In Actions ─────────────────────────────────────
  const handleCheckIn = async (goalId: string, status: 'done' | 'not_done', valueCount: number = 1) => {
    if (!session || !isCurrentWeek) return;

    const newRecord = {
      goal_id: goalId,
      user_id: session.user.id,
      checkin_date: todayStr,
      status,
      value_count: valueCount,
    };

    setTodayCheckins((prev) => [...prev.filter((c) => c.goal_id !== goalId), newRecord]);
    setSelectedWeekCheckins((prev) => [
      ...prev.filter((c) => !(c.goal_id === goalId && c.checkin_date === todayStr)),
      newRecord,
    ]);
    setAllUserCheckinsList((prev) => [
      ...prev.filter((c) => !(c.goal_id === goalId && c.checkin_date === todayStr)),
      newRecord,
    ]);

    try {
      await upsertCheckin(session.user.id, goalId, todayStr, {
        status,
        value_count: valueCount,
      });
      await markDailyReviewShown(session.user.id, todayStr);
    } catch (err) {
      console.warn('[GrindDashboard] upsertCheckin failed', err);
      loadData();
    }
  };

  const formatWeekRangeLabel = (startStr: string) => {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startLabel} - ${endLabel}`;
  };

  return (
    <View style={styles.wrapper}>
      {/* Navigation Drawer */}
      <NavigationDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/grind"
      />

      {/* Weekly Review Modal */}
      <WeeklyReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        weeklySummary={weeklySummary}
        currentStreak={currentStreak}
        reaction={weeklyReviewReaction}
        weekLabel={isCurrentWeek ? 'CURRENT WEEK' : formatWeekRangeLabel(selectedWeekStartStr)}
      />

      {/* Achievement Unlock Modal */}
      <AchievementUnlockModal
        visible={Boolean(newlyUnlockedAchievement)}
        onClose={() => setNewlyUnlockedAchievement(null)}
        achievement={newlyUnlockedAchievement}
      />

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
            <Text style={styles.hamburger}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.appTitle}>
              THE <Text style={styles.appTitleAccent}>GRIND</Text>
            </Text>
            <Text style={styles.modeLabel}>BOONDOCKS MODE</Text>
          </View>
          <TouchableOpacity
            style={styles.headerRight}
            onPress={() => router.push('/')}
            accessibilityLabel="Return to Financial Dashboard"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.headerIcon}>🏠</Text>
          </TouchableOpacity>
        </View>

        {/* ── WEEK SELECTOR / SWITCHER BAR ── */}
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
              {isCurrentWeek ? 'THIS WEEK' : 'PREVIOUS WEEK'}
            </Text>
            <Text style={styles.weekSelectorRange}>
              {formatWeekRangeLabel(selectedWeekStartStr)}
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

        {/* ── THIS WEEK INTENTION / LOCK-IN BANNER ── */}
        {isCurrentWeek && (
          selectedWeekIntention?.locked ? (
            <TouchableOpacity
              style={styles.intentionBannerLocked}
              onPress={() => router.push('/grind/week' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.intentionBannerLeft}>
                <Text style={styles.intentionTitleLocked}>🔒 THIS WEEK LOCKED IN</Text>
                <Text style={styles.intentionSubLocked}>
                  {weeklySummary.goalsMetCount} / {weeklySummary.totalGoals} commitments met ({weeklySummary.grindScorePercent}%)
                </Text>
              </View>
              <View style={styles.intentionActionPillLocked}>
                <Text style={styles.intentionActionTextLocked}>VIEW WEEK →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.intentionBannerUnlocked}
              onPress={() => router.push('/grind/week' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.intentionBannerLeft}>
                <Text style={styles.intentionTitleUnlocked}>⚡ THIS WEEK UNLOCKED</Text>
                <Text style={styles.intentionSubUnlocked}>
                  Choose and lock in what you're getting done this week.
                </Text>
              </View>
              <View style={styles.intentionActionPillUnlocked}>
                <Text style={styles.intentionActionTextUnlocked}>LOCK IN →</Text>
              </View>
            </TouchableOpacity>
          )
        )}

        {/* ── CHARACTER COURT ALERT (IF OPEN CASE EXISTS) ── */}
        {openCourtCases.length > 0 && (
          <TouchableOpacity
            style={styles.courtAlertBanner}
            onPress={() => router.push('/grind/court' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.courtAlertLeft}>
              <Text style={styles.courtAlertTitle}>⚖ CHARACTER COURT IN SESSION</Text>
              <Text style={styles.courtAlertSub} numberOfLines={1}>
                {openCourtCases[0].character?.toUpperCase() || 'RILEY'} WANTS TO TALK: Pattern on "{openCourtCases[0].goalTitle}".
              </Text>
            </View>
            <View style={styles.courtAlertPill}>
              <Text style={styles.courtAlertPillText}>ENTER COURT →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── WEEKLY SUMMARY CARD (PROMINENT) ── */}
        <WeeklySummaryCard
          weeklySummary={weeklySummary}
          currentStreak={currentStreak}
          onPressReview={() => setReviewModalVisible(true)}
          previousWeekScore={priorWeekCheckins.length > 0 ? priorWeekSummary.grindScorePercent : null}
        />

        {/* ── BOONDOCKS MOTIVATION BANNER (CURRENT WEEK ONLY) ── */}
        {isCurrentWeek && (
          <View style={styles.characterBanner}>
            <BudgetCharacter
              assetId={dailyReaction.assetId}
              animationType={dailyReaction.animationType as any}
              size="small"
              animated={true}
            />
            <View style={styles.dialogueBox}>
              <Text style={styles.dialogueTitle}>{dailyReaction.title}</Text>
              <Text style={styles.dialogueQuote}>{dailyReaction.quote}</Text>
              <Text style={styles.dialogueSub}>{dailyReaction.subtext}</Text>
            </View>
          </View>
        )}

        {/* ── TODAY'S CHECK-IN SECTION (CURRENT WEEK) ── */}
        {isCurrentWeek ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>TODAY'S CHECK-IN</Text>
                <Text style={styles.todayDate}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                  {' • '}
                  <Text style={{ color: colors.primary }}>
                    {dailySummary.completedTodayCount} / {dailySummary.totalTodayGoals} COMPLETED
                  </Text>
                </Text>
              </View>
              {goals.length > 0 && (
                <Link href={'/grind/add-goal' as any} asChild>
                  <TouchableOpacity style={styles.headerAddBtn}>
                    <Text style={styles.headerAddBtnText}>+ NEW GOAL</Text>
                  </TouchableOpacity>
                </Link>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : goals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyTitle}>NO GOALS ACTIVE TODAY</Text>
                <Text style={styles.emptyBody}>
                  Set up your weekly commitments — gym, studying, discipline, reading.
                </Text>

                <Link href={'/grind/add-goal' as any} asChild>
                  <TouchableOpacity style={styles.primaryActionBtn}>
                    <Text style={styles.primaryActionBtnText}>+ ADD YOUR FIRST GOAL</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            ) : (
              <View style={styles.checkInList}>
                {goals.map((goal) => {
                  const checkin = todayCheckins.find((c) => c.goal_id === goal.id);
                  const progress: any = calculateGoalProgress(goal, selectedWeekCheckins);

                  return (
                    <DailyCheckInCard
                      key={goal.id}
                      goal={goal}
                      checkin={checkin}
                      weekProgress={progress}
                      onCheckIn={(status, valueCount) => handleCheckIn(goal.id, status, valueCount)}
                      onPressDetail={() => router.push(`/grind/goal/${goal.id}` as any)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.historyNoticeBox}>
            <Text style={styles.historyNoticeTitle}>HISTORICAL LOG (READ-ONLY)</Text>
            <Text style={styles.historyNoticeBody}>
              Viewing completed week of {formatWeekRangeLabel(selectedWeekStartStr)}.
            </Text>
          </View>
        )}

        {/* ── WEEKLY TARGETS BREAKDOWN ── */}
        {goals.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>WEEKLY TARGETS</Text>
              <Text style={styles.weekTag}>{weeklySummary.grindScorePercent}% OVERALL</Text>
            </View>

            <View style={styles.weeklyList}>
              {goals.map((goal) => {
                const progress: any = calculateGoalProgress(goal, selectedWeekCheckins);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={styles.weeklyItemRow}
                    onPress={() => router.push(`/grind/goal/${goal.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.weeklyItemHeader}>
                      <Text style={styles.weeklyItemTitle} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <Text style={styles.weeklyItemFraction}>
                        {progress.completedCount} / {progress.targetCount}{' '}
                        {goal.goalType === 'quantity' ? goal.targetUnit : 'times'}{' '}
                        {progress.isTargetMet ? '★' : ''}
                      </Text>
                    </View>
                    <View style={styles.weeklyProgressBarBg}>
                      <View
                        style={[
                          styles.weeklyProgressBarFill,
                          { width: `${progress.percent}%` },
                          progress.isTargetMet && styles.weeklyProgressBarFillMet,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 4-WEEK SCORE TREND ── */}
        {weeklyTrend.some((w) => w.hasData) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SCORE TREND</Text>
              <Text style={styles.weekTag}>4-WEEK HISTORY</Text>
            </View>

            <View style={styles.trendList}>
              {weeklyTrend.map((item, idx) => (
                <View key={idx} style={styles.trendRow}>
                  <Text style={[styles.trendLabel, item.isCurrent && styles.trendLabelCurrent]}>
                    {item.weekLabel}
                  </Text>
                  <View style={styles.trendBarTrack}>
                    <View
                      style={[
                        styles.trendBarFill,
                        {
                          width: `${item.score}%`,
                          backgroundColor:
                            item.score >= 90
                              ? colors.primaryBright
                              : item.score >= 75
                              ? colors.income
                              : item.score >= 50
                              ? colors.warning
                              : colors.danger,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.trendScoreText}>{item.score}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── YOUR RECORD SUMMARY ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>YOUR RECORD</Text>
            <TouchableOpacity onPress={() => router.push('/grind/achievements' as any)}>
              <Text style={styles.weekTag}>VIEW WALL →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recordsSummaryRow}>
            <View style={styles.recordSummaryBox}>
              <Text style={styles.recordSummaryLabel}>BEST STREAK</Text>
              <Text style={[styles.recordSummaryVal, { color: colors.warning }]}>
                🔥 {personalRecords.bestStreak || currentStreak}D
              </Text>
            </View>

            <View style={styles.recordSummaryDivider} />

            <View style={styles.recordSummaryBox}>
              <Text style={styles.recordSummaryLabel}>TOTAL CHECK-INS</Text>
              <Text style={styles.recordSummaryVal}>
                {personalRecords.totalCheckins || 0}
              </Text>
            </View>

            <View style={styles.recordSummaryDivider} />

            <View style={styles.recordSummaryBox}>
              <Text style={styles.recordSummaryLabel}>ACHIEVEMENTS</Text>
              <Text style={[styles.recordSummaryVal, { color: colors.primaryBright }]}>
                🏆 {unlockedAchievementsCount}
              </Text>
            </View>
          </View>
        </View>

        {/* ── GRIND TOOLBOX / HUB ── */}
        <Text style={styles.hubTitle}>GRIND TOOLBOX</Text>
        <View style={styles.hubGrid}>
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/grind/notes' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.hubCardIcon}>📝</Text>
            <Text style={styles.hubCardTitle}>WAR ROOM NOTES</Text>
            <Text style={[styles.hubCardBadge, { color: colors.primaryBright }]}>ACTIVE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/grind/achievements' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.hubCardIcon}>🏆</Text>
            <Text style={styles.hubCardTitle}>ACHIEVEMENTS</Text>
            <Text style={[styles.hubCardBadge, { color: colors.primaryBright }]}>ACTIVE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/grind/receipt' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.hubCardIcon}>🧾</Text>
            <Text style={styles.hubCardTitle}>WEEKLY RECEIPT</Text>
            <Text style={[styles.hubCardBadge, { color: colors.primaryBright }]}>ACTIVE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/grind/reflection' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.hubCardIcon}>💭</Text>
            <Text style={styles.hubCardTitle}>REFLECTION</Text>
            <Text style={[styles.hubCardBadge, { color: colors.primaryBright }]}>ACTIVE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/grind/court' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.hubCardIcon}>⚖</Text>
            <Text style={styles.hubCardTitle}>CHARACTER COURT</Text>
            <Text style={[styles.hubCardBadge, { color: colors.warning }]}>
              {openCourtCases.length > 0 ? `${openCourtCases.length} CASE` : 'ACTIVE'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
  scrollContent: {
    paddingHorizontal: 16,
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
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    width: 36,
    alignItems: 'flex-start',
  },
  hamburger: {
    fontSize: 20,
    color: colors.primary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  appTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  appTitleAccent: {
    color: colors.primary,
  },
  modeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 3.5,
    textAlign: 'center',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  headerRight: {
    width: 36,
    alignItems: 'flex-end',
  },
  headerIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },

  // Week Switcher Row
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
    marginBottom: 12,
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

  // Intention Banners
  intentionBannerLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  intentionBannerUnlocked: {
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
  intentionBannerLeft: {
    flex: 1,
  },
  intentionTitleLocked: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.income,
    letterSpacing: 1,
    marginBottom: 2,
  },
  intentionSubLocked: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  intentionActionPillLocked: {
    backgroundColor: colors.card,
    borderColor: colors.income,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  intentionActionTextLocked: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.income,
    letterSpacing: 0.5,
  },
  intentionTitleUnlocked: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.warning,
    letterSpacing: 1,
    marginBottom: 2,
  },
  intentionSubUnlocked: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  intentionActionPillUnlocked: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  intentionActionTextUnlocked: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.warning,
    letterSpacing: 0.5,
  },

  // Character Court Alert Banner
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
  courtAlertLeft: {
    flex: 1,
  },
  courtAlertTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
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

  // Character Motivation Banner
  characterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 14,
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
    fontSize: 17,
    color: colors.primaryBright,
    letterSpacing: 1,
    marginBottom: 3,
  },
  dialogueSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  todayDate: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  weekTag: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1,
  },
  headerAddBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primaryDark,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.xs,
  },
  headerAddBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primaryBright,
    letterSpacing: 1,
  },

  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  checkInList: {
    marginTop: 4,
  },

  historyNoticeBox: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  historyNoticeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.warning,
    letterSpacing: 1,
    marginBottom: 2,
  },
  historyNoticeBody: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Weekly Targets list
  weeklyList: {
    gap: 10,
  },
  weeklyItemRow: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weeklyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  weeklyItemTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  weeklyItemFraction: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  weeklyProgressBarBg: {
    height: 6,
    backgroundColor: colors.card,
    borderRadius: 3,
    overflow: 'hidden',
  },
  weeklyProgressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  weeklyProgressBarFillMet: {
    backgroundColor: colors.income,
  },

  // Trend list
  trendList: {
    gap: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    width: 70,
  },
  trendLabelCurrent: {
    color: colors.primaryBright,
    fontFamily: fonts.bodyBold,
  },
  trendBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  trendScoreText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textPrimary,
    width: 36,
    textAlign: 'right',
  },

  // Record Summary
  recordsSummaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  recordSummaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  recordSummaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  recordSummaryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  recordSummaryVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },

  // Empty states
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  primaryActionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  primaryActionBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },

  // Hub section
  hubTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  hubGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  hubCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  hubCardDisabled: {
    opacity: 0.5,
  },
  hubCardIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  hubCardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hubCardBadge: {
    fontFamily: fonts.body,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 0.5,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
});
