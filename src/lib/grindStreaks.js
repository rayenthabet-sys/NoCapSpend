// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Streak, Score & Weekly Performance Engine
// Pure calculations for weekly goal completion, daily streaks,
// performance tiers, best/worst goal tracking, trends, and weekly commitments.
//
// ISOLATION GUARANTEE:
// Never interacts with financial ledgers, budgets, savings, or expenses.
// ─────────────────────────────────────────────────────────────────

import { getTodayDateString, getStartOfWeekDateString, getOffsetWeekStartDateString } from './grindCheckins';

export const WEEKLY_TIERS = {
  ELITE: {
    key: 'ELITE',
    label: 'ELITE WEEK',
    headline: 'UNTOUCHABLE CONSISTENCY',
    description: 'You handled business every single day. Keep this standard.',
    minScore: 90,
  },
  SOLID: {
    key: 'SOLID',
    label: 'SOLID WEEK',
    headline: 'GREAT EXECUTION',
    description: 'Strong weekly output. You did what you said you would do.',
    minScore: 75,
  },
  SHAKY: {
    key: 'SHAKY',
    label: 'SHAKY WEEK',
    headline: 'HALF-ASS EFFORT',
    description: "You did some work, but left too much on the table.",
    minScore: 50,
  },
  STRUGGLING: {
    key: 'STRUGGLING',
    label: 'STRUGGLING',
    headline: 'SLIPPING STANDARDS',
    description: 'You fell behind on major commitments. Tomorrow better not look like today.',
    minScore: 1,
  },
  DISASTER: {
    key: 'DISASTER',
    label: 'DISASTER',
    headline: 'ZERO DISCIPLINE',
    description: 'No progress logged. You got plans or you just talking?',
    minScore: 0,
  },
};

/**
 * Classify a Grind Score percentage into a structured performance tier.
 * @param {number} scorePercent - 0 to 100
 * @returns {Object} Tier descriptor
 */
export function getWeeklyTier(scorePercent = 0) {
  const score = Math.max(0, Math.min(100, Math.round(scorePercent)));
  if (score >= 90) return WEEKLY_TIERS.ELITE;
  if (score >= 75) return WEEKLY_TIERS.SOLID;
  if (score >= 50) return WEEKLY_TIERS.SHAKY;
  if (score >= 1) return WEEKLY_TIERS.STRUGGLING;
  return WEEKLY_TIERS.DISASTER;
}

/**
 * Calculate progress for an individual goal given a week's check-ins and an optional weekly commitment.
 *
 * @param {Object} goal
 * @param {Array} weekCheckins - Array of check-ins for the specified week
 * @param {Object} [commitment] - Optional weekly commitment record { originalTarget, adjustedTarget }
 * @returns {Object} { completedCount, targetCount, isTargetMet, percent, remainingCount, commitment }
 */
export function calculateGoalProgress(goal, weekCheckins = [], commitment = null) {
  if (!goal) {
    return { completedCount: 0, targetCount: 1, isTargetMet: false, percent: 0, remainingCount: 1, commitment: null };
  }

  const goalCheckins = weekCheckins.filter(
    (c) => c.goal_id === goal.id && c.status === 'done'
  );

  let completedCount = 0;

  // Use committed target if available, otherwise default to goal.targetCount
  let targetCount = 1;
  if (commitment) {
    targetCount = Math.max(1, Number(commitment.adjustedTarget ?? commitment.originalTarget) || 1);
  } else {
    targetCount = Math.max(1, Number(goal.targetCount) || 1);
  }

  if (goal.goalType === 'quantity') {
    completedCount = goalCheckins.reduce(
      (sum, c) => sum + (Number(c.value_count) || 0),
      0
    );
  } else {
    completedCount = goalCheckins.length;
  }

  const isTargetMet = completedCount >= targetCount;
  const percent = Math.min(100, Math.round((completedCount / targetCount) * 100));
  const remainingCount = Math.max(0, targetCount - completedCount);

  return {
    completedCount,
    targetCount,
    isTargetMet,
    percent,
    remainingCount,
    commitment,
  };
}

/**
 * Calculate full weekly progress, Grind Score, best/worst goals, and performance tier.
 * Supports locked weekly commitments while remaining 100% backward-compatible.
 *
 * @param {Array} goals - Active goals list
 * @param {Array} weekCheckins - Check-ins for the week
 * @param {Object} [weekIntention] - Optional weekly intention/commitment record
 * @returns {Object} Comprehensive weekly performance metrics
 */
