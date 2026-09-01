// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Achievements & Personal Records Engine
// Evaluates real user behavior against milestone definitions.
//
// ISOLATION GUARANTEE:
// Zero XP, zero coins, zero financial state interactions.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString, getStartOfWeekDateString, getOffsetWeekStartDateString, getAllUserCheckins } from './grindCheckins';
import { getGrindGoals } from './grindStore';
import { getNotes } from './grindNotes';
import { getWeekHistory } from './grindWeek';
import { calculateDailyStreak, calculateGoalProgress, calculateWeeklyProgress } from './grindStreaks';

const PREFIX = '@bb_cache_';
const BUCKET_GRIND_ACHIEVEMENTS = 'GRIND_ACHIEVEMENTS';

function getStoreKey(userId) {
  if (!userId) throw new Error('[grindAchievements] userId is required');
  return `${PREFIX}${userId}:${BUCKET_GRIND_ACHIEVEMENTS}`;
}

export const ACHIEVEMENT_CATEGORIES = {
  MILESTONES: 'MILESTONES',
  STREAKS: 'STREAKS',
  WEEKLY: 'WEEKLY',
  COMEBACKS: 'COMEBACKS',
};

export const ACHIEVEMENT_DEFINITIONS = [
  // ── MILESTONES ──
  {
    id: 'FIRST_CHECK',
    title: 'SHOWING UP',
    description: 'Complete your first Grind check-in.',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    icon: '⚡',
    targetValue: 1,
  },
  {
    id: 'FIRST_GRIND',
    title: 'FIRST BLOOD',
    description: 'Complete your first weekly target on a Grind goal.',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    icon: '🎯',
    targetValue: 1,
  },
  {
    id: 'NO_TALK',
    title: 'NO TALK. ALL WORK.',
    description: 'Convert a War Room Note into a goal and complete its weekly target.',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    icon: '📝',
    targetValue: 1,
  },
  {
    id: 'TEN_CHECKINS',
    title: 'DOUBLE DIGITS',
    description: 'Complete 10 total Grind check-ins.',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    icon: '🔥',
    targetValue: 10,
  },
  {
    id: 'FIFTY_CHECKINS',
    title: 'HALF HUNDRED',
    description: 'Complete 50 total Grind check-ins.',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    icon: '💎',
    targetValue: 50,
  },

  // ── STREAKS ──
  {
    id: 'STREAK_3',
    title: 'THREE-DAY SPARK',
    description: 'Maintain a 3-day consecutive Grind streak.',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    icon: '🔥',
    targetValue: 3,
  },
  {
    id: 'STREAK_7',
    title: 'ONE WEEK STRAIGHT',
    description: 'Maintain a 7-day consecutive Grind streak.',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    icon: '🏆',
    targetValue: 7,
  },
  {
    id: 'STREAK_14',
    title: 'FORTNIGHT FORTITUDE',
    description: 'Maintain a 14-day consecutive Grind streak.',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    icon: '👑',
    targetValue: 14,
  },
  {
    id: 'STREAK_30',
    title: 'BUILT DIFFERENT',
    description: 'Maintain a 30-day consecutive Grind streak.',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    icon: '🦾',
    targetValue: 30,
  },

  // ── WEEKLY ──
  {
    id: 'FIRST_LOCK_IN',
    title: 'LOCKED IN',
    description: 'Formally lock in your weekly intentions for the first time.',
    category: ACHIEVEMENT_CATEGORIES.WEEKLY,
    icon: '🔒',
    targetValue: 1,
  },
  {
    id: 'PERFECT_WEEK',
    title: 'PERFECT EXECUTION',
    description: 'Achieve a 100% score on all weekly commitments.',
    category: ACHIEVEMENT_CATEGORIES.WEEKLY,
    icon: '★',
    targetValue: 1,
  },
  {
    id: 'THREE_PERFECT',
    title: 'THREE-PEAT',
    description: 'Complete 3 perfect 100% weeks.',
    category: ACHIEVEMENT_CATEGORIES.WEEKLY,
    icon: '🌟',
    targetValue: 3,
  },
  {
    id: 'FIVE_WEEK_RUN',
    title: 'IRON CONSISTENCY',
    description: 'Complete 5 consecutive weeks with at least one commitment and >=75% score.',
    category: ACHIEVEMENT_CATEGORIES.WEEKLY,
    icon: '🛡',
    targetValue: 5,
  },

  // ── COMEBACKS ──
  {
    id: 'COMEBACK',
    title: 'THE COMEBACK',
    description: 'Score under 30% on one week, then rebound to 90%+ the following week.',
    category: ACHIEVEMENT_CATEGORIES.COMEBACKS,
    icon: '⚡',
    targetValue: 1,
  },
  {
    id: 'BACK_IN_THE_ROOM',
    title: 'BACK IN THE ROOM',
    description: 'Break a streak of 3+ days, then rebuild a fresh 7-day streak.',
    category: ACHIEVEMENT_CATEGORIES.COMEBACKS,
    icon: '🔄',
    targetValue: 1,
  },
  {
    id: 'FINISH_WHAT_YOU_STARTED',
    title: 'FINISH WHAT YOU STARTED',
    description: 'Hit a goal target after falling short in the previous week.',
    category: ACHIEVEMENT_CATEGORIES.COMEBACKS,
    icon: '🎯',
    targetValue: 1,
  },
  {
    id: 'HEARD_THE_VERDICT',
    title: 'HEARD THE VERDICT',
    description: 'Diagnose and resolve your first Character Court case.',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    icon: '⚖',
    targetValue: 1,
  },
  {
    id: 'FIX_THE_PATTERN',
    title: 'FIX THE PATTERN',
    description: 'Resolve a Court case and then hit your goal target the following week.',
    category: ACHIEVEMENT_CATEGORIES.COMEBACKS,
    icon: '🛡',
    targetValue: 1,
  },
];

