// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Weekly Reflections Engine
// Handles 4-question weekly performance reflections and local persistence.
//
// ISOLATION GUARANTEE:
// Zero interaction with financial accounts, budgets, savings, or expenses.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStartOfWeekDateString } from './grindCheckins';

const PREFIX = '@bb_cache_';
const BUCKET_GRIND_REFLECTIONS = 'GRIND_REFLECTIONS';

function getStoreKey(userId) {
  if (!userId) throw new Error('[grindReflections] userId is required');
  return `${PREFIX}${userId}:${BUCKET_GRIND_REFLECTIONS}`;
}

async function getReflectionsRaw(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(getStoreKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[grindReflections] getReflectionsRaw parse error', err);
    return [];
  }
}

async function setReflectionsRaw(userId, list) {
  if (!userId) return;
  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(list));
}

/**
 * Retrieve reflection for a specific week.
 * @param {string} userId
 * @param {string} weekStart - ISO date YYYY-MM-DD
 * @returns {Promise<Object|null>}
 */
export async function getReflection(userId, weekStart = getStartOfWeekDateString()) {
  if (!userId) return null;
  const list = await getReflectionsRaw(userId);
  return list.find((r) => r.weekStart === weekStart) || null;
}

/**
 * Retrieve all historical reflections for a user, sorted newest week first.
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getReflections(userId) {
  if (!userId) return [];
  const list = await getReflectionsRaw(userId);
  return [...list].sort((a, b) => (b.weekStart || '').localeCompare(a.weekStart || ''));
}

/**
 * Check if a reflection exists for a specific week.
 * @param {string} userId
 * @param {string} weekStart
 * @returns {Promise<boolean>}
 */
export async function hasReflection(userId, weekStart = getStartOfWeekDateString()) {
  const ref = await getReflection(userId, weekStart);
  if (!ref) return false;
  return Boolean(ref.worked || ref.struggled || ref.lesson || ref.nextWeek);
}

/**
 * Create or update a weekly reflection.
 * @param {string} userId
 * @param {string} weekStart
 * @param {Object} data - { worked, struggled, lesson, nextWeek }
 * @returns {Promise<Object>}
 */
export async function saveReflection(userId, weekStart = getStartOfWeekDateString(), data = {}) {
  if (!userId) throw new Error('[grindReflections] saveReflection requires userId');

  const list = await getReflectionsRaw(userId);
  const now = new Date().toISOString();
  const existingIndex = list.findIndex((r) => r.weekStart === weekStart);

  let record;
  if (existingIndex >= 0) {
    record = {
      ...list[existingIndex],
      worked: (data.worked ?? list[existingIndex].worked ?? '').trim(),
      struggled: (data.struggled ?? list[existingIndex].struggled ?? '').trim(),
      lesson: (data.lesson ?? list[existingIndex].lesson ?? '').trim(),
      nextWeek: (data.nextWeek ?? list[existingIndex].nextWeek ?? '').trim(),
      updatedAt: now,
    };
    list[existingIndex] = record;
  } else {
    record = {
      id: `reflection_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      weekStart,
      worked: (data.worked || '').trim(),
      struggled: (data.struggled || '').trim(),
      lesson: (data.lesson || '').trim(),
      nextWeek: (data.nextWeek || '').trim(),
      createdAt: now,
      updatedAt: now,
    };
    list.push(record);
  }

  await setReflectionsRaw(userId, list);
  return record;
}

/**
 * Delete a reflection.
 */
export async function deleteReflection(userId, weekStart) {
  if (!userId || !weekStart) return;
  const list = await getReflectionsRaw(userId);
  const filtered = list.filter((r) => r.weekStart !== weekStart);
  await setReflectionsRaw(userId, filtered);
}

/**
 * Clear all reflections (for account logout/reset).
 */
export async function clearReflections(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(getStoreKey(userId));
  } catch (err) {
    console.warn('[grindReflections] clearReflections error', err);
  }
}