export function calculateWeeklyProgress(goals = [], weekCheckins = [], weekIntention = null) {
  if (!goals || goals.length === 0) {
    return {
      grindScorePercent: 0,
      goalsMetCount: 0,
      totalGoals: 0,
      totalCompletedUnits: 0,
      totalTargetUnits: 0,
      tier: WEEKLY_TIERS.DISASTER,
      bestGoal: null,
      worstGoal: null,
      allGoalsCleared: false,
      goalProgressMap: {},
      totalCheckinsCount: 0,
      isLocked: false,
      commitmentsCount: 0,
    };
  }

  const isLocked = Boolean(weekIntention?.locked && weekIntention.commitments?.length > 0);
  const commitmentMap = {};

  if (isLocked) {
    for (const c of weekIntention.commitments) {
      commitmentMap[c.goalId] = c;
    }
  }

  // If locked, evaluate only committed goals. Otherwise evaluate all active goals.
  const targetGoals = isLocked
    ? goals.filter((g) => Boolean(commitmentMap[g.id]))
    : goals;

  if (targetGoals.length === 0) {
    return {
      grindScorePercent: 0,
      goalsMetCount: 0,
      totalGoals: 0,
      totalCompletedUnits: 0,
      totalTargetUnits: 0,
      tier: WEEKLY_TIERS.DISASTER,
      bestGoal: null,
      worstGoal: null,
      allGoalsCleared: false,
      goalProgressMap: {},
      totalCheckinsCount: 0,
      isLocked,
      commitmentsCount: 0,
    };
  }

  let totalPercentSum = 0;
  let goalsMetCount = 0;
  let totalCompletedUnits = 0;
  let totalTargetUnits = 0;
  const goalProgressMap = {};

  const evaluatedGoals = [];

  for (const goal of targetGoals) {
    const commitment = isLocked ? commitmentMap[goal.id] : null;
    const progress = calculateGoalProgress(goal, weekCheckins, commitment);
    goalProgressMap[goal.id] = progress;
    totalPercentSum += progress.percent;
    totalCompletedUnits += progress.completedCount;
    totalTargetUnits += progress.targetCount;

    if (progress.isTargetMet) {
      goalsMetCount++;
    }

    evaluatedGoals.push({
      goal,
      progress,
    });
  }

  const grindScorePercent = Math.min(100, Math.round(totalPercentSum / targetGoals.length));
  const tier = getWeeklyTier(grindScorePercent);

  // Sort to find best and worst goals
  evaluatedGoals.sort((a, b) => b.progress.percent - a.progress.percent);

  const bestGoal = evaluatedGoals.length > 0 ? evaluatedGoals[0] : null;
  const allGoalsCleared = evaluatedGoals.every((item) => item.progress.isTargetMet);

  // Worst goal is lowest percent that has not reached 100% (or null if all cleared)
  const nonCleared = evaluatedGoals.filter((item) => !item.progress.isTargetMet);
  const worstGoal = nonCleared.length > 0 ? nonCleared[nonCleared.length - 1] : null;

  const totalCheckinsCount = weekCheckins.filter((c) => c.status === 'done').length;

  return {
    grindScorePercent,
    goalsMetCount,
    totalGoals: targetGoals.length,
    totalCompletedUnits,
    totalTargetUnits,
    tier,
    bestGoal,
    worstGoal,
    allGoalsCleared,
    goalProgressMap,
    totalCheckinsCount,
    isLocked,
    commitmentsCount: targetGoals.length,
  };
}

/**
 * Calculate today's check-in completion breakdown.
 */
export function calculateDailyCompletion(goals = [], todayCheckins = []) {
  const totalTodayGoals = goals.length;
  let completedTodayCount = 0;
  let notDoneTodayCount = 0;

  for (const goal of goals) {
    const checkin = todayCheckins.find((c) => c.goal_id === goal.id);
    if (checkin) {
      if (checkin.status === 'done') {
        completedTodayCount++;
      } else if (checkin.status === 'not_done') {
        notDoneTodayCount++;
      }
    }
  }

  const pendingTodayCount = Math.max(0, totalTodayGoals - (completedTodayCount + notDoneTodayCount));
  const allCheckedIn = totalTodayGoals > 0 && pendingTodayCount === 0;

  return {
    totalTodayGoals,
    completedTodayCount,
    notDoneTodayCount,
    pendingTodayCount,
    allCheckedIn,
  };
}

/**
 * Calculate current consecutive daily streak.
 */
