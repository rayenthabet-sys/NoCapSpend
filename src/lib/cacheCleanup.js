// ─────────────────────────────────────────────────────────────────
// NoCapSpend — Safe Cache Cleanup Utility (S5)
// Removes disposable server-cached snapshots on logout while strictly
// protecting unsynced offline transactions and user preferences.
// ─────────────────────────────────────────────────────────────────

import AsyncStorageRaw from '@react-native-async-storage/async-storage';

const AsyncStorage = (AsyncStorageRaw && AsyncStorageRaw.default && AsyncStorageRaw.default.multiRemove)
  ? AsyncStorageRaw.default
  : AsyncStorageRaw;

const PREFIX = '@bb_cache_';

/**
 * Disposable cache buckets that store temporary cached server responses.
 * Safe to clear on logout so private financial data is not left on device.
 */
export const DISPOSABLE_CACHE_BUCKETS = [
  'dashboard',
  'expenses_today',
  'categories',
  'goals',
  'budgets',
  'stats',
];

/**
 * Safely clears ONLY disposable server snapshots for the logged-out user.
 *
 * CRITICAL S5 SECURITY INVARIANTS:
 * 1. NEVER deletes '@bb_cache_${userId}:pending_queue' (unsynced transactions must survive logout).
 * 2. NEVER deletes user preferences ('DAILY_BUDGET', 'DAILY_EXPENSE_LOCK', 'CYCLE_START_DAY', 'reduced_motion').
 * 3. NEVER deletes Grind personal records ('GRIND_*').
 * 4. NEVER touches another user's namespace.
 *
 * @param {string} userId - The Supabase user UUID to clear disposable cache for.
 */
export async function clearDisposableUserCache(userId) {
  if (!userId || typeof userId !== 'string') {
    return;
  }

  try {
    const keysToRemove = DISPOSABLE_CACHE_BUCKETS.map(
      (bucket) => `${PREFIX}${userId}:${bucket}`
    );
    await AsyncStorage.multiRemove(keysToRemove);
  } catch (err) {
    console.warn('[cacheCleanup] clearDisposableUserCache failed:', err);
  }
}

/**
 * Returns the list of disposable buckets (useful for audit and test assertions).
 */
export function getDisposableBuckets() {
  return [...DISPOSABLE_CACHE_BUCKETS];
}
