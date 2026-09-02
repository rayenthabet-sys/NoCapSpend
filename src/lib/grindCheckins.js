// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Daily Check-Ins Local Store
// User-namespaced AsyncStorage cache for daily check-in logs.
// Isolated from financial tables and ledger logic.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@bb_cache_';
const BUCKET_GRIND_CHECKINS = 'GRIND_CHECKINS';

function getStoreKey(userId) {
  if (!userId) throw new Error('[grindCheckins] userId is required for check-in storage');
  return `${PREFIX}${userId}:${BUCKET_GRIND_CHECKINS}`;
}

/**
 * Generate a local deterministic ID for check-in records.
 * Format: checkin_local_<timestamp>_<random>
 */
export function generateCheckinLocalId() {
  return `checkin_local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format a Date instance to local YYYY-MM-DD string.
 * Avoids UTC timezone shift errors from toISOString().
 * @param {Date} [d]
 * @returns {string} 'YYYY-MM-DD'
 */
export function formatLocalDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's local date formatted as YYYY-MM-DD.
 */
export function getTodayDateString() {
  return formatLocalDate(new Date());
}

/**
 * Get Monday date string (YYYY-MM-DD) of the week containing the given date string.
 */
export function getStartOfWeekDateString(dateStr = getTodayDateString()) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  // day: 0 (Sun), 1 (Mon), ..., 6 (Sat)
  // Distance back to Monday:
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return formatLocalDate(mon);
}

/**
 * Get Monday date string (YYYY-MM-DD) of the week offset by N weeks from a base Monday date string.
 * e.g. offsetWeeks = -1 gives previous week's Monday.
 */
export function getOffsetWeekStartDateString(baseWeekStart = getStartOfWeekDateString(), offsetWeeks = 0) {
  const d = new Date(baseWeekStart + 'T00:00:00');
  d.setDate(d.getDate() + offsetWeeks * 7);
  return formatLocalDate(d);
}

/**
 * Retrieve all check-ins for a user across all time.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getAllUserCheckins(userId) {
  return getAllCheckinsRaw(userId);
}

/**
 * Retrieve all check-ins for a user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getAllCheckinsRaw(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(getStoreKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[grindCheckins] getAllCheckinsRaw error', err);
    return [];
  }
}

/**
 * Save full list of check-ins for a user.
 * @param {string} userId
 * @param {Array} list
 */
async function setAllCheckinsRaw(userId, list) {
  if (!userId) return;
  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(list));
}

/**
 * Get all check-ins for a specific date (YYYY-MM-DD).
 * @param {string} userId
 * @param {string} [date]
 * @returns {Promise<Array>}
 */
export async function getCheckins(userId, date = getTodayDateString()) {
  if (!userId) return [];
  const all = await getAllCheckinsRaw(userId);
  return all.filter((c) => c.checkin_date === date);
}

/**
 * Get a specific check-in for a user, goal, and date.
 * @param {string} userId
 * @param {string} goalId
 * @param {string} [date]
 * @returns {Promise<Object|null>}
 */
export async function getCheckin(userId, goalId, date = getTodayDateString()) {
  if (!userId || !goalId) return null;
  const all = await getAllCheckinsRaw(userId);
  return all.find((c) => c.goal_id === goalId && c.checkin_date === date) || null;
}

/**
 * Upsert a check-in record.
 * Compound key: (userId, goalId, checkin_date)
 * Guaranteed no duplicates.
 *
 * @param {string} userId
 * @param {string} goalId
 * @param {string} date - 'YYYY-MM-DD'
 * @param {Object} data - { status: 'done'|'not_done'|'skipped', value_count?: number, note?: string }
 * @returns {Promise<Object>}
 */
export async function upsertCheckin(userId, goalId, date, data = {}) {
  if (!userId || !goalId || !date) throw new Error('[grindCheckins] userId, goalId, and date are required');

  const now = new Date().toISOString();
  const all = await getAllCheckinsRaw(userId);
  const index = all.findIndex((c) => c.goal_id === goalId && c.checkin_date === date);

  let updatedRecord;

  if (index >= 0) {
    const existing = all[index];
    updatedRecord = {
      ...existing,
      ...data,
      goal_id: goalId,
      user_id: userId,
      checkin_date: date,
      status: data.status || existing.status || 'done',
      value_count: data.value_count !== undefined ? Number(data.value_count) : existing.value_count || 1,
      note: data.note !== undefined ? (data.note || '').trim() : existing.note || '',
      updated_at: now,
    };
    all[index] = updatedRecord;
  } else {
    updatedRecord = {
      id: generateCheckinLocalId(),
      user_id: userId,
      goal_id: goalId,
      checkin_date: date,
      status: data.status || 'done',
      value_count: data.value_count !== undefined ? Number(data.value_count) : 1,
      note: (data.note || '').trim(),
      created_at: now,
      updated_at: now,
    };
    all.push(updatedRecord);
  }

  await setAllCheckinsRaw(userId, all);
  return updatedRecord;
}

/**
 * Save a new check-in (alias to upsertCheckin for consistency).
 */
export async function saveCheckin(userId, checkin) {
  return upsertCheckin(userId, checkin.goal_id, checkin.checkin_date || getTodayDateString(), checkin);
}

/**
 * Update a check-in record.
 */
export async function updateCheckin(userId, goalId, date, updates) {
  return upsertCheckin(userId, goalId, date, updates);
}

/**
 * Get all check-ins for the 7 days of a week starting on weekStart (Monday).
 * @param {string} userId
 * @param {string} [weekStart] - 'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
export async function getWeekCheckins(userId, weekStart = getStartOfWeekDateString()) {
  if (!userId) return [];
  const all = await getAllCheckinsRaw(userId);

  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startDateStr = weekStart;
  const endDateStr = end.toISOString().slice(0, 10);

  return all.filter((c) => c.checkin_date >= startDateStr && c.checkin_date <= endDateStr);
}

/**
 * Get check-in history for a specific goal (past N days).
 * @param {string} userId
 * @param {string} goalId
 * @param {number} [days=14]
 * @returns {Promise<Array>}
 */
export async function getGoalCheckinHistory(userId, goalId, days = 14) {
  if (!userId || !goalId) return [];
  const all = await getAllCheckinsRaw(userId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return all
    .filter((c) => c.goal_id === goalId && c.checkin_date >= cutoffStr)
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
}

/**
 * Delete a check-in by checkin ID.
 */
export async function deleteCheckin(userId, checkinId) {
  if (!userId || !checkinId) return;
  const all = await getAllCheckinsRaw(userId);
  const filtered = all.filter((c) => c.id !== checkinId);
  await setAllCheckinsRaw(userId, filtered);
}

/**
 * Clear all check-ins for a user (called on logout/reset).
 * @param {string} userId
 */
export async function clearCheckins(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(getStoreKey(userId));
  } catch (err) {
    console.warn('[grindCheckins] clearCheckins error', err);
  }
}