export function calculateDailyStreak(allCheckins = []) {
  if (!allCheckins || allCheckins.length === 0) return 0;

  const doneDates = new Set(
    allCheckins
      .filter((c) => c.status === 'done')
      .map((c) => c.checkin_date)
  );

  if (doneDates.size === 0) return 0;

  const todayStr = getTodayDateString();
  let checkDate = new Date(todayStr + 'T00:00:00');

  // If today is not done yet, check if yesterday was done
  if (!doneDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().slice(0, 10);
    if (!doneDates.has(yesterdayStr)) {
      return 0; // Streak broken
    }
  }

  let streak = 0;
  while (true) {
    const dStr = checkDate.toISOString().slice(0, 10);
    if (doneDates.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate a goal's weekly consistency streak (number of consecutive weeks target was met).
 */
export function calculateGoalWeeklyStreak(goal, allCheckins = [], currentWeekStart = getStartOfWeekDateString()) {
  if (!goal || !allCheckins || allCheckins.length === 0) return 0;

  let streak = 0;
  let offset = 0;

  // Check current week first
  const currentWeekStartStr = getOffsetWeekStartDateString(currentWeekStart, offset);
  const currentWeekEnd = new Date(currentWeekStartStr + 'T00:00:00');
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
  const currentWeekEndStr = currentWeekEnd.toISOString().slice(0, 10);

  const currentCheckins = allCheckins.filter(
    (c) => c.checkin_date >= currentWeekStartStr && c.checkin_date <= currentWeekEndStr
  );
  const currentProgress = calculateGoalProgress(goal, currentCheckins);

  if (currentProgress.isTargetMet) {
    streak++;
  }

  // Step backward through prior weeks
  offset = -1;
  while (offset >= -12) {
    const weekStartStr = getOffsetWeekStartDateString(currentWeekStart, offset);
    const weekEnd = new Date(weekStartStr + 'T00:00:00');
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const weekCheckins = allCheckins.filter(
      (c) => c.checkin_date >= weekStartStr && c.checkin_date <= weekEndStr
    );

    const hasAnyCheckin = allCheckins.some((c) => c.checkin_date <= weekEndStr);
    if (!hasAnyCheckin) break;

    const progress = calculateGoalProgress(goal, weekCheckins);
    if (progress.isTargetMet) {
      streak++;
      offset--;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate weekly trend history for the last N weeks.
 */
export function calculateWeeklyTrend(goals = [], allCheckins = [], currentWeekStart = getStartOfWeekDateString(), weeksBack = 4) {
  if (!goals || goals.length === 0) return [];

  const trend = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const offset = -i;
    const weekStart = getOffsetWeekStartDateString(currentWeekStart, offset);
    const weekEnd = new Date(weekStart + 'T00:00:00');
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const weekCheckins = allCheckins.filter(
      (c) => c.checkin_date >= weekStart && c.checkin_date <= weekEndStr
    );

    const progress = calculateWeeklyProgress(goals, weekCheckins);
    const isCurrent = offset === 0;

    let weekLabel = `W${weeksBack - i}`;
    if (isCurrent) weekLabel = 'THIS WEEK';
    else if (offset === -1) weekLabel = 'LAST WEEK';

    trend.push({
      weekLabel,
      weekStart,
      score: progress.grindScorePercent,
      tier: progress.tier,
      isCurrent,
      hasData: weekCheckins.length > 0,
    });
  }

  return trend;
}

/**
 * Evaluate unlockable achievement hooks for future Phase 7.
 */
export function getWeeklyAchievementHooks(goals = [], allCheckins = [], currentStreak = 0, weeklySummary = null) {
  const hooks = [];

  if (allCheckins && allCheckins.length > 0) {
    hooks.push('FIRST_GRIND');
  }

  const doneCount = allCheckins.filter((c) => c.status === 'done').length;
  if (doneCount >= 10) hooks.push('TEN_CHECKINS');
  if (doneCount >= 50) hooks.push('FIFTY_CHECKINS');

  if (currentStreak >= 3) hooks.push('STREAK_3_DAY');
  if (currentStreak >= 7) hooks.push('STREAK_7_DAY');
  if (currentStreak >= 14) hooks.push('STREAK_14_DAY');
  if (currentStreak >= 30) hooks.push('STREAK_30_DAY');

  if (weeklySummary) {
    if (weeklySummary.goalsMetCount > 0) hooks.push('FIRST_GOAL_COMPLETED');
    if (weeklySummary.allGoalsCleared && weeklySummary.totalGoals > 0) hooks.push('PERFECT_WEEK');
    if (weeklySummary.grindScorePercent >= 90) hooks.push('ELITE_WEEK');
  }

  return hooks;
}
