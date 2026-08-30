// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Slang and Formatting Engine
// Opium / Underground Money Terminology with clear meaning tags:
// Munyun, Benjis, Racks, Bands, Bag, Bleed
// ─────────────────────────────────────────────────────────────────

/**
 * Format money with slang racks notation if amount >= 100
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

// Slang screen labels with intuitive (Meanings)
export const slangLabels = {
  appTitle:          'BUDGET BUDDY',
  appSubtitle:       'COUNTIN\' MUNYUN & BENJIS',
  totalSavings:      'TOTAL MUNYUN (Savings)',
  thisMonth:         'THIS MONTH\'S BAG',
  income:            'BAG IN (Income)',
  expense:           'BLEED (Expense)',
  available:         'FREE MUNYUN (Available)',
  inGoals:           'IN BENJIS (Goals)',
  savingsChart:      'MUNYUN OVER TIME',
  categoryBreakdown: 'WHERE THE MUNYUN WENT',
  categorySection:   'MUNYUN KILLERS (Categories)',
  goalsTitle:        'BENJI GOALS (Goals)',
  addGoalTitle:      'NEW GOAL (Goal)',
  addExpenseTitle:   'MUNYUN BLEED (Expense)',
  addIncomeTitle:    'SECURE BAG (Income)',
  categoriesTitle:   'MUNYUN KILLERS (Categories)',
  budgetsTitle:      'MUNYUN LIMITS (Budgets)',
  emptyGoals:        'No goals yet. What munyun are we stackin\' for?',
  emptyCategories:   'No munyun killers yet.',
  emptyBudgets:      'No munyun limits set for this month.',
};