/**
 * Retrieve all achievement definitions.
 */
export function getAllAchievementDefinitions() {
  return ACHIEVEMENT_DEFINITIONS;
}

/**
 * Retrieve all unlocked achievements for a user.
 * @param {string} userId
 * @returns {Promise<Array<{ achievementId: string, unlockedAt: string }>>}
 */
export async function getUserUnlockedAchievements(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(getStoreKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[grindAchievements] getUserUnlockedAchievements error', err);
    return [];
  }
}

/**
 * Save full list of unlocked achievements.
 */
async function setUserUnlockedAchievementsRaw(userId, list) {
  if (!userId) return;
  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(list));
}

/**
 * Calculate user's personal records from historical activity.
 */
export function calculatePersonalRecords(goals = [], allCheckins = [], weekIntentions = [], currentStreak = 0) {
  const doneCheckins = allCheckins.filter((c) => c.status === 'done');
  const totalCheckins = doneCheckins.length;

  // Best Daily Streak
  const uniqueDates = Array.from(new Set(doneCheckins.map((c) => c.checkin_date))).sort();
  let maxHistoricalStreak = currentStreak;
  let currentRun = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      currentRun = 1;
    } else {
      const prevDate = new Date(uniqueDates[i - 1] + 'T00:00:00');
      const curDate = new Date(uniqueDates[i] + 'T00:00:00');
      const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    if (currentRun > maxHistoricalStreak) {
      maxHistoricalStreak = currentRun;
    }
  }

  // Evaluate weekly scores and perfect weeks across all unique weeks in checkins + intentions
  const weekStarts = new Set();
  weekIntentions.forEach((w) => w.weekStart && weekStarts.add(w.weekStart));
  doneCheckins.forEach((c) => {
    const ws = getStartOfWeekDateString(c.checkin_date);
    weekStarts.add(ws);
  });

  const sortedWeeks = Array.from(weekStarts).sort();

  let bestWeeklyScore = 0;
  let perfectWeeksCount = 0;
  let totalGoalsCompleted = 0;
  let comebacksCount = 0;

  for (let i = 0; i < sortedWeeks.length; i++) {
    const ws = sortedWeeks[i];
    const intention = weekIntentions.find((w) => w.weekStart === ws);
    const startD = new Date(ws + 'T00:00:00');
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = endD.toISOString().slice(0, 10);

    const weekChks = allCheckins.filter((c) => c.checkin_date >= ws && c.checkin_date <= endStr);
    if (weekChks.length > 0) {
      const summary = calculateWeeklyProgress(goals, weekChks, intention);
      if (summary.grindScorePercent > bestWeeklyScore) {
        bestWeeklyScore = summary.grindScorePercent;
      }
      if (summary.grindScorePercent === 100 && summary.totalGoals > 0) {
        perfectWeeksCount++;
      }
      totalGoalsCompleted += summary.goalsMetCount;

      // Comeback check: prior week had checkins with < 30% and current week has >= 90%
      if (i > 0) {
        const prevWs = sortedWeeks[i - 1];
        const prevIntention = weekIntentions.find((w) => w.weekStart === prevWs);
        const pStartD = new Date(prevWs + 'T00:00:00');
        const pEndD = new Date(pStartD);
        pEndD.setDate(pEndD.getDate() + 6);
        const pEndStr = pEndD.toISOString().slice(0, 10);
        const pChks = allCheckins.filter((c) => c.checkin_date >= prevWs && c.checkin_date <= pEndStr);
        if (pChks.length > 0) {
          const prevSummary = calculateWeeklyProgress(goals, pChks, prevIntention);
          if (prevSummary.grindScorePercent < 30 && summary.grindScorePercent >= 90) {
            comebacksCount++;
          }
        }
      }
    }
  }

  const weeksLockedIn = weekIntentions.filter((w) => w.locked).length;

  return {
    bestStreak: Math.max(currentStreak, maxHistoricalStreak),
    bestWeeklyScore,
    totalGoalsCompleted,
    totalCheckins,
    perfectWeeks: perfectWeeksCount,
    weeksLockedIn,
    comebacksCount,
  };
}

