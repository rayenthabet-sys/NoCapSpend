import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────
// Budget Buddy — centralized character configuration
// All asset paths, reaction→character mappings, and
// global character view definitions live here.
// ─────────────────────────────────────────────────────────────────

// ── Optimized WebP assets (Crisp retina downscaled, 90% size reduction) ──
export const characterAssets = {
  master:     require('../../assets/characters/optimized/carti-master.webp'),
  selfTitled: require('../../assets/characters/optimized/carti-self-titled.webp'),
  dieLit:     require('../../assets/characters/optimized/carti-die-lit.webp'),
  wlr:        require('../../assets/characters/optimized/carti-wlr.webp'),
  global:     require('../../assets/characters/optimized/carti-global.webp'),
  bunny:      null,
};

// ── Individual cropped global corner figures (23KB-33KB each) ──
export const globalCornerAssets = {
  front:    require('../../assets/characters/optimized/global-front.webp'),
  frontAlt: require('../../assets/characters/optimized/global-frontAlt.webp'),
  side:     require('../../assets/characters/optimized/global-side.webp'),
  back:     require('../../assets/characters/optimized/global-back.webp'),
};

// ── Native aspect ratios (width / height) ─────────────────────────
export const characterAspectRatio = {
  master:     512 / 768,    // ~0.667 — portrait
  selfTitled: 512 / 768,    // ~0.667 — portrait
  dieLit:     512 / 768,    // ~0.667 — portrait
  wlr:        512 / 768,    // ~0.667 — portrait
  global:     768 / 512,    // ~1.5   — landscape (4-view sheet)
  corner:     256 / 384,    // ~0.667 — individual view portrait
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
  medium: 150,
  large:  210,
  hero:   260,
};

// ── Persistent character state logic ──────────────────────────────
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
