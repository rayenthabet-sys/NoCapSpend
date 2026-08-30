// ─────────────────────────────────────────────────────────────────
// Budget Buddy — centralized theme
// 90% dark / 8% white-gray / 2% red accent
// ─────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  background:          '#080808',
  backgroundSecondary: '#101010',

  // Cards
  card:                '#141414',
  cardSecondary:       '#1B1B1B',
  cardElevated:        '#202020',
  inputBg:             '#141414',

  // Accent — red used sparingly (borders, CTAs, warnings)
  primary:             '#B00020',
  primaryBright:       '#D41414',
  primaryDark:         '#720014',
  danger:              '#B00020',
  dangerBright:        '#D41414',

  // Text
  text:                '#F2F2F2',
  textSecondary:       '#A0A0A0',
  textMuted:           '#666666',

  // Structure
  border:              '#292929',
  borderAccent:        '#3A0010',   // very dark red — occasional card accent
  progressBg:          '#202020',
  progressFill:        '#B00020',

  // Semantic
  income:              '#B7E4C7',   // muted green
  expense:             '#E63946',   // red
  goals:               '#C9A8E0',   // soft purple
  warning:             '#E8A838',   // amber

  // Utilities
  white:               '#FFFFFF',
  transparent:         'transparent',
};

export const fonts = {
  display:      'BebasNeue_400Regular',      // titles, section headers ONLY
  body:         'SpaceGrotesk_400Regular',   // all body text
  bodySemiBold: 'SpaceGrotesk_600SemiBold',  // labels, button text
  bodyBold:     'SpaceGrotesk_700Bold',      // financial numbers, emphasis
  mono:         'SpaceGrotesk_700Bold',      // numbers (same as bold)
};

// Fallback fonts for when custom fonts haven't loaded yet
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

// Reusable screen labels
export const labels = {
  appTitle:          'BUDGET BUDDY',
  appSubtitle:       'TRACK THE SPREAD',
  thisMonth:         'THIS MONTH',
  savingsChart:      'SAVINGS OVER TIME',
  categoryBreakdown: 'SPENDING SPLIT',
  categorySection:   'WHERE THE MONEY WENT',
  goalsTitle:        'SAVINGS GOALS',
  addGoalTitle:      'NEW GOAL',
  categoriesTitle:   'CATEGORIES',
  budgetsTitle:      'CATEGORY BUDGETS',
  emptyGoals:        'No goals yet. What are we saving for?',
  emptyCategories:   'No expense categories found.',
  emptyBudgets:      'No budgets set for this month.',
};

// Animation durations in ms
export const animation = {
  fast:    180,
  normal:  320,
  slow:    500,
  bob:     1800,   // idle character bob cycle
};

// Chart colors — dark theme compliant
export const chartConfig = {
  backgroundColor:         '#141414',
  backgroundGradientFrom:  '#141414',
  backgroundGradientTo:    '#141414',
  decimalPlaces:           0,
  color:    (opacity = 1) => `rgba(210, 20, 20, ${opacity})`,  // red line
  labelColor:              () => '#A0A0A0',
  propsForDots: {
    r:           '4',
    strokeWidth: '1',
    stroke:      '#D41414',
  },
  propsForBackgroundLines: {
    stroke: '#292929',
    strokeWidth: 1,
  },
};
