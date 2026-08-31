// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Daily Budget Utility
// Preference storage (AsyncStorage) + today's spending query.
// NOT a financial engine. Does NOT duplicate financial calculations.
// Imports supabase for READ-ONLY expense query only.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const DAILY_BUDGET_KEY  = '@budget_buddy:daily_budget';
const DAILY_LOCK_KEY    = '@budget_buddy:daily_expense_lock';

// ── Preference accessors ─────────────────────────────────────────

/** Returns the stored daily budget in DT, or null if not set. */
export async function getDailyBudget() {
  const val = await AsyncStorage.getItem(DAILY_BUDGET_KEY);
  if (val === null) return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Persist a new daily budget.
 * @throws if amount is invalid
 */
export async function setDailyBudget(amount) {
  const num = parseFloat(String(amount));
  if (!num || isNaN(num) || num <= 0) {
    throw new Error('Daily budget must be a number greater than 0.');
  }
  await AsyncStorage.setItem(DAILY_BUDGET_KEY, String(num));
}

/** Returns whether the daily expense lock is enabled. */
export async function getDailyLockEnabled() {
  const val = await AsyncStorage.getItem(DAILY_LOCK_KEY);
  return val === 'true';
}

/** Persist the daily expense lock enabled/disabled state. */
export async function setDailyLockEnabled(enabled) {
  await AsyncStorage.setItem(DAILY_LOCK_KEY, enabled ? 'true' : 'false');
}

// ── Date helper ──────────────────────────────────────────────────

/** Returns today's date as 'YYYY-MM-DD' in local time. */
export function getTodayDateString() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Today's spending ─────────────────────────────────────────────

/**
 * Reads actual expenses recorded today for the given user.
 * Uses a read-only query on the existing `expenses` table.
 * Midnight reset is automatic: a new day means a new date string → 0 total.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getTodaySpending(userId) {
  const today = getTodayDateString();
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('user_id', userId)
    .eq('date', today);

  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + Number(row.amount), 0);
}

// ── Status calculator ────────────────────────────────────────────

/**
 * Given spent and budget amounts, returns the daily status object.
 * This is pure arithmetic — no financial rules, just thresholds for UI.
 *
 * States:
 *   'normal'    — 0–79%
 *   'caution'   — 80–94%
 *   'critical'  — 95–100%
 *   'exceeded'  — >100%
 *   'no_budget' — daily budget not set
 *
 * @param {number} dailySpent
 * @param {number|null} dailyBudget
 */
export function getDailyStatus(dailySpent, dailyBudget) {
  if (!dailyBudget || dailyBudget <= 0) {
    return { ratio: 0, pct: 0, state: 'no_budget', remaining: null };
  }
  const ratio     = dailySpent / dailyBudget;
  const pct       = Math.round(ratio * 100);
  const remaining = Math.max(0, dailyBudget - dailySpent);
  let state;
  if (ratio >= 1)    state = 'exceeded';
  else if (ratio >= 0.95) state = 'critical';
  else if (ratio >= 0.80) state = 'caution';
  else                    state = 'normal';
  return { ratio, pct, state, remaining };
}
