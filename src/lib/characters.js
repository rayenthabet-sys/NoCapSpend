import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────
// Budget Buddy — centralized character configuration
// All asset paths, reaction→character mappings, and
// global character view definitions live here.
// ─────────────────────────────────────────────────────────────────

// ── Processed (transparent background) assets ────────────────────
export const characterAssets = {
  master:     require('../../assets/characters/processed/carti-master.png'),
  selfTitled: require('../../assets/characters/processed/carti-self-titled.png'),
  dieLit:     require('../../assets/characters/processed/carti-die-lit.png'),
  wlr:        require('../../assets/characters/processed/carti-wlr.png'),
  global:     require('../../assets/characters/processed/carti-global.png'),
  bunny:      null,
};

// ── Native aspect ratios (width / height) ─────────────────────────
export const characterAspectRatio = {
  master:     1024 / 1536,  // ~0.667 — portrait
  selfTitled: 1024 / 1535,  // ~0.667 — portrait
  dieLit:     1024 / 1535,  // ~0.667 — portrait
  wlr:        1024 / 1536,  // ~0.667 — portrait
  global:     1536 / 1024,  // ~1.5   — landscape (4-view sheet)
  bunny:      1,
};

// ── Global character view offsets ─────────────────────────────────
export const globalViews = {
  front:     0,  // front-left view
  frontAlt:  1,  // front-right
  side:      2,  // side angle
  back:      3,  // back angle
};

// ── Reaction → character mapping ──────────────────────────────────
export const reactionCharacterMap = {
  normal:         'master',
  incomeAdded:    'selfTitled',
  saving:         'selfTitled',
  expenseAdded:   'dieLit',
  warning:        'dieLit',
  spending:       'dieLit',
  overBudget:     'wlr',
  goalCompleted:  'global',
  happy:          'selfTitled',
  empty:          'master',
  broke:          'wlr',
};

// ── Slang reaction phrases ────────────────────────────────────────
export const reactionPhrases = {
  incomeAdded:   'BAG SECURED (+MUNYUN)',
  expenseAdded:  'MUNYUN BLEED (-)',
  overBudget:    'FWÄÄH?!',
  warning:       '⚠ WATCH THE MUNYUN',
  goalCompleted: 'BENJIS STACKED',
  saving:        'WE UP. (STACKIN\' BENJIS)',
  broke:         'WHOLE LOTTA NOTHING.',
};

// ── Size presets (rendered height in px) ───────────────────────────
export const characterSizes = {
  nano:   44,
  micro:  60,
  small:  80,
  medium: 160,
  large:  220,
  hero:   300,
};

// ── Persistent character state logic ──────────────────────────────
// Self-titled when remaining > 150
// WLR when over budget (remaining < 0 or isOverBudget)
// Die Lit when expense was added (stays for 1 minute / 60s)
// Master otherwise
const EXPENSE_TIMESTAMP_KEY = '@budget_buddy_last_expense_ts';
let inMemoryExpenseTs = 0;

export async function recordExpenseLogged() {
  const now = Date.now();
  inMemoryExpenseTs = now;
  try {
    await AsyncStorage.setItem(EXPENSE_TIMESTAMP_KEY, String(now));
  } catch (_) {}
  return now;
}

export async function getLastExpenseTimestamp() {
  if (inMemoryExpenseTs > 0) return inMemoryExpenseTs;
  try {
    const val = await AsyncStorage.getItem(EXPENSE_TIMESTAMP_KEY);
    if (val) {
      inMemoryExpenseTs = Number(val);
      return inMemoryExpenseTs;
    }
  } catch (_) {}
  return 0;
}

/**
 * Determine persistent active character based on user rules:
 * - wlr: when over budget (remaining < 0 or isOverBudget)
 * - dieLit: when expense was added within the last 60 seconds
 * - selfTitled: when remaining money is above 150
 * - master: otherwise
 */
export function resolvePersistentCharacter({ remaining = 0, isOverBudget = false, lastExpenseTimestamp = 0 }) {
  if (isOverBudget || remaining < 0) {
    return 'wlr';
  }

  const now = Date.now();
  if (lastExpenseTimestamp && now - lastExpenseTimestamp < 60000) {
    return 'dieLit';
  }

  if (remaining > 150) {
    return 'selfTitled';
  }

  return 'master';
}
