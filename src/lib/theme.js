// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Centralized Design System Theme
// Boondocks-inspired Urban / Comic Editorial Aesthetic
// ─────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds & Surfaces
  background:          '#12120F',
  surface:             '#1A1A14',
  backgroundSecondary: '#1A1A14',

  // Cards
  card:                '#22221A',
  cardSecondary:       '#1E1E16',
  cardElevated:        '#2B2A20',
  inputBg:             '#1A1A14',

  // Brand / Gold Accents
  primary:             '#D4A237',
  primaryBright:       '#F0BE4B',
  primaryDark:         '#8C6818',

  // Text
  text:                '#F2EFE9',
  textPrimary:         '#F2EFE9',
  textSecondary:       '#BAB6A2',
  textMuted:           '#787563',

  // Structure & Borders
  border:              '#333226',
  borderAccent:        '#4A4630',
  progressBg:          '#22221A',
  progressFill:        '#D4A237',

  // Semantic
  income:              '#4E9A51',   // Bag In Green
  expense:             '#C84C32',   // Bleed Rust Red
  warning:             '#D98A2B',   // Budget Caution Amber (80-94%)
  danger:              '#BA2D1D',   // Critical Breach Red (95%+)
  dangerBright:        '#E03E2D',
  goals:               '#7E6BB0',   // Locked Bands Purple
  wealth:              '#C5A059',   // Ed Surplus Gold

  // Tinted card surfaces (income/expense cards)
  incomeCard:          '#0D180F',   // Very dark green tint
  expenseCard:         '#190D0D',   // Very dark red tint
  incomeBorder:        '#1D3B21',   // Subtle green border
  expenseBorder:       '#3B1D1D',   // Subtle red border

  // Utilities
  white:               '#FFFFFF',
  transparent:         'transparent',
};

export const fonts = {
  display:      'BebasNeue_400Regular',      // titles, section headers, reactions
  body:         'SpaceGrotesk_400Regular',   // all body text, inputs
  bodySemiBold: 'SpaceGrotesk_600SemiBold',  // labels, button text
  bodyBold:     'SpaceGrotesk_700Bold',      // financial numbers, emphasis
  mono:         'SpaceGrotesk_700Bold',      // numbers tabular
};

export const fontsFallback = {
  display:      'System',
  body:         'System',
  bodySemiBold: 'System',
  bodyBold:     'System',
  mono:         'System',
};

export const radii = {
  xs:     3,
  sm:     6,
  md:     10,
  lg:     16,
  pill:   100,
  // Compatibility aliases
  card:   6,
  cardLarge: 10,
  button: 6,
  chip:   4,
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   40,
  xxl:  64,
};

// Reusable screen labels (clean financial terminology)
export const labels = {
  appTitle:          'BUDGET BUDDY',
  appSubtitle:       'TRACK YOUR FINANCES',
  totalSavings:      'TOTAL SAVINGS',
  thisMonth:         'THIS MONTH',
  income:            'INCOME',
  expense:           'EXPENSES',
  available:         'AVAILABLE BALANCE',
  inGoals:           'LOCKED FOR GOALS',
  savingsChart:      'SAVINGS OVER TIME',
  categoryBreakdown: 'SPENDING BREAKDOWN',
  categorySection:   'CATEGORIES',
  goalsTitle:        'SAVINGS GOALS',
  addGoalTitle:      'NEW SAVINGS GOAL',
  addExpenseTitle:   'ADD EXPENSE',
  addIncomeTitle:    'ADD INCOME',
  categoriesTitle:   'CATEGORIES',
  budgetsTitle:      'BUDGET LIMITS',
  emptyGoals:        'No savings goals yet. What are you saving for?',
  emptyCategories:   'No categories found.',
  emptyBudgets:      'No budget limits set for this month.',
};

// Animation durations in ms
export const animation = {
  fast:    180,
  normal:  320,
  slow:    500,
  bob:     1800,   // idle character breathing float cycle
};

// Chart colors — high-contrast dark theme
export const chartConfig = {
  backgroundColor:         '#22221A',
  backgroundGradientFrom:  '#22221A',
  backgroundGradientTo:    '#22221A',
  decimalPlaces:           0,
  color:    (opacity = 1) => `rgba(212, 162, 55, ${opacity})`,  // Gold line
  labelColor:              () => '#BAB6A2',
  propsForDots: {
    r:           '4',
    strokeWidth: '1.5',
    stroke:      '#F0BE4B',
  },
  propsForBackgroundLines: {
    stroke: '#333226',
    strokeWidth: 1,
  },
};
