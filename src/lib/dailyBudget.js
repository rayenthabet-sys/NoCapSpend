// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Daily Budget Utility
// Preference storage (AsyncStorage) + today's spending query.
// NOT a financial engine. Does NOT duplicate financial calculations.
// Imports supabase for READ-ONLY expense query only.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const DAILY_BUDGET_KEY     = '@budget_buddy:daily_budget';
const DAILY_LOCK_KEY       = '@budget_buddy:daily_expense_lock';
const CYCLE_START_DAY_KEY  = '@budget_buddy:cycle_start_day';

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

/** Returns the configured budget cycle start day (1 to 28). Default: 1 (1st of the month). */
export async function getCycleStartDay() {
  const val = await AsyncStorage.getItem(CYCLE_START_DAY_KEY);
  if (val === null) return 1;
  const parsed = parseInt(val, 10);
  return (isNaN(parsed) || parsed < 1 || parsed > 28) ? 1 : parsed;
}

/** Persist the budget cycle start day (1 to 28). */
export async function setCycleStartDay(day) {
  const num = parseInt(String(day), 10);
  if (isNaN(num) || num < 1 || num > 28) {
    throw new Error('Cycle start day must be between 1 and 28.');
  }
  await AsyncStorage.setItem(CYCLE_START_DAY_KEY, String(num));
}

/**
 * Calculates the start and end dates ('YYYY-MM-DD') of the current budget cycle.
 * Default cycleStartDay is 1 (calendar month 1st to last day).
 *
 * @param {number} [cycleStartDay=1]
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ startDate: string, endDate: string }}
 */
export function getCycleDateRange(cycleStartDay = 1, referenceDate = new Date()) {
  const day = Math.min(Math.max(1, parseInt(String(cycleStartDay), 10) || 1), 28);
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  const d = referenceDate.getDate();

  let startYear = y;
  let startMonth = m;

  if (d < day) {
    // Current cycle started on day 'day' of previous month
    startMonth = m - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = y - 1;
    }
  }

  const endYear = startMonth === 11 ? startYear + 1 : startYear;
  const endMonth = (startMonth + 1) % 12;

  const pad = (n) => String(n).padStart(2, '0');
  const startDateStr = `${startYear}-${pad(startMonth + 1)}-${pad(day)}`;

  let endDateStr;
  if (day === 1) {
    const lastDayOfStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
    endDateStr = `${startYear}-${pad(startMonth + 1)}-${pad(lastDayOfStartMonth)}`;
  } else {
    endDateStr = `${endYear}-${pad(endMonth + 1)}-${pad(day - 1)}`;
  }

  return { startDate: startDateStr, endDate: endDateStr };
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

/**
 * Calculates the informational monthly daily carryover balance.
 * Formula: Cumulative sum of (dailyBudget - daySpending) from day 1 to today.
 *
 * CRITICAL PRODUCT RULE:
 * This number is purely INFORMATIONAL.
 * It MUST NOT modify, reduce, increase, replace, or alter the configured daily budget.
 *
 * @param {string} userId
 * @param {number|null} dailyBudget
 * @param {Array<Object>} [expensesList] - Optional pre-loaded expenses
 * @returns {Promise<{ balance: number, label: string, type: 'shortfall' | 'surplus' | 'target' } | null>}
 */
export async function getMonthlyDailyCarryover(userId, dailyBudget, expensesList = null) {
  if (!userId || !dailyBudget || dailyBudget <= 0) return null;

  const now = new Date();
  const cycleStartDay = await getCycleStartDay();
  const { startDate } = getCycleDateRange(cycleStartDay, now);
  const todayStr = getTodayDateString();

  let expenses = expensesList;
  if (!expenses) {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', todayStr);

    if (error || !data) return null;
    expenses = data;
  }

  // Group spending by YYYY-MM-DD
  const spendingByDate = {};
  for (const exp of expenses) {
    const d = exp.date ? exp.date.slice(0, 10) : '';
    if (d) {
      spendingByDate[d] = (spendingByDate[d] || 0) + Number(exp.amount || 0);
    }
  }

  // Iterate day by day from startDate to todayStr
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ty, tm, td] = todayStr.split('-').map(Number);

  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ty, tm - 1, td);

  let cumulativeBalance = 0;
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const daySpent = spendingByDate[dateStr] || 0;
    cumulativeBalance += (dailyBudget - daySpent);
    cur.setDate(cur.getDate() + 1);
  }

  const roundedBalance = Math.round(cumulativeBalance * 100) / 100;

  if (roundedBalance < 0) {
    return {
      balance: roundedBalance,
      label: `${Math.abs(roundedBalance).toFixed(2)} DT SHORT`,
      type: 'shortfall',
    };
  } else if (roundedBalance > 0) {
    return {
      balance: roundedBalance,
      label: `${roundedBalance.toFixed(2)} DT SURPLUS`,
      type: 'surplus',
    };
  } else {
    return {
      balance: 0,
      label: 'ON TARGET',
      type: 'target',
    };
  }
}

