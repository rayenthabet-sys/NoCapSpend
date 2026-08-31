// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Slang and Formatting Engine
// Option B: Bands & Bleed Terminology with (Meaning) tags
// ─────────────────────────────────────────────────────────────────

/**
 * Format money with racks notation if amount >= 10 DT
 * e.g. 120 -> "120.00 DT (12 RACKS)"
 */
export function formatBands(amount, options = {}) {
  const num = Number(amount || 0);
  const formatted = Math.abs(num).toFixed(2);
  const sign = num < 0 ? '-' : '';

  if (options.showRacks && Math.abs(num) >= 10) {
    const racks = (Math.abs(num) / 10).toFixed(1).replace('.0', '');
    return `${sign}${formatted} DT (${racks} ${Number(racks) === 1 ? 'RACK' : 'RACKS'})`;
  }

  return `${sign}${formatted} DT`;
}

export const formatMunyun = formatBands;

export function getRacksOnly(amount) {
  const num = Math.abs(Number(amount || 0));
  if (num < 10) return null;
  const racks = (num / 10).toFixed(1).replace('.0', '');
  return `${racks} ${Number(racks) === 1 ? 'RACK' : 'RACKS'}`;
}

// Option B screen labels with intuitive (Meanings)
export const slangLabels = {
  appTitle:          'BUDGET BUDDY',
  appSubtitle:       'COUNTIN\' BANDS & RACKS',
  totalSavings:      'TOTAL BANDS (Savings)',
  thisMonth:         'THIS MONTH\'S BAG',
  income:            'BAG IN (Income)',
  expense:           'BLEED (Expense)',
  available:         'UNLOCKED BANDS (Available)',
  inGoals:           'LOCKED BANDS (Goals)',
  savingsChart:      'BANDS OVER TIME',
  categoryBreakdown: 'WHERE THE BANDS WENT',
  categorySection:   'DRAIN SECTORS (Categories)',
  goalsTitle:        'LOCKED BANDS (Goals)',
  addGoalTitle:      'NEW GOAL (Goal)',
  addExpenseTitle:   'BLEED (Expense)',
  addIncomeTitle:    'BAG IN (Income)',
  categoriesTitle:   'DRAIN SECTORS (Categories)',
  budgetsTitle:      'BAND LIMITS (Budgets)',
  emptyGoals:        'No goals yet. What bands are we stackin\' for?',
  emptyCategories:   'No drain sectors found.',
  emptyBudgets:      'No band limits set for this month.',
};
