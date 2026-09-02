// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Daily Relevance & Mission Prioritization Engine
// Determines what goals are relevant to execute TODAY and assigns
// deterministic execution states and priority ranking.
//
// ISOLATION GUARANTEE:
// Zero interaction with financial accounts, budgets, savings, or expenses.
// ─────────────────────────────────────────────────────────────────

import { calculateGoalProgress } from './grindStreaks';

export const MISSION_STATES = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  AT_RISK: 'AT_RISK',
  DONE_FOR_WEEK: 'DONE_FOR_WEEK',
};

export const WEEK_STATUS_LABELS = {
  GETTING_STARTED: 'GETTING STARTED',
  ON_TRACK: 'ON TRACK',
  CATCH_UP: 'CATCH UP',
  FINAL_PUSH: 'FINAL PUSH',
  WEEK_COMPLETE: 'WEEK COMPLETE',
};

export const MAX_PRIMARY_MISSIONS = 5;

/**
 * Determines whether a goal is at risk of missing its weekly commitment.
 * Deterministic: Evaluates day of the week (0=Sun, 1=Mon, ..., 6=Sat) and remaining progress.
 *
 * Rule: Only flag as AT_RISK on Day 4+ (Thursday onwards) if progress is < 40% and remaining > 1.
 */
export function isGoalAtRisk(dayOfWeekIndex, percent, targetCount, completedCount) {
  if (completedCount >= targetCount) return false;
  // Day 0 is Sunday (final day of week in ISO or standard week), Days 4-6 are Thu-Sat
  const isLateInWeek = dayOfWeekIndex === 0 || dayOfWeekIndex >= 4;
  if (!isLateInWeek) return false;

  const remaining = targetCount - completedCount;
  return percent < 50 && remaining >= 1;
}

/**
 * Derives daily mission items for each active goal.
 *
 * @param {Array<Object>} goals
 * @param {Array<Object>} todayCheckins
 * @param {Array<Object>} weekCheckins
 * @param {Object|null} weekIntention
 * @param {string} todayDateStr YYYY-MM-DD
 * @returns {Array<Object>} Prioritized daily missions
 */
export function deriveDailyMissions(goals = [], todayCheckins = [], weekCheckins = [], weekIntention = null, todayDateStr = '') {
  if (!goals || goals.length === 0) return [];

  const todayObj = todayDateStr ? new Date(todayDateStr + 'T00:00:00') : new Date();
  const dayOfWeekIndex = todayObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  const missions = [];

  for (const goal of goals) {
    if (goal.isArchived || goal.isPaused || goal.isCompleted) continue;

    const commitment = weekIntention?.commitments?.find((c) => c.goalId === goal.id);
    const goalWeekCheckins = weekCheckins.filter((c) => c.goal_id === goal.id);
    const todayCheckin = todayCheckins.find((c) => c.goal_id === goal.id && c.status === 'done');

    const progress = calculateGoalProgress(goal, goalWeekCheckins, commitment);
    const target = progress.targetCount;
    const completed = progress.completedCount;
    const remaining = Math.max(0, target - completed);
    const isDoneForWeek = progress.isTargetMet;
    const isDoneToday = Boolean(todayCheckin);

    // Determine Mission State
    let state = MISSION_STATES.TODO;

    if (isDoneForWeek) {
      state = MISSION_STATES.DONE_FOR_WEEK;
    } else if (isGoalAtRisk(dayOfWeekIndex, progress.percent, target, completed)) {
      state = MISSION_STATES.AT_RISK;
    } else if (isDoneToday) {
      state = MISSION_STATES.COMPLETE;
    } else if (completed > 0) {
      state = MISSION_STATES.IN_PROGRESS;
    } else {
      state = MISSION_STATES.TODO;
    }

    // Today's action description
    let todayActionLabel = '';
    if (goal.goalType === 'quantity') {
      todayActionLabel = isDoneForWeek
        ? 'Target reached'
        : `${remaining} ${goal.targetUnit || 'units'} left`;
    } else if (goal.goalType === 'daily') {
      todayActionLabel = isDoneToday ? 'Completed today ✓' : 'Daily check-in required';
    } else if (goal.goalType === 'once') {
      todayActionLabel = isDoneForWeek ? 'Completed this week ✓' : 'One-time action pending';
    } else {
      // Repetition
      todayActionLabel = isDoneForWeek
        ? 'Weekly target reached ✓'
        : isDoneToday
        ? `${completed}/${target} done (1 logged today)`
        : `${remaining} more this week`;
    }

    missions.push({
      goalId: goal.id,
      goal,
      title: goal.title,
      category: goal.category || 'general',
      goalType: goal.goalType || 'repetition',
      targetUnit: goal.targetUnit || '',
      state,
      progress,
      targetCount: target,
      completedCount: completed,
      remainingCount: remaining,
      isDoneToday,
      isDoneForWeek,
      todayActionLabel,
    });
  }

  // Deterministic Priority Sorting:
  // 1. AT_RISK first
  // 2. TODO / IN_PROGRESS (incomplete today)
  // 3. COMPLETE (done today, but week still in progress)
  // 4. DONE_FOR_WEEK last
  const stateWeight = {
    [MISSION_STATES.AT_RISK]: 1,
    [MISSION_STATES.TODO]: 2,
    [MISSION_STATES.IN_PROGRESS]: 3,
    [MISSION_STATES.COMPLETE]: 4,
    [MISSION_STATES.DONE_FOR_WEEK]: 5,
  };

  missions.sort((a, b) => {
    const weightDiff = (stateWeight[a.state] || 99) - (stateWeight[b.state] || 99);
    if (weightDiff !== 0) return weightDiff;
    // Tie-breaker: largest remaining count first
    return b.remainingCount - a.remainingCount;
  });

  return missions;
}

/**
 * Determines the overarching weekly status label based on time of week and score.
 */
export function deriveWeeklyStatus(scorePercent = 0, dayOfWeekIndex = 1, totalGoals = 0, goalsMetCount = 0) {
  if (totalGoals > 0 && goalsMetCount === totalGoals) {
    return WEEK_STATUS_LABELS.WEEK_COMPLETE;
  }

  // Days 1-2 (Mon-Tue)
  if (dayOfWeekIndex === 1 || dayOfWeekIndex === 2) {
    return WEEK_STATUS_LABELS.GETTING_STARTED;
  }

  // Days 3-4 (Wed-Thu)
  if (dayOfWeekIndex === 3 || dayOfWeekIndex === 4) {
    return scorePercent >= 50 ? WEEK_STATUS_LABELS.ON_TRACK : WEEK_STATUS_LABELS.CATCH_UP;
  }

  // Days 5-6, 0 (Fri-Sun)
  if (scorePercent >= 80) return WEEK_STATUS_LABELS.ON_TRACK;
  if (scorePercent >= 50) return WEEK_STATUS_LABELS.FINAL_PUSH;
  return WEEK_STATUS_LABELS.CATCH_UP;
}

/**
 * Identifies a single urgent "Smart One Thing" mission to reduce decision fatigue.
 */
export function getSmartOneThing(missions = []) {
  if (missions.length === 0) return null;

  // 1. Find first AT_RISK goal
  const atRisk = missions.find((m) => m.state === MISSION_STATES.AT_RISK);
  if (atRisk) return atRisk;

  // 2. Find first incomplete TODO goal
  const incomplete = missions.find((m) => m.state === MISSION_STATES.TODO || m.state === MISSION_STATES.IN_PROGRESS);
  if (incomplete) return incomplete;

  return null;
}
