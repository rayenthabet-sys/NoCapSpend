// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Command Center Orchestration Layer
// Aggregates goals, check-ins, commitments, streaks, court alerts,
// achievements, insights, and daily missions into a single unified
// view-model context in memory.
//
// ISOLATION GUARANTEE:
// Zero interaction with financial accounts, budgets, savings, or expenses.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTodayDateString,
  getStartOfWeekDateString,
  getCheckins,
  getWeekCheckins,
  getAllUserCheckins,
} from './grindCheckins';
import { getGrindGoals } from './grindStore';
import { getWeekIntention } from './grindWeek';
import { calculateWeeklyProgress, calculateDailyStreak } from './grindStreaks';
import { deriveDailyMissions, deriveWeeklyStatus, getSmartOneThing } from './grindToday';
import { getOpenCourtCases, evaluateAndDetectCourtCases } from './grindCourt';
import { evaluateAndSyncAchievements, calculatePersonalRecords, getUserUnlockedAchievements } from './grindAchievements';
import { getTopInsight } from './grindInsights';
import { getNotes } from './grindNotes';

const PREFIX = '@bb_cache_';
const BUCKET_DAILY_BRIEFING = 'GRIND_DAILY_BRIEFING';

function getBriefingGuardKey(userId, dateStr) {
  return `${PREFIX}${userId}:${BUCKET_DAILY_BRIEFING}_${dateStr}`;
}

/**
 * Deterministically derives a daily character briefing based on user state.
 */
export function deriveCharacterBriefing(openCourtCases = [], weeklySummary = {}, missions = [], streak = 0) {
  // 1. If open court case exists -> Stinkmeaner / Riley urgency
  if (openCourtCases.length > 0) {
    const courtCase = openCourtCases[0];
    return {
      characterKey: 'stinkmeaner',
      assetId: 'stinkmeaner_roast',
      animationType: 'native',
      speaker: 'COLONEL STINKMEANER',
      quote: `THE COURT WANTS TO TALK ABOUT "${courtCase.goalTitle.toUpperCase()}".`,
      subtext: 'You have an open case on your docket. Go face it.',
      actionLabel: 'VIEW COURT CASE',
      actionRoute: '/grind/court',
    };
  }

  // 2. If at-risk goals exist -> Riley push
  const atRiskCount = missions.filter((m) => m.state === 'AT_RISK').length;
  if (atRiskCount > 0) {
    return {
      characterKey: 'riley',
      assetId: 'riley_light',
      animationType: 'native',
      speaker: 'RILEY FREEMAN',
      quote: `YOU GOT ${atRiskCount} ${atRiskCount === 1 ? 'GOAL' : 'GOALS'} FALLING BEHIND.`,
      subtext: 'Don’t let the week slip away. Handle your business today.',
      actionLabel: 'VIEW AT-RISK',
      actionRoute: '/grind/week',
    };
  }

  // 3. If all missions complete for week or today -> Jazmine congratulations
  const incompleteCount = missions.filter((m) => !m.isDoneToday && !m.isDoneForWeek).length;
  if (missions.length > 0 && incompleteCount === 0) {
    return {
      characterKey: 'jazmine',
      assetId: 'jazmine_complete',
      animationType: 'webp',
      speaker: 'JAZMINE DUPREE',
      quote: 'ALL MISSIONS HANDLED FOR TODAY!',
      subtext: 'Great work sticking to your commitments. Keep the streak alive tomorrow.',
      actionLabel: 'VIEW RECORD',
      actionRoute: '/grind/achievements',
    };
  }

  // 4. If healthy streak >= 3 -> Granddad encouragement
  if (streak >= 3) {
    return {
      characterKey: 'robert',
      assetId: 'robert_guidance',
      animationType: 'native',
      speaker: 'GRANDDAD ROBERT',
      quote: `THAT'S A ${streak}-DAY RUN. KEEP GOING.`,
      subtext: 'Consistency is what separates talking from getting things done.',
      actionLabel: 'LOCK IN TODAY',
      actionRoute: null,
    };
  }

  // 5. Default -> Ed execution reminder
  return {
    characterKey: 'ed',
    assetId: 'ed_wealth',
    animationType: 'native',
    speaker: 'ED WUNCLER III',
    quote: 'PLANS ARE CHEAP. EXECUTION IS CURRENCY.',
    subtext: 'Knock out your daily mission and stack the wins.',
    actionLabel: 'LET’S WORK',
    actionRoute: null,
  };
}

