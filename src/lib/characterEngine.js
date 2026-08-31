
// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Character & UX Event Engine
// Presentation / UX Logic Only.
// Consumes already-computed financial metrics.
// Never calculates or redefines financial truth.
// ─────────────────────────────────────────────────────────────────

import { getRandomDialogue } from './characterReactions';

// ── Configurable UX Parameters (Tunable, Isolated from Financial Rules) ──
export const CONFIG = {
  // Available savings needed to activate Ed Wuncler wealth state (500 DT)
  ED_WEALTH_THRESHOLD: 500,

  // Stinkmeaner triggers on expenses STRICTLY GREATER THAN this flat threshold.
  // 25.00 DT  → Riley
  // 25.01 DT  → Stinkmeaner
  // No cooldown. Every qualifying expense triggers Stinkmeaner.
  STINKMEANER_EXPENSE_THRESHOLD: 25,

  // Ratio kept for reference but NO LONGER used for character selection.
  // Retained so external code reading CONFIG does not break.
  LARGE_EXPENSE_RATIO: 0.10,
  LARGE_EXPENSE_FLAT: 25,

  // Goals hosting behavior
  JAZMINE_PERSISTENT_GOALS_HOST: true,
};

/**
 * Pure Priority-Resolver & Event Classifier.
 * Evaluates already-computed financial conditions in strict P0–P7 priority order.
 * Accepts optional daily-budget context from the calling screen.
 *
 * @param {Object}  [context]
 * @param {number}  [context.incomeTotal]
 * @param {number}  [context.expenseTotal]
 * @param {number}  [context.remaining]
 * @param {number}  [context.availableSavings]
 * @param {number}  [context.lastExpenseAmount]
 * @param {Object}  [context.budgetStatus]
 * @param {Object}  [context.goalStatus]
 * @param {boolean} [context.isStatisticsActive]
 * @param {string}  [context.eventTrigger]
 *
 * Daily budget context (optional, provided by screen):
 * @param {number}  [context.dailySpent]
 * @param {number}  [context.dailyBudget]
 * @param {number}  [context.dailyBudgetRatio]   — dailySpent / dailyBudget
 * @param {boolean} [context.isDailyBudgetExceeded]
 *
 * @returns {Object} character state descriptor
 */
