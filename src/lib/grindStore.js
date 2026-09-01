// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Local Store
// User-namespaced AsyncStorage cache for personal accountability goals.
// Isolated from financial tables and ledger logic.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@bb_cache_';
const BUCKET_GRIND_GOALS = 'GRIND_GOALS';

function getStoreKey(userId) {
  if (!userId) throw new Error('[grindStore] userId is required for storage operations');
  return `${PREFIX}${userId}:${BUCKET_GRIND_GOALS}`;
}

/**
 * Generate a local deterministic ID for Grind goals.
 * Format: grind_local_<timestamp>_<random>
 */
export function generateGrindLocalId() {
  return `grind_local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Retrieve all Grind goals for a user.
 * @param {string} userId
 * @returns {Promise<Array>} Array of goal objects
 */
export async function getGrindGoals(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(getStoreKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Sort by sortOrder ascending, then createdAt descending
    return list.sort((a, b) => {
      const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  } catch (err) {
    console.warn('[grindStore] getGrindGoals failed', err);
    return [];
  }
}

/**
 * Retrieve a single Grind goal by ID.
 * @param {string} userId
 * @param {string} goalId
 * @returns {Promise<Object|null>}
 */
export async function getGrindGoalById(userId, goalId) {
  if (!userId || !goalId) return null;
  const goals = await getGrindGoals(userId);
  return goals.find((g) => g.id === goalId) || null;
}

/**
 * Save a new Grind goal.
 * @param {string} userId
 * @param {Object} goalData
 * @returns {Promise<Object>} Created goal
 */
export async function saveGrindGoal(userId, goalData) {
  if (!userId) throw new Error('[grindStore] userId is required to save goal');

  const title = (goalData.title || '').trim();
  if (!title) throw new Error('Goal title cannot be empty');

  const now = new Date().toISOString();
  const newGoal = {
    id: goalData.id || generateGrindLocalId(),
    userId,
    title,
    description: (goalData.description || '').trim(),
    goalType: goalData.goalType || 'repetition', // 'repetition' | 'daily' | 'quantity' | 'once'
    targetCount: Math.max(1, parseInt(goalData.targetCount, 10) || 1),
    targetUnit: (goalData.targetUnit || 'times').trim(),
    frequencyPeriod: goalData.frequencyPeriod || 'weekly', // 'weekly' | 'daily'
    category: (goalData.category || 'General').trim(),
    isFinancialRule: Boolean(goalData.isFinancialRule),
    isArchived: Boolean(goalData.isArchived),
    sortOrder: parseInt(goalData.sortOrder, 10) || 0,
    createdAt: goalData.createdAt || now,
    updatedAt: now,
  };

  const goals = await getGrindGoals(userId);
  goals.unshift(newGoal);

  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(goals));
  return newGoal;
}

/**
 * Update an existing Grind goal.
 * @param {string} userId
 * @param {string} goalId
 * @param {Object} updates
 * @returns {Promise<Object|null>} Updated goal
 */
export async function updateGrindGoal(userId, goalId, updates) {
  if (!userId || !goalId) return null;

  const goals = await getGrindGoals(userId);
  const index = goals.findIndex((g) => g.id === goalId);
  if (index === -1) return null;

  const existing = goals[index];
  const now = new Date().toISOString();

  const updatedGoal = {
    ...existing,
    ...updates,
    id: existing.id,
    userId,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    description: updates.description !== undefined ? updates.description.trim() : existing.description,
    targetCount: updates.targetCount !== undefined ? Math.max(1, parseInt(updates.targetCount, 10) || 1) : existing.targetCount,
    updatedAt: now,
  };

  if (!updatedGoal.title) throw new Error('Goal title cannot be empty');

  goals[index] = updatedGoal;
  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(goals));
  return updatedGoal;
}

/**
 * Archive or unarchive a Grind goal.
 * @param {string} userId
 * @param {string} goalId
 * @param {boolean} [isArchived=true]
 * @returns {Promise<Object|null>}
 */
export async function archiveGrindGoal(userId, goalId, isArchived = true) {
  return updateGrindGoal(userId, goalId, { isArchived });
}

/**
 * Delete a Grind goal permanently.
 * @param {string} userId
 * @param {string} goalId
 * @returns {Promise<boolean>}
 */
export async function deleteGrindGoal(userId, goalId) {
  if (!userId || !goalId) return false;

  const goals = await getGrindGoals(userId);
  const filtered = goals.filter((g) => g.id !== goalId);

  if (filtered.length === goals.length) return false;

  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(filtered));
  return true;
}

/**
 * Clear all Grind goals for a user.
 * @param {string} userId
 */
export async function clearGrindGoals(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(getStoreKey(userId));
  } catch (err) {
    console.warn('[grindStore] clearGrindGoals failed', err);
  }
}
