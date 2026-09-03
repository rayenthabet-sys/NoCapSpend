// ─────────────────────────────────────────────────────────────────
// NoCapSpend — User-Scoped Preferences Store
// User-namespaced AsyncStorage preferences (reduced motion, etc.)
// Ensures no preference leakage across user accounts.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@bb_cache_';
const BUCKET_REDUCED_MOTION = 'reduced_motion';

function getPreferenceStoreKey(userId, bucket) {
  if (!userId) return null;
  return `${PREFIX}${userId}:${bucket}`;
}

const reducedMotionListeners = new Set();

/**
 * Read the user-scoped reduced motion preference.
 * Defaults to false if not set or invalid.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function getReducedMotionPreference(userId) {
  if (!userId) return false;
  try {
    const key = getPreferenceStoreKey(userId, BUCKET_REDUCED_MOTION);
    if (!key) return false;
    const val = await AsyncStorage.getItem(key);
    return val === 'true';
  } catch (err) {
    console.warn('[preferences] getReducedMotionPreference error:', err);
    return false;
  }
}

/**
 * Persist the user-scoped reduced motion preference and notify subscribers.
 *
 * @param {string} userId
 * @param {boolean} enabled
 * @returns {Promise<void>}
 */
export async function setReducedMotionPreference(userId, enabled) {
  if (!userId) return;
  try {
    const key = getPreferenceStoreKey(userId, BUCKET_REDUCED_MOTION);
    if (!key) return;
    await AsyncStorage.setItem(key, enabled ? 'true' : 'false');
    reducedMotionListeners.forEach((listener) => {
      try {
        listener(enabled);
      } catch (e) {
        console.warn('[preferences] listener callback error:', e);
      }
    });
  } catch (err) {
    console.warn('[preferences] setReducedMotionPreference error:', err);
  }
}

/**
 * Subscribe to real-time reduced motion changes.
 *
 * @param {(enabled: boolean) => void} listener
 * @returns {() => void} unsubscribe function
 */
export function subscribeToReducedMotion(listener) {
  reducedMotionListeners.add(listener);
  return () => {
    reducedMotionListeners.delete(listener);
  };
}