export function resolveCharacterState(context = {}) {
  const {
    incomeTotal    = 0,
    expenseTotal   = 0,
    remaining      = 0,
    availableSavings = 0,
    lastExpenseAmount = 0,
    budgetStatus   = null,
    goalStatus     = null,
    isStatisticsActive = false,
    eventTrigger   = 'none',
    // ── Daily budget context ──
    dailySpent     = 0,
    dailyBudget    = null,
    dailyBudgetRatio = 0,
    isDailyBudgetExceeded = false,
  } = context;

  // ── Monthly budget ratios ───────────────────────────────────────
  const budgetRatio = budgetStatus && budgetStatus.effective > 0
    ? (budgetStatus.spent / budgetStatus.effective)
    : 0;

  const isOverBudget     = remaining < 0 || (budgetStatus && budgetStatus.isOverBudget) || budgetRatio > 1.0;
  const isCriticalBudget = budgetRatio >= 0.95 && budgetRatio <= 1.0;
  const isBudgetWarning  = budgetRatio >= 0.80 && budgetRatio < 0.95;
  const isGoalComplete   = goalStatus && goalStatus.isComplete;

  // ── Daily budget ratios ─────────────────────────────────────────
  const isDailyCritical = dailyBudget && dailyBudgetRatio >= 0.95 && dailyBudgetRatio < 1.0;
  const isDailyWarning  = dailyBudget && dailyBudgetRatio >= 0.80 && dailyBudgetRatio < 0.95;

  // ── P0: Emergency / Budget Breach (monthly OR daily) ───────────
  if (isOverBudget || isDailyBudgetExceeded) {
    return {
      characterKey: 'ruckus',
      assetId:      'ruckus_emergency',
      animationType: 'webp',
      reactionText: getRandomDialogue('ruckus', 'critical'),
      shake:    true,
      pulse:    false,
      durationMs: 5000,
      mode:     'persistent',
    };
  }

  // ── P1: Goal Reached Milestone ──────────────────────────────────
  if (isGoalComplete || (eventTrigger === 'goalContributed' && goalStatus && goalStatus.current >= goalStatus.target)) {
    return {
      characterKey: 'jazmine',
      assetId:      'jazmine_complete',
      animationType: 'webp',
      reactionText: getRandomDialogue('jazmine', 'complete'),
      shake:    false,
      pulse:    true,
      durationMs: 3900,
      mode:     'temporary',
    };
  }

  // ── P2: Critical Threshold 95–100% (monthly OR daily) ──────────
  // Per locked directive: 95–100% is ALWAYS RUCKUS, never Tom.
  if (isCriticalBudget || isDailyCritical) {
    return {
      characterKey: 'ruckus',
      assetId:      'ruckus_alarm',
      animationType: 'webp',
      reactionText: getRandomDialogue('ruckus', 'critical'),
      shake:    true,
      pulse:    false,
      durationMs: 5000,
      mode:     'persistent',
    };
  }

  // ── P3: Sustained Wealth State (Ed Wuncler III) ─────────────────
  if (availableSavings >= CONFIG.ED_WEALTH_THRESHOLD && !isBudgetWarning && !isDailyWarning && remaining >= 0) {
    return {
      characterKey: 'ed',
      assetId:      'ed_wealth',
      animationType: 'native',
      reactionText: getRandomDialogue('ed', 'wealth'),
      shake:    false,
      pulse:    false,
      durationMs: 3500,
      mode:     'persistent',
    };
  }

  // ── P4: Budget Pressure Warning 80–94% (monthly OR daily) ──────
  if (isBudgetWarning || isDailyWarning) {
    return {
      characterKey: 'tom',
      assetId:      'tom_caution',
      animationType: 'native',
      reactionText: getRandomDialogue('tom', 'warning'),
      shake:    false,
      pulse:    false,
      durationMs: 3500,
      mode:     'temporary',
    };
  }

  // ── P5: Statistics Screen Active (Huey Freeman) ─────────────────
  if (isStatisticsActive) {
    return {
      characterKey: 'huey',
      assetId:      'huey_neutral',
      animationType: 'native',
      reactionText: getRandomDialogue('huey', 'analytics'),
      shake:    false,
      pulse:    false,
      durationMs: 0,
      mode:     'persistent',
    };
  }

  // ── P6a: Consequential Expense (Stinkmeaner) ────────────────────
  // Rule: expense STRICTLY GREATER THAN 25 DT → Stinkmeaner.
  // No cooldown. No ratio. No repeated-spend check. Every single time.
  if (eventTrigger === 'expenseAdded' && lastExpenseAmount > CONFIG.STINKMEANER_EXPENSE_THRESHOLD) {
    return {
      characterKey: 'stinkmeaner',
      assetId:      'stink_stern',
      animationType: 'webp',
      reactionText: getRandomDialogue('stinkmeaner', 'consequential'),
      shake:    true,
      pulse:    false,
      durationMs: 4200,
      mode:     'temporary',
    };
  }

  // ── P6b: Cash-In Transaction (A Pimp Named Slickback) ───────────
  if (eventTrigger === 'incomeAdded') {
    const isBigCash = incomeTotal >= 100; // 100 DT threshold
    return {
      characterKey: 'slickback',
      assetId:      isBigCash ? 'slickback_bigcash' : 'slickback_cash',
      animationType: 'webp',
      reactionText: isBigCash
        ? getRandomDialogue('slickback', 'bigIncome')
        : getRandomDialogue('slickback', 'income'),
      shake:    false,
      pulse:    true,
      durationMs: 2900,
      mode:     'temporary',
    };
  }

  // ── P6c: Light / Discretionary Expense (Riley Freeman) ──────────
  // Catches all expenses ≤ 25 DT that didn't trigger Stinkmeaner.
  if (eventTrigger === 'expenseAdded') {
    return {
      characterKey: 'riley',
      assetId:      'riley_light',
      animationType: 'native',
      reactionText: getRandomDialogue('riley', 'lightSpend'),
      shake:    false,
      pulse:    false,
      durationMs: 2500,
      mode:     'temporary',
    };
  }

  // ── P7: Baseline / Default Host (Robert Freeman) ────────────────
  return {
    characterKey: 'robert',
    assetId:      'robert_neutral',
    animationType: 'native',
    reactionText: getRandomDialogue('robert', 'default'),
    shake:    false,
    pulse:    false,
    durationMs: 0,
    mode:     'persistent',
  };
}
