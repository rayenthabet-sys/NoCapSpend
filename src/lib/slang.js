// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Slang and Formatting Engine
// Option B: Bands & Bleed Terminology with (Meaning) tags
// ─────────────────────────────────────────────────────────────────

/**
 * Format money with slang racks/bands notation if amount >= 100
 * e.g. 1200 -> "$1,200.00 (12 RACKS)"
 */
export function formatMunyun(amount, options = {}) {
  const num = Number(amount || 0);
  const formatted = Math.abs(num).toFixed(2);
  const sign = num < 0 ? '-' : '';

  if (options.showRacks && Math.abs(num) >= 100) {
    const racks = (Math.abs(num) / 100).toFixed(1).replace('.0', '');
    return `${sign}$${formatted} (${racks} ${Number(racks) === 1 ? 'RACK' : 'RACKS'})`;
  }

  return `${sign}$${formatted}`;
}

export function getRacksOnly(amount) {
  const num = Math.abs(Number(amount || 0));
  if (num < 100) return null;
  const racks = (num / 100).toFixed(1).replace('.0', '');
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
