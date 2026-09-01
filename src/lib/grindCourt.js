// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Character Court Engine
// Evaluates repeated failure patterns, repeated renegotiations, and
// abandonment across committed goals to present actionable diagnosis.
//
// ISOLATION GUARANTEE:
// Zero interaction with financial accounts, budgets, savings, or expenses.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStartOfWeekDateString, getOffsetWeekStartDateString, getAllUserCheckins } from './grindCheckins';
import { getGrindGoals, updateGrindGoal } from './grindStore';
import { getWeekHistory } from './grindWeek';
import { calculateGoalProgress } from './grindStreaks';

const PREFIX = '@bb_cache_';
const BUCKET_GRIND_COURT = 'GRIND_COURT';

function getStoreKey(userId) {
  if (!userId) throw new Error('[grindCourt] userId is required');
  return `${PREFIX}${userId}:${BUCKET_GRIND_COURT}`;
}

export const COURT_TRIGGERS = {
  REPEATED_WEEKLY_FAILURE: 'REPEATED_WEEKLY_FAILURE',
  REPEATED_RENEGOTIATION: 'REPEATED_RENEGOTIATION',
  REPEATED_COMMITMENT: 'REPEATED_COMMITMENT',
  GOAL_ABANDONMENT: 'GOAL_ABANDONMENT',
};

export const COURT_DIAGNOSES = {
  TOO_AMBITIOUS: 'TOO_AMBITIOUS',
  BAD_SCHEDULING: 'BAD_SCHEDULING',
  DIDNT_PRIORITIZE: 'DIDNT_PRIORITIZE',
  DONT_WANT_ANYMORE: 'DONT_WANT_ANYMORE',
  SOMETHING_CAME_UP: 'SOMETHING_CAME_UP',
};

export async function getCourtCasesRaw(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(getStoreKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[grindCourt] getCourtCasesRaw error', err);
    return [];
  }
}

export async function setCourtCasesRaw(userId, list) {
  if (!userId) return;
  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(list));
}

/**
 * Retrieve all open and resolved court cases for a user.
 */
