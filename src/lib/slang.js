// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Slang and Formatting Engine
// Opium / Underground Money Terminology:
// Munyun, Benjis, Racks, Bands, Bag, Vault
// ─────────────────────────────────────────────────────────────────

/**
 * Format money with slang racks notation if amount >= 100
 * e.g. 1200 -> "12 RACKS ($1,200.00)" or "$1,200.00 (12 RACKS)"
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

// Slang screen labels
export const slangLabels = {
  appTitle:          'BUDGET BUDDY',
  appSubtitle:       'COUNTIN\' MUNYUN & BENJIS',
  totalSavings:      'TOTAL MUNYUN STASH',
  thisMonth:         'THIS MONTH\'S BAG',
  income:            'BAG IN (MUNYUN)',
  expense:           'BAG OUT (BLEED)',
  available:         'FREE MUNYUN',
  inGoals:           'LOCKED IN BENJIS',
  savingsChart:      'MUNYUN OVER TIME',
  categoryBreakdown: 'WHERE THE MUNYUN WENT',
  categorySection:   'MUNYUN KILLERS',
  goalsTitle:        'BENJI GOALS & RITUALS',
  addGoalTitle:      'NEW BENJI GOAL',
  addExpenseTitle:   'LOG MUNYUN BLEED',
  addIncomeTitle:    'SECURE THE BAG (+MUNYUN)',
  categoriesTitle:   'MUNYUN KILLERS',
  budgetsTitle:      'MUNYUN LIMITS',
  emptyGoals:        'No goals yet. What munyun are we stackin\' for?',
  emptyCategories:   'No munyun killers yet.',
  emptyBudgets:      'No munyun limits set for this month.',
};
