// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Weekly Intentions & Commitment Store
// User-namespaced AsyncStorage cache for weekly commitments,
// lock-in rituals, and target renegotiation history.
//
// ISOLATION GUARANTEE:
// Completely decoupled from financial ledgers, budgets, and savings.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStartOfWeekDateString } from './grindCheckins';

const PREFIX = '@bb_cache_';
const BUCKET_GRIND_WEEKS = 'GRIND_WEEKS';

function getStoreKey(userId) {
  if (!userId) throw new Error('[grindWeek] userId is required for weekly intentions storage');
  return `${PREFIX}${userId}:${BUCKET_GRIND_WEEKS}`;
}

/**
 * Retrieve all raw weekly intention records for a user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getAllWeeksRaw(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(getStoreKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[grindWeek] getAllWeeksRaw error', err);
    return [];
  }
}

/**
 * Save full list of weekly intention records for a user.
 * @param {string} userId
 * @param {Array} list
 */
async function setAllWeeksRaw(userId, list) {
  if (!userId) return;
  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(list));
}

/**
 * Get the intention/commitment record for a specific week (weekStart = Monday YYYY-MM-DD).
 * @param {string} userId
 * @param {string} [weekStart]
 * @returns {Promise<Object|null>}
 */
export async function getWeekIntention(userId, weekStart = getStartOfWeekDateString()) {
  if (!userId) return null;
  const all = await getAllWeeksRaw(userId);
  return all.find((w) => w.weekStart === weekStart) || null;
}

/**
 * Alias for getting current week's intention.
 */
export async function getCurrentWeekIntention(userId) {
  return getWeekIntention(userId, getStartOfWeekDateString());
}

/**
 * Check if the specified week has already been locked in.
 * @param {string} userId
 * @param {string} [weekStart]
 * @returns {Promise<boolean>}
 */
export async function hasCurrentWeekBeenLocked(userId, weekStart = getStartOfWeekDateString()) {
  const week = await getWeekIntention(userId, weekStart);
  return Boolean(week && week.locked);
}

/**
 * Save or update a weekly intention record.
 * @param {string} userId
 * @param {Object} weekData
 * @returns {Promise<Object>}
 */
export async function saveWeekIntention(userId, weekData) {
  if (!userId || !weekData || !weekData.weekStart) {
    throw new Error('[grindWeek] userId and weekStart are required');
  }

  const now = new Date().toISOString();
  const all = await getAllWeeksRaw(userId);
  const index = all.findIndex((w) => w.weekStart === weekData.weekStart);

  const updatedRecord = {
    weekStart: weekData.weekStart,
    locked: Boolean(weekData.locked),
    lockedAt: weekData.locked ? weekData.lockedAt || now : null,
    commitments: Array.isArray(weekData.commitments) ? weekData.commitments : [],
    updatedAt: now,
  };

  if (index >= 0) {
    all[index] = {
      ...all[index],
      ...updatedRecord,
    };
  } else {
    all.push(updatedRecord);
  }

  await setAllWeeksRaw(userId, all);
  return all[index >= 0 ? index : all.length - 1];
}

/**
 * Lock in commitments for a week.
 *
 * @param {string} userId
 * @param {string} weekStart - Monday 'YYYY-MM-DD'
 * @param {Array<{ goalId: string, targetCount: number, goalType: string }>} committedGoals
 * @returns {Promise<Object>}
 */
export async function lockCurrentWeek(userId, weekStart = getStartOfWeekDateString(), committedGoals = []) {
  if (!userId) throw new Error('[grindWeek] userId is required');

  const now = new Date().toISOString();
  const commitments = committedGoals.map((g) => ({
    goalId: g.goalId || g.id,
    originalTarget: Number(g.targetCount) || 1,
    adjustedTarget: Number(g.targetCount) || 1,
    goalType: g.goalType || 'repetition',
    committedAt: now,
    adjustedAt: null,
    adjustmentReason: null,
    status: 'active',
  }));

  const weekRecord = {
    weekStart,
    locked: true,
    lockedAt: now,
    commitments,
    updatedAt: now,
  };

  return saveWeekIntention(userId, weekRecord);
}

/**
 * Responsibly renegotiate an unrealistic weekly commitment target.
 * Preserves originalTarget and stores adjustedTarget + reason.
 * Safeguard: Allows exactly one adjustment per goal per week.
 *
 * @param {string} userId
 * @param {string} weekStart - Monday 'YYYY-MM-DD'
 * @param {string} goalId
 * @param {number} newTarget
 * @param {string} reason - e.g. 'TOO_AMBITIOUS', 'SCHEDULE_CHANGED', etc.
 * @returns {Promise<Object>} Updated week intention record
 */
export async function renegotiateCommitment(userId, weekStart, goalId, newTarget, reason = '') {
  if (!userId || !weekStart || !goalId) {
    throw new Error('[grindWeek] userId, weekStart, and goalId are required');
  }

  const week = await getWeekIntention(userId, weekStart);
  if (!week || !week.locked) {
    throw new Error('[grindWeek] Cannot renegotiate an unlocked week');
  }

  const commitments = [...(week.commitments || [])];
  const index = commitments.findIndex((c) => c.goalId === goalId);
  if (index < 0) {
    throw new Error('[grindWeek] Commitment not found in locked week');
  }

  const commitment = commitments[index];

  // Safeguard: Check if already adjusted this week
  if (commitment.adjustedAt) {
    throw new Error('[grindWeek] This commitment has already been renegotiated for this week.');
  }

  const numTarget = Math.max(1, Number(newTarget) || 1);
  const now = new Date().toISOString();

  commitments[index] = {
    ...commitment,
    adjustedTarget: numTarget,
    adjustedAt: now,
    adjustmentReason: (reason || 'RENEGOTIATED').trim(),
    status: 'renegotiated',
  };

  return saveWeekIntention(userId, {
    ...week,
    commitments,
    updatedAt: now,
  });
}

/**
 * Get all historical week intention records.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getWeekHistory(userId) {
  if (!userId) return [];
  const all = await getAllWeeksRaw(userId);
  return all.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

/**
 * Clear all weekly intention records (used for account logout/reset).
 * @param {string} userId
 */
export async function clearWeeks(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(getStoreKey(userId));
  } catch (err) {
    console.warn('[grindWeek] clearWeeks error', err);
  }
}
