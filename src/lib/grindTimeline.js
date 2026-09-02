// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Timeline & Long-Term Journey Engine
// Aggregates, normalizes, and computes 30/90/All-Time execution history,
// activity heatmaps, performance trajectory, best runs, and major milestones.
//
// ISOLATION GUARANTEE:
// Zero interaction with financial accounts, budgets, savings, or expenses.
// ─────────────────────────────────────────────────────────────────

import {
  getTodayDateString,
  getStartOfWeekDateString,
  getOffsetWeekStartDateString,
  getAllUserCheckins,
  formatLocalDate,
} from './grindCheckins';
import { getGrindGoals } from './grindStore';
import { getWeekHistory } from './grindWeek';
import { getCourtCases } from './grindCourt';
import { getUserUnlockedAchievements, getAllAchievementDefinitions, calculatePersonalRecords } from './grindAchievements';
import { getReflections } from './grindReflections';
import { calculateWeeklyProgress, calculateDailyStreak } from './grindStreaks';

export const TIMELINE_WINDOWS = {
  DAYS_30: '30_DAYS',
  DAYS_90: '90_DAYS',
  ALL_TIME: 'ALL_TIME',
};

export const TRAJECTORY_STATES = {
  IMPROVING: 'IMPROVING',
  STABLE: 'STABLE',
  DECLINING: 'DECLINING',
  MIXED: 'MIXED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

export const MIN_WEEKS_FOR_TRAJECTORY = 6;

/**
 * Generates an array of date strings (YYYY-MM-DD) for the last N days up to today.
 */
export function getPastNDates(numDays = 30, todayStr = getTodayDateString()) {
  const dates = [];
  const base = new Date(todayStr + 'T00:00:00');
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

/**
 * Builds the activity intensity grid for heatmaps.
 * 0: no activity, 1: 1 checkin, 2: 2 checkins, 3: 3+ checkins
 */
export function calculateActivityHeatmap(allCheckins = [], numDays = 30, todayStr = getTodayDateString()) {
  const dates = getPastNDates(numDays, todayStr);
  const checkinCountMap = new Map();

  for (const chk of allCheckins) {
    if (chk.status === 'done' && chk.checkin_date) {
      const cur = checkinCountMap.get(chk.checkin_date) || 0;
      checkinCountMap.set(chk.checkin_date, cur + 1);
    }
  }

  let activeDaysCount = 0;
  const days = dates.map((dateStr) => {
    const count = checkinCountMap.get(dateStr) || 0;
    if (count > 0) activeDaysCount++;

    let level = 0;
    if (count >= 3) level = 3;
    else if (count === 2) level = 2;
    else if (count === 1) level = 1;

    return {
      date: dateStr,
      count,
      level,
    };
  });

  const consistencyRate = Math.round((activeDaysCount / numDays) * 100);

  return {
    days,
    activeDaysCount,
    totalDaysCount: numDays,
    consistencyRate,
  };
}

/**
 * Calculates long-term performance trajectory by comparing recent weeks against previous weeks.
 */
export function calculatePerformanceTrajectory(weekSummaries = []) {
  if (weekSummaries.length < MIN_WEEKS_FOR_TRAJECTORY) {
    return {
      state: TRAJECTORY_STATES.INSUFFICIENT_DATA,
      diffPercent: 0,
      recentAverage: 0,
      previousAverage: 0,
      headline: 'TRAJECTORY FORMING',
      subtext: `We need at least ${MIN_WEEKS_FOR_TRAJECTORY} completed weeks to measure your trajectory accurately.`,
    };
  }

  const half = Math.floor(weekSummaries.length / 2);
  const previousWeeks = weekSummaries.slice(0, half);
  const recentWeeks = weekSummaries.slice(half);

  const prevAvg = Math.round(previousWeeks.reduce((sum, w) => sum + w.score, 0) / previousWeeks.length);
  const recAvg = Math.round(recentWeeks.reduce((sum, w) => sum + w.score, 0) / recentWeeks.length);
  const diff = recAvg - prevAvg;

  if (diff >= 10) {
    return {
      state: TRAJECTORY_STATES.IMPROVING,
      diffPercent: diff,
      recentAverage: recAvg,
      previousAverage: prevAvg,
      headline: 'YOU’RE GETTING BETTER ↑',
      subtext: `Your recent weekly scores average ${diff}% higher than your earlier baseline (${recAvg}% vs ${prevAvg}%).`,
    };
  }

  if (diff <= -10) {
    return {
      state: TRAJECTORY_STATES.DECLINING,
      diffPercent: diff,
      recentAverage: recAvg,
      previousAverage: prevAvg,
      headline: 'EXECUTION IS SLIPPING ↓',
      subtext: `Recent weeks average ${Math.abs(diff)}% lower than your earlier baseline (${recAvg}% vs ${prevAvg}%).`,
    };
  }

  // Check variance for mixed
  const allScores = weekSummaries.map((w) => w.score);
  const maxScore = Math.max(...allScores);
  const minScore = Math.min(...allScores);

  if (maxScore - minScore >= 45) {
    return {
      state: TRAJECTORY_STATES.MIXED,
      diffPercent: diff,
      recentAverage: recAvg,
      previousAverage: prevAvg,
      headline: 'RESULTS ARE SWINGING ↕',
      subtext: `Execution swings between highs and lows. Focus on establishing a predictable rhythm.`,
    };
  }

  return {
    state: TRAJECTORY_STATES.STABLE,
    diffPercent: diff,
    recentAverage: recAvg,
    previousAverage: prevAvg,
    headline: 'CONSISTENT & STABLE →',
    subtext: `Your execution has remained steady across weekly cycles (${recAvg}% recent avg).`,
  };
}

/**
 * Finds the user's best and weakest consecutive runs (minimum 2 weeks).
 */
export function calculateRuns(weekSummaries = []) {
  if (weekSummaries.length < 2) {
    return { bestRun: null, weakRun: null };
  }

  let bestRun = null;
  let bestRunAvg = -1;

  let weakRun = null;
  let weakRunAvg = 999;

  // Evaluate sliding windows of size 2, 3, 4
  for (let windowSize = 2; windowSize <= Math.min(4, weekSummaries.length); windowSize++) {
    for (let i = 0; i <= weekSummaries.length - windowSize; i++) {
      const window = weekSummaries.slice(i, i + windowSize);
      const avg = Math.round(window.reduce((sum, w) => sum + w.score, 0) / windowSize);

      if (avg >= 85 && avg > bestRunAvg) {
        bestRunAvg = avg;
        bestRun = {
          length: windowSize,
          averageScore: avg,
          startWeek: window[0].weekStart,
          endWeek: window[window.length - 1].weekStart,
        };
      }

      if (avg <= 55 && avg < weakRunAvg) {
        weakRunAvg = avg;
        weakRun = {
          length: windowSize,
          averageScore: avg,
          startWeek: window[0].weekStart,
          endWeek: window[window.length - 1].weekStart,
        };
      }
    }
  }

  return { bestRun, weakRun };
}

/**
 * Aggregates all major milestones into a single chronological timeline.
 */
export function buildNormalizedMilestones(goals = [], allCheckins = [], weekSummaries = [], achievements = [], courtCases = [], reflections = []) {
  const events = [];

  // 1. First goal created
  if (goals.length > 0) {
    const sortedGoals = [...goals].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const firstGoal = sortedGoals[0];
    events.push({
      id: `milestone_goal_${firstGoal.id}`,
      type: 'GOAL',
      date: firstGoal.createdAt ? firstGoal.createdAt.slice(0, 10) : getTodayDateString(),
      icon: '🎯',
      title: 'FIRST GRIND GOAL CREATED',
      subtitle: `Created "${firstGoal.title}"`,
      route: `/grind/goal/${firstGoal.id}`,
    });
  }

  // 2. Achievements
  const allDefs = getAllAchievementDefinitions();
  for (const ach of achievements) {
    const def = allDefs.find((d) => d.id === ach.achievementId);
    if (def) {
      events.push({
        id: `milestone_ach_${ach.achievementId}`,
        type: 'ACHIEVEMENT',
        date: ach.unlockedAt ? ach.unlockedAt.slice(0, 10) : getTodayDateString(),
        icon: def.icon || '🏆',
        title: `ACHIEVEMENT: ${def.title}`,
        subtitle: def.description,
        route: '/grind/achievements',
      });
    }
  }

  // 3. Court Cases Resolved
  for (const c of courtCases) {
    if (c.status === 'resolved') {
      events.push({
        id: `milestone_court_${c.id}`,
        type: 'COURT',
        date: c.resolvedAt ? c.resolvedAt.slice(0, 10) : c.createdAt?.slice(0, 10) || getTodayDateString(),
        icon: '⚖',
        title: `COURT CASE RESOLVED: ${c.goalTitle?.toUpperCase()}`,
        subtitle: `Diagnosis: ${c.diagnosis?.replace(/_/g, ' ') || 'Resolved'}`,
        route: '/grind/court',
      });
    }
  }

  // 4. Perfect Weeks (>= 90%)
  for (const w of weekSummaries) {
    if (w.score >= 90) {
      events.push({
        id: `milestone_week_perfect_${w.weekStart}`,
        type: 'WEEK',
        date: w.weekStart,
        icon: '⚡',
        title: `PERFECT WEEK (${w.score}%)`,
        subtitle: `All ${w.commitmentsCount} commitments locked and executed`,
        route: `/grind/receipt?weekStart=${w.weekStart}`,
      });
    }
  }

  // 5. Weekly Reflections
  for (const r of reflections) {
    events.push({
      id: `milestone_ref_${r.weekStart}`,
      type: 'REFLECTION',
      date: r.updatedAt ? r.updatedAt.slice(0, 10) : r.weekStart,
      icon: '💭',
      title: 'WEEKLY REFLECTION RECORDED',
      subtitle: r.lesson ? `“${r.lesson.slice(0, 50)}...”` : 'Weekly reflection submitted',
      route: `/grind/reflection?weekStart=${r.weekStart}`,
    });
  }

  // 6. Goal Lifecycle Milestones (Completed, Paused)
  for (const g of goals) {
    if (g.isCompleted && g.completedAt) {
      events.push({
        id: `milestone_goal_comp_${g.id}`,
        type: 'GOAL',
        date: g.completedAt.slice(0, 10),
        icon: '🏆',
        title: `GOAL COMPLETED: ${g.title.toUpperCase()}`,
        subtitle: `Successfully fulfilled target of ${g.targetCount} ${g.targetUnit || 'sessions'}`,
        route: `/grind/goal/${g.id}`,
      });
    } else if (g.isPaused && g.pausedAt) {
      events.push({
        id: `milestone_goal_pause_${g.id}`,
        type: 'GOAL',
        date: g.pausedAt.slice(0, 10),
        icon: '⏸',
        title: `GOAL PAUSED: ${g.title.toUpperCase()}`,
        subtitle: g.pauseReason ? `Reason: ${g.pauseReason}` : 'Goal paused by user',
        route: `/grind/goal/${g.id}`,
      });
    }
  }

  // Sort descending by date (newest first)
  events.sort((a, b) => b.date.localeCompare(a.date));

  return events;
}

/**
 * Master data loader and aggregator for the Long-Term Timeline.
 *
 * @param {string} userId
 * @param {string} timeWindow - '30_DAYS' | '90_DAYS' | 'ALL_TIME'
 * @returns {Promise<Object>} Timeline view model
 */
export async function getTimelineData(userId, timeWindow = TIMELINE_WINDOWS.DAYS_30) {
  if (!userId) throw new Error('[grindTimeline] userId required');

  const todayStr = getTodayDateString();

  const [goals, allCheckins, weekHistory, unlockedAch, courtCases, reflections] = await Promise.all([
    getGrindGoals(userId).catch(() => []),
    getAllUserCheckins(userId).catch(() => []),
    getWeekHistory(userId).catch(() => []),
    getUserUnlockedAchievements(userId).catch(() => []),
    getCourtCases(userId).catch(() => []),
    getReflections(userId).catch(() => []),
  ]);

  const activeGoals = goals.filter((g) => !g.isArchived);

  // Compute number of days based on window
  const numDays = timeWindow === TIMELINE_WINDOWS.DAYS_90 ? 90 : 30;

  // Build heatmap
  const heatmap = calculateActivityHeatmap(allCheckins, numDays, todayStr);

  // Build sorted week summaries across history
  const lockedWeeks = weekHistory
    .filter((w) => w.locked)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const weekSummaries = [];
  for (const w of lockedWeeks) {
    const startD = new Date(w.weekStart + 'T00:00:00');
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = formatLocalDate(endD);

    const chks = allCheckins.filter((c) => c.checkin_date >= w.weekStart && c.checkin_date <= endStr);
    const summary = calculateWeeklyProgress(activeGoals, chks, w);

    weekSummaries.push({
      weekStart: w.weekStart,
      score: summary.grindScorePercent,
      commitmentsCount: w.commitments?.length || 0,
      goalsMetCount: summary.goalsMetCount,
      tier: summary.tier,
    });
  }

  // Trajectory & runs
  const trajectory = calculatePerformanceTrajectory(weekSummaries);
  const { bestRun, weakRun } = calculateRuns(weekSummaries);

  // Milestones timeline
  const milestones = buildNormalizedMilestones(goals, allCheckins, weekSummaries, unlockedAch, courtCases, reflections);

  // Streaks & Records
  const currentStreak = calculateDailyStreak(allCheckins);
  const records = calculatePersonalRecords(activeGoals, allCheckins, weekHistory, currentStreak);

  return {
    todayStr,
    timeWindow,
    heatmap,
    trajectory,
    bestRun,
    weakRun,
    milestones,
    weekSummaries,
    currentStreak,
    records,
    totalCompletedWeeks: weekSummaries.length,
  };
}
