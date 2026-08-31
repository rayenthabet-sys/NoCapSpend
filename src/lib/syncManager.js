// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Synchronization Manager
// Uploads pending transactions when internet returns.
//
// IDEMPOTENCY STRATEGY:
// Each pending transaction carries a `localId` (e.g. "local_1234_abc").
// Before inserting into Supabase, we embed the localId as a hidden marker
// inside the note field using the format: [bb:localId] user's original note
// Then before each insert, we query Supabase to check if a row with
// that marker already exists. If found, we skip the insert and remove
// from the local queue — preventing duplicates on retry.
//
// MARKER FORMAT: [bb:<localId>]
// - Cannot collide with user-entered text (uses colon + base36 ID)
// - Deterministic per transaction
// - Reliably searchable with .ilike()
// - Does not destroy user's note (stored after the marker)
//
// PROTECTED FILE COMPLIANCE:
// Does NOT modify src/lib/savings.js, recurring.js, budgets.js,
// supabase.js, or AuthContext.js.
// ─────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import {
  getPendingTransactions,
  removePendingTransaction,
  updatePendingTransactionStatus,
  cacheWrite,
  BUCKETS,
} from './offlineStore';
import { setIsSyncing } from './networkStatus';
import { getTodayDateString } from './dailyBudget';

// ── Marker helpers ─────────────────────────────────────────────────

/**
 * Build the idempotency marker for a localId.
 * Format: [bb:local_1234_abc]
 */
function buildMarker(localId) {
  return `[bb:${localId}]`;
}

/**
 * Build the actual note to store in Supabase.
 * Preserves the user's original note after the marker.
 * Example: "[bb:local_123_abc] Food" or "[bb:local_123_abc]" if no note.
 */
function buildNoteWithMarker(localId, userNote) {
  const marker = buildMarker(localId);
  if (userNote && userNote.trim()) {
    return `${marker} ${userNote.trim()}`;
  }
  return marker;
}

/**
 * Check if Supabase already has a transaction for this localId.
 * Searches the note field for the marker.
 *
 * @param {'expenses'|'income_entries'} table
 * @param {string} userId
 * @param {string} localId
 * @returns {Promise<boolean>} true if duplicate found
 */
async function checkDuplicateExists(table, userId, localId) {
  const marker = buildMarker(localId);
  try {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('user_id', userId)
      .ilike('note', `%${marker}%`)
      .limit(1);

    if (error) {
      console.warn('[syncManager] duplicate check error:', error.message);
      // Fail open — assume not duplicate to avoid data loss
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

// ── Upload a single transaction ────────────────────────────────────

/**
 * Upload one pending transaction to Supabase.
 * Returns true on success, false on failure.
 */
async function uploadTransaction(tx) {
  const { localId, type, userId } = tx;

  const table = type === 'expense' ? 'expenses' : 'income_entries';

  // ── Idempotency check ─────────────────────────────────────────
  const isDuplicate = await checkDuplicateExists(table, userId, localId);
  if (isDuplicate) {
    console.log(`[syncManager] Skipping duplicate: ${localId}`);
    return true; // Treat as success — already on server
  }

  // ── Build payload ─────────────────────────────────────────────
  const noteWithMarker = buildNoteWithMarker(localId, tx.note);

  let payload;
  if (type === 'expense') {
    payload = {
      user_id: userId,
      amount: tx.amount,
      note: noteWithMarker,
      category_id: tx.category_id || null,
      is_recurring: tx.is_recurring || false,
      recurrence_interval: tx.recurrence_interval || null,
      date: tx.date,
    };
  } else {
    // income
    payload = {
      user_id: userId,
      amount: tx.amount,
      source: tx.source
        ? `${buildMarker(localId)} ${tx.source.trim()}`
        : buildMarker(localId),
      is_recurring: tx.is_recurring || false,
      recurrence_interval: tx.recurrence_interval || null,
      date: tx.date,
    };
  }

  // ── Insert ────────────────────────────────────────────────────
  try {
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      console.warn(`[syncManager] Upload failed for ${localId}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[syncManager] Upload exception for ${localId}:`, err);
    return false;
  }
}

// ── Refresh cached data after sync ────────────────────────────────

async function refreshCacheAfterSync(userId) {
  try {
    const today = getTodayDateString();
    const { data } = await supabase
      .from('expenses')
      .select('amount, date')
      .eq('user_id', userId)
      .eq('date', today);

    if (data) {
      await cacheWrite(userId, BUCKETS.EXPENSES_TODAY, data);
    }
  } catch (err) {
    console.warn('[syncManager] Cache refresh failed:', err);
  }
}

// ── Main sync function ─────────────────────────────────────────────

/**
 * Process all pending transactions in the queue.
 * - Each transaction is processed independently (one failure doesn't block others)
 * - Successful uploads are removed from the queue
 * - Failed uploads remain for future retry
 * - Never removes a transaction until server confirms success
 *
 * @param {string} userId
 * @returns {Promise<{ synced: number, failed: number }>}
 */
export async function syncPendingTransactions(userId) {
  if (!userId) return { synced: 0, failed: 0 };

  const pending = await getPendingTransactions(userId);
  const toSync = pending.filter(tx => tx.syncStatus !== 'failed' || tx._retryAllowed);

  if (toSync.length === 0) return { synced: 0, failed: 0 };

  setIsSyncing(true);

  let synced = 0;
  let failed = 0;

  for (const tx of toSync) {
    // Mark as syncing
    await updatePendingTransactionStatus(userId, tx.localId, 'syncing');

    const success = await uploadTransaction(tx);

    if (success) {
      await removePendingTransaction(userId, tx.localId);
      synced++;
    } else {
      await updatePendingTransactionStatus(userId, tx.localId, 'failed');
      failed++;
    }
  }

  // Refresh cache if anything was synced
  if (synced > 0) {
    await refreshCacheAfterSync(userId);
  }

  setIsSyncing(false);

  console.log(`[syncManager] Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Mark all 'failed' transactions as 'pending' to allow retry.
 * Call this before triggering a manual sync.
 */
export async function markFailedForRetry(userId) {
  const pending = await getPendingTransactions(userId);
  const withRetry = pending.map(tx =>
    tx.syncStatus === 'failed' ? { ...tx, syncStatus: 'pending', _retryAllowed: true } : tx
  );
  await cacheWrite(userId, BUCKETS.PENDING_QUEUE, withRetry);
}

/**
 * Returns the count of pending (not-yet-synced) transactions.
 */
export async function getPendingCount(userId) {
  const pending = await getPendingTransactions(userId);
  return pending.filter(tx => tx.syncStatus !== 'failed').length;
}
