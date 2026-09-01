// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Contextual Advice Phrase System
// Boondocks Mode inspirational / motivational copy.
//
// RULES:
// • Pure data + pure functions. No UI. No state mutation.
// • resolveAdviceState() READS already-computed financial metrics.
//   It does NOT calculate budgets, savings, transactions, or goals.
// • Phrase arrays are indexed by a stable stateKey string.
//   Callers memoize on stateKey to prevent phrase rotation on re-render.
//
// Priority order for resolveAdviceState():
//   1. exceeded  — over budget (monthly or daily)
//   2. goalDone  — a goal is 100% funded
//   3. critical  — 95–100% of budget used
//   4. goalNear  — goal ≥ 80% funded (not yet complete)
//   5. wealth    — available savings ≥ 500 DT
//   6. pressure  — budget warning 80–94% used
//   7. noIncome  — income is 0 this month
//   8. surplus   — everything else (healthy / default)
// ─────────────────────────────────────────────────────────────────

/** @type {Record<string, string[]>} */
const PHRASES = {
  exceeded: [
    "YOU ALREADY BLEW IT. STOP SPENDING.",
    "BUDGET GONE. PUT THE CARD DOWN, KING.",
    "WE IN THE RED. NO MORE MOVES TODAY.",
    "LIMIT EXCEEDED. THAT'S A PROBLEM.",
    "YOU BROKE THE BUDGET. NOW FIX IT.",
  ],
  goalDone: [
    "GOAL SECURED. WHAT'S NEXT?",
    "TARGET HIT. STACK ANOTHER ONE.",
    "MONEY LOCKED IN. MISSION ACCOMPLISHED.",
    "THAT GOAL IS DONE. KING BEHAVIOR.",
    "SAVED IT. NOW DON'T TOUCH IT.",
  ],
  critical: [
    "ONE MORE SWIPE AND IT'S OVER.",
    "ALMOST AT THE LIMIT. PUMP THE BRAKES.",
    "YOU ARE THIS CLOSE TO GOING OVER.",
    "SLOW DOWN — THE BUDGET IS ALMOST GONE.",
    "CRITICAL ZONE. EVERY DT COUNTS RIGHT NOW.",
  ],
  goalNear: [
    "SO CLOSE. DON'T TOUCH THAT MONEY.",
    "ALMOST THERE ON YOUR GOAL. HOLD TIGHT.",
    "KEEP YOUR HANDS OFF THOSE SAVINGS.",
    "THAT GOAL IS RIGHT THERE. DON'T BLOW IT.",
    "FINISH STRONG. THE GOAL IS IN REACH.",
  ],
  wealth: [
    "PAPER STACKIN'. DON'T BLOW IT NOW.",
    "UNTOUCHABLE SURPLUS. KEEP IT THAT WAY.",
    "BANDS RIGHT. DON'T GET COMFORTABLE.",
    "YOU GOT THE BREAD. NOW PROTECT IT.",
    "WEALTH BUILDING. STAY DISCIPLINED, KING.",
  ],
  pressure: [
    "SLOW DOWN BEFORE YOU BREAK THE BANK.",
    "WATCH YO MONEY, KING. IT'S GETTING TIGHT.",
    "SPEND SMART, NOT STUPID.",
    "CAUTION ZONE. THINK BEFORE YOU SWIPE.",
    "THAT BUDGET IS FEELING PRESSURE. EASE UP.",
  ],
  noIncome: [
    "AIN'T NO MONEY IN. CHECK YO SOURCES.",
    "NO BAG IN YET. TIME TO GET TO WORK.",
    "INCOME AT ZERO. THAT'S NOT A VIBE.",
    "NO RACKS RECORDED. LOG YOUR INCOME.",
    "YOU CAN'T SPEND WHAT AIN'T THERE.",
  ],
  surplus: [
    "WATCH YO MONEY, KING.",
    "FINANCES LOOKIN' PROPER. STAY ON IT.",
    "IN THE GREEN. DON'T GET LAZY.",
    "BUDGET SOLID. KEEP THE MOMENTUM.",
    "CONTROLLED. DISCIPLINED. THAT'S THE WAY.",
  ],
};

/**
 * Returns a random phrase for the given state key.
 * Stable within a state — callers should memoize on stateKey.
 *
 * @param {string} stateKey
 * @returns {string}
 */
export function getAdvicePhrase(stateKey) {
  const pool = PHRASES[stateKey] || PHRASES.surplus;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Resolves the advice state key from already-computed financial metrics.
 * Follows explicit priority order (see module header).
 *
 * IMPORTANT: This function READS passed-in values only.
 * It does NOT query Supabase, recalculate financial totals, or mutate anything.
 *
 * @param {Object} context
 * @param {number}  [context.remaining]           — income − expenses (monthly)
 * @param {number}  [context.availableSavings]    — accumulated savings − reserved for goals
 * @param {number}  [context.incomeTotal]         — total income this month
 * @param {boolean} [context.isDailyBudgetExceeded]
 * @param {number}  [context.dailyBudgetRatio]    — dailySpent / dailyBudget (0–∞)
 * @param {Object|null} [context.goalStatus]      — { pct: number, isComplete: boolean }
 * @param {Object|null} [context.budgetStatus]    — { isOverBudget: boolean, ratio: number }
 * @returns {string} stateKey
 */
export function resolveAdviceState(context = {}) {
  const {
    remaining        = 0,
    availableSavings = 0,
    incomeTotal      = 0,
    isDailyBudgetExceeded = false,
    dailyBudgetRatio = 0,
    goalStatus       = null,
    budgetStatus     = null,
  } = context;

  const monthlyOverBudget = remaining < 0 || (budgetStatus && budgetStatus.isOverBudget);
  const monthlyRatio      = budgetStatus && budgetStatus.ratio != null ? budgetStatus.ratio : 0;

  // 1. exceeded — monthly or daily over budget
  if (monthlyOverBudget || isDailyBudgetExceeded) return 'exceeded';

  // 2. goalDone — a goal is 100% funded
  if (goalStatus && goalStatus.isComplete) return 'goalDone';

  // 3. critical — 95–100% of budget used (monthly or daily)
  const monthlyCritical = monthlyRatio >= 0.95 && monthlyRatio <= 1.0;
  const dailyCritical   = dailyBudgetRatio >= 0.95 && dailyBudgetRatio < 1.0;
  if (monthlyCritical || dailyCritical) return 'critical';

  // 4. goalNear — goal ≥ 80% funded, not yet complete
  if (goalStatus && !goalStatus.isComplete && goalStatus.pct >= 0.80) return 'goalNear';

  // 5. wealth — healthy savings above threshold (500 DT)
  if (availableSavings >= 500 && remaining >= 0) return 'wealth';

  // 6. pressure — warning zone 80–94% (monthly or daily)
  const monthlyPressure = monthlyRatio >= 0.80 && monthlyRatio < 0.95;
  const dailyPressure   = dailyBudgetRatio >= 0.80 && dailyBudgetRatio < 0.95;
  if (monthlyPressure || dailyPressure) return 'pressure';

  // 7. noIncome — zero income recorded this month
  if (incomeTotal <= 0) return 'noIncome';

  // 8. surplus — healthy default
  return 'surplus';
}