/**
 * Master data loader and orchestrator for the Command Center.
 * Reads all subsystems concurrently in memory and applies error resilience.
 *
 * @param {string} userId
 * @returns {Promise<Object>} Command Center View-Model
 */
export async function loadCommandCenterData(userId) {
  if (!userId) throw new Error('[grindCommandCenter] userId required');

  const todayStr = getTodayDateString();
  const currentWeekStartStr = getStartOfWeekDateString();

  // Run achievement and court evaluations safely in parallel
  let newlyUnlockedAchievement = null;
  try {
    const newlyEarned = await evaluateAndSyncAchievements(userId);
    if (newlyEarned && newlyEarned.length > 0) {
      newlyUnlockedAchievement = newlyEarned[0];
    }
  } catch (err) {
    console.warn('[grindCommandCenter] evaluateAndSyncAchievements error', err);
  }

  try {
    await evaluateAndDetectCourtCases(userId);
  } catch (err) {
    console.warn('[grindCommandCenter] evaluateAndDetectCourtCases error', err);
  }

  // Core data load in parallel
  const [
    allGoals,
    todayCheckins,
    weekCheckins,
    allCheckins,
    weekIntention,
    openCourtCases,
    topInsight,
    notes,
    unlockedAchievements,
  ] = await Promise.all([
    getGrindGoals(userId).catch(() => []),
    getCheckins(userId, todayStr).catch(() => []),
    getWeekCheckins(userId, currentWeekStartStr).catch(() => []),
    getAllUserCheckins(userId).catch(() => []),
    getWeekIntention(userId, currentWeekStartStr).catch(() => null),
    getOpenCourtCases(userId).catch(() => []),
    getTopInsight(userId).catch(() => null),
    getNotes(userId).catch(() => []),
    getUserUnlockedAchievements(userId).catch(() => []),
  ]);

  const activeGoals = allGoals.filter((g) => !g.isArchived && !g.isPaused && !g.isCompleted);

  // Derive Daily Missions
  const missions = deriveDailyMissions(activeGoals, todayCheckins, weekCheckins, weekIntention, todayStr);
  const smartOneThing = getSmartOneThing(missions);

  // Derive Weekly Summary & Progress
  const weeklySummary = calculateWeeklyProgress(activeGoals, weekCheckins, weekIntention);

  // Derive Streak
  const streak = calculateDailyStreak(allCheckins);

  // Derive Personal Records
  const personalRecords = calculatePersonalRecords(activeGoals, allCheckins, weekIntention ? [weekIntention] : [], streak);

  // Calculate day of week index (0=Sun, 1=Mon, ..., 6=Sat)
  const dayOfWeekIndex = new Date().getDay();
  const weeklyStatus = deriveWeeklyStatus(
    weeklySummary.grindScorePercent,
    dayOfWeekIndex,
    weeklySummary.totalGoals,
    weeklySummary.goalsMetCount
  );

  // Derive Character Daily Briefing
  const briefing = deriveCharacterBriefing(openCourtCases, weeklySummary, missions, streak);

  // Most recent note (if any)
  const recentNote = notes && notes.length > 0 ? notes[0] : null;

  // Days remaining in current week (inclusive)
  const daysRemainingInWeek = Math.max(1, 7 - (dayOfWeekIndex === 0 ? 7 : dayOfWeekIndex) + 1);

  return {
    dateStr: todayStr,
    weekStartStr: currentWeekStartStr,
    streak,
    goals: activeGoals,
    missions,
    smartOneThing,
    weeklySummary,
    weeklyStatus,
    daysRemainingInWeek,
    weekIntention,
    openCourtCases,
    topInsight,
    briefing,
    recentNote,
    personalRecords,
    unlockedAchievementsCount: unlockedAchievements.length,
    newlyUnlockedAchievement,
    todayCheckins,
  };
}
