// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Offline Store
// Local cache + pending transaction queue using AsyncStorage.
// All keys are namespaced by userId to prevent cross-user data leakage.
//
// SECURITY: never allow User A's data to appear for User B.
// Every public function requires a valid userId.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from './dailyBudget';

// ── Key helpers ────────────────────────────────────────────────────

const PREFIX = '@bb_cache_';

function key(userId, bucket) {
  if (!userId) throw new Error('[offlineStore] userId is required');
  return `${PREFIX}${userId}:${bucket}`;
}

// ── Generic cache read/write ───────────────────────────────────────

/**
 * Write any JSON-serializable value to the user-namespaced cache.
 */
export async function cacheWrite(userId, bucket, data) {
  try {
    await AsyncStorage.setItem(key(userId, bucket), JSON.stringify(data));
  } catch (err) {
    console.warn('[offlineStore] cacheWrite failed', bucket, err);
  }
}

/**
 * Read a value from the user-namespaced cache.
 * Returns null if missing or parse error.
 */
export async function cacheRead(userId, bucket) {
  try {
    const raw = await AsyncStorage.getItem(key(userId, bucket));
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[offlineStore] cacheRead failed', bucket, err);
    return null;
  }
}

/**
 * Remove a single cache bucket for this user.
 */
export async function cacheRemove(userId, bucket) {
  try {
    await AsyncStorage.removeItem(key(userId, bucket));
  } catch {}
}

/**
 * Clear ALL cached data for a user (call on logout).
 * Removes dashboard, expenses_today, categories, goals, budgets, stats, pending_queue.
 */
export async function clearUserCache(userId) {
  const buckets = [
    'dashboard', 'expenses_today', 'categories',
    'goals', 'budgets', 'stats', 'pending_queue',
  ];
  try {
    await AsyncStorage.multiRemove(buckets.map(b => key(userId, b)));
  } catch (err) {
    console.warn('[offlineStore] clearUserCache failed', err);
  }
}

// ── Named Cache Helpers ────────────────────────────────────────────

export const BUCKETS = {
  DASHBOARD:      'dashboard',
  EXPENSES_TODAY: 'expenses_today',
  CATEGORIES:     'categories',
  GOALS:          'goals',
  BUDGETS:        'budgets',
  STATS:          'stats',
  PENDING_QUEUE:  'pending_queue',
};

// ── Pending Transaction Queue ──────────────────────────────────────

/**
 * Generate a locally unique transaction ID.
 * Format: local_<timestamp>_<random>
 * Deterministic enough for idempotency checks.
 */
export function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get all pending transactions for a user.
 * @returns {Promise<Array>}
 */
export async function getPendingTransactions(userId) {
  const queue = await cacheRead(userId, BUCKETS.PENDING_QUEUE);
  return Array.isArray(queue) ? queue : [];
}

/**
 * Add a new pending transaction to the queue.
 * @param {string} userId
 * @param {Object} tx — must include localId, type, amount, date, userId
 */
export async function addPendingTransaction(userId, tx) {
  const queue = await getPendingTransactions(userId);
  queue.push({ ...tx, userId, createdAt: new Date().toISOString(), syncStatus: 'pending' });
  await cacheWrite(userId, BUCKETS.PENDING_QUEUE, queue);
}

/**
 * Remove a transaction from the queue by localId.
 * Only call after confirmed server-side success.
 */
export async function removePendingTransaction(userId, localId) {
  const queue = await getPendingTransactions(userId);
  const filtered = queue.filter(tx => tx.localId !== localId);
  await cacheWrite(userId, BUCKETS.PENDING_QUEUE, filtered);
}

/**
 * Update the syncStatus of a pending transaction.
 * @param {'pending'|'syncing'|'failed'} status
 */
export async function updatePendingTransactionStatus(userId, localId, status) {
  const queue = await getPendingTransactions(userId);
  const updated = queue.map(tx =>
    tx.localId === localId ? { ...tx, syncStatus: status } : tx
  );
  await cacheWrite(userId, BUCKETS.PENDING_QUEUE, updated);
}

// ── Offline-Aware Today Spending ───────────────────────────────────

/**
 * Computes today's total spending including:
 *   1. Cached server-side expenses for today
 *   2. Pending offline expenses for today
 *
 * Called by screens when offline to avoid Supabase read.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getOfflineTodaySpending(userId) {
  const today = getTodayDateString();
  const cached = (await cacheRead(userId, BUCKETS.EXPENSES_TODAY)) || [];
  const pending = await getPendingTransactions(userId);

  const cachedToday = cached
    .filter(row => row.date === today)
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const pendingToday = pending
    .filter(tx =>
      tx.type === 'expense' &&
      tx.date === today &&
      tx.syncStatus !== 'failed'
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  return cachedToday + pendingToday;
}

/**
 * Get pending expenses for today only (for daily lock and meter display).
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getPendingTodaySpending(userId) {
  const today = getTodayDateString();
  const pending = await getPendingTransactions(userId);
  return pending
    .filter(tx =>
      tx.type === 'expense' &&
      tx.date === today &&
      tx.syncStatus !== 'failed'
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
}