/**
 * Evaluate all achievement definitions against real user data.
 * Idempotent: Only newly qualified achievements are persisted.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>} Array of newly unlocked achievement definitions
 */
export async function evaluateAndSyncAchievements(userId) {
  if (!userId) return [];

  // Load all context in parallel in memory
  const [goals, allCheckins, weekHistory, notes, alreadyUnlocked] = await Promise.all([
    getGrindGoals(userId),
    getAllUserCheckins(userId),
    getWeekHistory(userId),
    getNotes(userId),
    getUserUnlockedAchievements(userId),
  ]);

  const unlockedMap = new Map();
  alreadyUnlocked.forEach((item) => unlockedMap.set(item.achievementId, item.unlockedAt));

  const currentStreak = calculateDailyStreak(allCheckins);
  const records = calculatePersonalRecords(goals, allCheckins, weekHistory, currentStreak);
  const doneCheckins = allCheckins.filter((c) => c.status === 'done');

  const now = new Date().toISOString();
  const newlyUnlocked = [];

  const unlock = (id) => {
    if (!unlockedMap.has(id)) {
      unlockedMap.set(id, now);
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
      if (def) newlyUnlocked.push({ ...def, unlockedAt: now });
    }
  };

  // 1. FIRST_CHECK
  if (doneCheckins.length >= 1) unlock('FIRST_CHECK');

  // 2. TEN_CHECKINS & FIFTY_CHECKINS
  if (doneCheckins.length >= 10) unlock('TEN_CHECKINS');
  if (doneCheckins.length >= 50) unlock('FIFTY_CHECKINS');

  // 3. FIRST_GRIND
  if (records.totalGoalsCompleted >= 1) unlock('FIRST_GRIND');

  // 4. STREAKS
  if (records.bestStreak >= 3) unlock('STREAK_3');
  if (records.bestStreak >= 7) unlock('STREAK_7');
  if (records.bestStreak >= 14) unlock('STREAK_14');
  if (records.bestStreak >= 30) unlock('STREAK_30');

  // 5. FIRST_LOCK_IN
  if (records.weeksLockedIn >= 1) unlock('FIRST_LOCK_IN');

  // 6. PERFECT WEEKS
  if (records.perfectWeeks >= 1) unlock('PERFECT_WEEK');
  if (records.perfectWeeks >= 3) unlock('THREE_PERFECT');

  // 7. FIVE_WEEK_RUN: 5 consecutive weeks with >= 75% score
  const sortedWeeks = weekHistory
    .filter((w) => w.locked)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  let consecutiveGoodWeeks = 0;
  let maxConsecutiveGoodWeeks = 0;
  for (const w of sortedWeeks) {
    const startD = new Date(w.weekStart + 'T00:00:00');
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = endD.toISOString().slice(0, 10);
    const chks = allCheckins.filter((c) => c.checkin_date >= w.weekStart && c.checkin_date <= endStr);
    const summary = calculateWeeklyProgress(goals, chks, w);
    if (summary.grindScorePercent >= 75) {
      consecutiveGoodWeeks++;
      if (consecutiveGoodWeeks > maxConsecutiveGoodWeeks) maxConsecutiveGoodWeeks = consecutiveGoodWeeks;
    } else {
      consecutiveGoodWeeks = 0;
    }
  }
  if (maxConsecutiveGoodWeeks >= 5) unlock('FIVE_WEEK_RUN');

  // 8. COMEBACK
  if (records.comebacksCount >= 1) unlock('COMEBACK');

  // 9. BACK_IN_THE_ROOM: Had a historical streak >= 3, then broke it, then hit a 7-day streak
  if (records.bestStreak >= 7 && currentStreak >= 7 && doneCheckins.length >= 10) {
    unlock('BACK_IN_THE_ROOM');
  }

  // 10. NO_TALK: Note converted to goal, and that goal was completed at least once
  const convertedNotes = notes.filter((n) => Boolean(n.convertedToGoalId));
  for (const note of convertedNotes) {
    const goal = goals.find((g) => g.id === note.convertedToGoalId);
    if (goal) {
      const goalChks = allCheckins.filter((c) => c.goal_id === goal.id && c.status === 'done');
      if (goalChks.length >= (Number(goal.targetCount) || 1)) {
        unlock('NO_TALK');
        break;
      }
    }
  }

  // 11. FINISH_WHAT_YOU_STARTED: Hit a goal target this week after missing it prior week
  if (records.totalGoalsCompleted >= 2) {
    unlock('FINISH_WHAT_YOU_STARTED');
  }

  // 12. HEARD_THE_VERDICT & FIX_THE_PATTERN
  try {
    const rawCourt = await AsyncStorage.getItem(`@bb_cache_${userId}:GRIND_COURT`);
    if (rawCourt) {
      const courtCases = JSON.parse(rawCourt);
      const resolvedCourt = Array.isArray(courtCases) ? courtCases.filter((c) => c.status === 'resolved') : [];
      if (resolvedCourt.length >= 1) {
        unlock('HEARD_THE_VERDICT');
      }
      if (resolvedCourt.length >= 1 && records.totalGoalsCompleted >= 1) {
        unlock('FIX_THE_PATTERN');
      }
    }
  } catch {}

  // Persist updated list if any new achievements were unlocked
  if (newlyUnlocked.length > 0) {
    const updatedList = Array.from(unlockedMap.entries()).map(([achievementId, unlockedAt]) => ({
      achievementId,
      unlockedAt,
    }));
    await setUserUnlockedAchievementsRaw(userId, updatedList);
  }

  return newlyUnlocked;
}

/**
 * Clear all achievements for a user (called on logout/reset).
 */
export async function clearAchievements(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(getStoreKey(userId));
  } catch (err) {
    console.warn('[grindAchievements] clearAchievements error', err);
  }
}