export async function getCourtCases(userId) {
  const list = await getCourtCasesRaw(userId);
  return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/**
 * Retrieve only open court cases.
 */
export async function getOpenCourtCases(userId) {
  const list = await getCourtCasesRaw(userId);
  return list.filter((c) => c.status === 'open');
}

/**
 * Evaluate user's goals and historical commitments to detect failure patterns.
 * Anti-spam: Does not recreate court cases that have already been resolved for the same pattern.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>} Open court cases
 */
export async function evaluateAndDetectCourtCases(userId) {
  if (!userId) return [];

  const [goals, allCheckins, weekHistory, existingCases] = await Promise.all([
    getGrindGoals(userId),
    getAllUserCheckins(userId),
    getWeekHistory(userId),
    getCourtCasesRaw(userId),
  ]);

  const activeGoals = goals.filter((g) => !g.isArchived);
  if (activeGoals.length === 0 || weekHistory.length === 0) {
    return existingCases.filter((c) => c.status === 'open');
  }

  // Sort locked weeks oldest to newest
  const lockedWeeks = weekHistory
    .filter((w) => w.locked && w.commitments && w.commitments.length > 0)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  if (lockedWeeks.length < 2) {
    return existingCases.filter((c) => c.status === 'open');
  }

  const updatedCases = [...existingCases];
  const now = new Date().toISOString();
  let caseCount = existingCases.length;

  for (const goal of activeGoals) {
    // Check if there is already an open case for this goal
    const hasOpenCase = updatedCases.some((c) => c.goalId === goal.id && c.status === 'open');
    if (hasOpenCase) continue;

    // Filter locked weeks where user committed to this specific goal
    const goalCommittedWeeks = [];
    for (const w of lockedWeeks) {
      const commitment = w.commitments.find((c) => c.goalId === goal.id);
      if (commitment) {
        const startD = new Date(w.weekStart + 'T00:00:00');
        const endD = new Date(startD);
        endD.setDate(endD.getDate() + 6);
        const endStr = endD.toISOString().slice(0, 10);
        const chks = allCheckins.filter((c) => c.goal_id === goal.id && c.checkin_date >= w.weekStart && c.checkin_date <= endStr);
        const progress = calculateGoalProgress(goal, chks, commitment);
        goalCommittedWeeks.push({
          weekStart: w.weekStart,
          commitment,
          progress,
        });
      }
    }

    if (goalCommittedWeeks.length < 2) continue;

    const recentWeeks = goalCommittedWeeks.slice(-2);
    const lastWeek = recentWeeks[1];
    const prevWeek = recentWeeks[0];

    // Check if the last resolved case for this goal was already evaluated for this weekStart
    const lastResolvedCase = updatedCases
      .filter((c) => c.goalId === goal.id && c.status === 'resolved')
      .sort((a, b) => (b.resolvedAt || '').localeCompare(a.resolvedAt || ''))[0];

    if (lastResolvedCase && lastResolvedCase.weekStart === lastWeek.weekStart) {
      continue; // Anti-spam: already resolved for this week's data
    }

    // ── TRIGGER 1: Repeated Weekly Failure (2 consecutive weeks with < 50% score) ──
    if (prevWeek.progress.percent < 50 && lastWeek.progress.percent < 50) {
      caseCount++;
      updatedCases.push({
        id: `court_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        caseNumber: `CASE #${String(caseCount).padStart(3, '0')}`,
        goalId: goal.id,
        goalTitle: goal.title,
        weekStart: lastWeek.weekStart,
        trigger: COURT_TRIGGERS.REPEATED_WEEKLY_FAILURE,
        character: 'riley',
        stats: {
          prevWeekScore: prevWeek.progress.percent,
          lastWeekScore: lastWeek.progress.percent,
          completedCount: lastWeek.progress.completedCount,
          targetCount: lastWeek.progress.targetCount,
        },
        status: 'open',
        diagnosis: null,
        actionTaken: null,
        createdAt: now,
        resolvedAt: null,
      });
      continue;
    }

    // ── TRIGGER 2: Repeated Renegotiation (2+ weeks renegotiated) ──
    const renegotiatedCount = goalCommittedWeeks.filter((w) => Boolean(w.commitment.adjustedAt)).length;
    if (renegotiatedCount >= 2 && lastWeek.commitment.adjustedAt) {
      caseCount++;
      updatedCases.push({
        id: `court_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        caseNumber: `CASE #${String(caseCount).padStart(3, '0')}`,
        goalId: goal.id,
        goalTitle: goal.title,
        weekStart: lastWeek.weekStart,
        trigger: COURT_TRIGGERS.REPEATED_RENEGOTIATION,
        character: 'robert',
        stats: {
          renegotiatedWeeksCount: renegotiatedCount,
          originalTarget: lastWeek.commitment.originalTarget,
          adjustedTarget: lastWeek.commitment.adjustedTarget,
        },
        status: 'open',
        diagnosis: null,
        actionTaken: null,
        createdAt: now,
        resolvedAt: null,
      });
      continue;
    }

    // ── TRIGGER 3: Goal Abandonment (Committed but 0 check-ins for 2 consecutive weeks) ──
    if (prevWeek.progress.completedCount === 0 && lastWeek.progress.completedCount === 0) {
      caseCount++;
      updatedCases.push({
        id: `court_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        caseNumber: `CASE #${String(caseCount).padStart(3, '0')}`,
        goalId: goal.id,
        goalTitle: goal.title,
        weekStart: lastWeek.weekStart,
        trigger: COURT_TRIGGERS.GOAL_ABANDONMENT,
        character: 'stinkmeaner',
        stats: {
          targetCount: lastWeek.progress.targetCount,
          completedCount: 0,
        },
        status: 'open',
        diagnosis: null,
        actionTaken: null,
        createdAt: now,
        resolvedAt: null,
      });
      continue;
    }
  }

  if (updatedCases.length !== existingCases.length) {
    await setCourtCasesRaw(userId, updatedCases);
  }

  return updatedCases.filter((c) => c.status === 'open');
}

/**
 * Resolve an open court case with a diagnosis and chosen action.
 */
export async function resolveCourtCase(userId, caseId, diagnosis, actionTaken = '', details = {}) {
  if (!userId || !caseId) return;

  const list = await getCourtCasesRaw(userId);
  const index = list.findIndex((c) => c.id === caseId);
  if (index < 0) return;

  const now = new Date().toISOString();
  list[index] = {
    ...list[index],
    status: 'resolved',
    diagnosis,
    actionTaken,
    resolvedDetails: details,
    resolvedAt: now,
  };

  await setCourtCasesRaw(userId, list);

  // If action is to archive goal:
  if (diagnosis === COURT_DIAGNOSES.DONT_WANT_ANYMORE && list[index].goalId) {
    try {
      await updateGrindGoal(userId, list[index].goalId, { isArchived: true });
    } catch (err) {
      console.warn('[grindCourt] Archiving goal error', err);
    }
  }

  return list[index];
}

/**
 * Clear all court cases (for account reset).
 */
export async function clearCourt(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(getStoreKey(userId));
  } catch (err) {
    console.warn('[grindCourt] clearCourt error', err);
  }
}
