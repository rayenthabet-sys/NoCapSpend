// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Behavioral Analytics & Intelligence Engine
// Purely deterministic pattern recognition derived from user history.
// Zero AI, zero external APIs, zero NLP, zero psychological claims.
//
// ISOLATION GUARANTEE:
// Zero interaction with financial accounts, budgets, savings, or expenses.
// ─────────────────────────────────────────────────────────────────

import { getStartOfWeekDateString, getOffsetWeekStartDateString, getAllUserCheckins, formatLocalDate } from './grindCheckins';
import { getGrindGoals } from './grindStore';
import { getWeekHistory } from './grindWeek';
import { getCourtCases } from './grindCourt';
import { calculateGoalProgress, calculateWeeklyProgress } from './grindStreaks';

export const MIN_COMPLETED_WEEKS = 4;

export const CONFIDENCE_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

/**
 * Helper to determine confidence rating based on sample count.
 */
function getConfidence(sampleCount) {
  if (sampleCount >= 8) return CONFIDENCE_LEVELS.HIGH;
  if (sampleCount >= 5) return CONFIDENCE_LEVELS.MEDIUM;
  return CONFIDENCE_LEVELS.LOW;
}

/**
 * 1. COMMITMENT LOAD INSIGHT: <= 3 vs > 3 commitments.
 */
export function calculateCommitmentLoadInsight(weekSummaries = []) {
  const lowLoad = weekSummaries.filter((w) => w.commitmentsCount > 0 && w.commitmentsCount <= 3);
  const highLoad = weekSummaries.filter((w) => w.commitmentsCount > 3);

  if (lowLoad.length < 2 || highLoad.length < 2) return null;

  const lowAvg = Math.round(lowLoad.reduce((sum, w) => sum + w.score, 0) / lowLoad.length);
  const highAvg = Math.round(highLoad.reduce((sum, w) => sum + w.score, 0) / highLoad.length);

  const totalWeeks = lowLoad.length + highLoad.length;
  if (totalWeeks < MIN_COMPLETED_WEEKS) return null;

  const diff = lowAvg - highAvg;
  if (Math.abs(diff) < 8) return null; // No meaningful distinction

  if (diff > 0) {
    return {
      id: 'COMMITMENT_LOAD',
      type: 'PATTERN',
      title: 'YOU PERFORM BETTER WITH FEWER COMMITMENTS',
      conclusion: `${lowAvg}% vs ${highAvg}% average execution.`,
      description: `Your weekly score is significantly higher when you lock in 3 or fewer goals rather than overloading your plate.`,
      comparison: {
        primaryLabel: '≤ 3 COMMITMENTS',
        primaryScore: lowAvg,
        primaryCount: lowLoad.length,
        secondaryLabel: '> 3 COMMITMENTS',
        secondaryScore: highAvg,
        secondaryCount: highLoad.length,
      },
      confidence: getConfidence(totalWeeks),
    };
  } else {
    return {
      id: 'COMMITMENT_LOAD',
      type: 'PATTERN',
      title: 'HIGH LOAD DOES NOT HURT YOUR EXECUTION',
      conclusion: `${highAvg}% vs ${lowAvg}% average execution.`,
      description: `You sustain high execution rates even when managing 4 or more commitments simultaneously.`,
      comparison: {
        primaryLabel: '> 3 COMMITMENTS',
        primaryScore: highAvg,
        primaryCount: highLoad.length,
        secondaryLabel: '≤ 3 COMMITMENTS',
        secondaryScore: lowAvg,
        secondaryCount: lowLoad.length,
      },
      confidence: getConfidence(totalWeeks),
    };
  }
}

/**
 * 2. SWEET SPOT LOAD INSIGHT: Finds optimal commitments range.
 */
export function calculateSweetSpotInsight(weekSummaries = []) {
  if (weekSummaries.length < MIN_COMPLETED_WEEKS) return null;

  const bucketScores = {};
  for (const w of weekSummaries) {
    if (!w.commitmentsCount || w.commitmentsCount === 0) continue;
    const bucket = w.commitmentsCount <= 2 ? '1–2' : w.commitmentsCount <= 4 ? '3–4' : '5+';
    if (!bucketScores[bucket]) bucketScores[bucket] = { total: 0, count: 0 };
    bucketScores[bucket].total += w.score;
    bucketScores[bucket].count += 1;
  }

  let bestBucket = null;
  let bestAvg = -1;

  for (const [bucket, data] of Object.entries(bucketScores)) {
    if (data.count >= 2) {
      const avg = Math.round(data.total / data.count);
      if (avg > bestAvg) {
        bestAvg = avg;
        bestBucket = bucket;
      }
    }
  }

  if (!bestBucket || bestAvg < 70) return null;

  return {
    id: 'SWEET_SPOT',
    type: 'OPTIMIZATION',
    title: 'YOUR COMMITMENT SWEET SPOT',
    conclusion: `${bestBucket} weekly commitments (${bestAvg}% avg).`,
    description: `Historical data shows your execution is strongest and most resilient when locking in ${bestBucket} goals.`,
    metric: `${bestAvg}%`,
    confidence: getConfidence(weekSummaries.length),
  };
}

/**
 * 3. RENEGOTIATION EFFECTIVENESS INSIGHT: Weeks with adjustment vs without.
 */
export function calculateRenegotiationInsight(weekSummaries = []) {
  const renegotiated = weekSummaries.filter((w) => w.hasRenegotiation);
  const standard = weekSummaries.filter((w) => !w.hasRenegotiation && w.commitmentsCount > 0);

  if (renegotiated.length < 2 || standard.length < 2) return null;

  const renAvg = Math.round(renegotiated.reduce((sum, w) => sum + w.score, 0) / renegotiated.length);
  const stdAvg = Math.round(standard.reduce((sum, w) => sum + w.score, 0) / standard.length);

  const totalWeeks = renegotiated.length + standard.length;

  if (renAvg >= 75) {
    return {
      id: 'RENEGOTIATION_EFFECTIVENESS',
      type: 'HABIT',
      title: 'ADJUSTING IS NOT QUITTING',
      conclusion: `${renAvg}% execution when adjusting.`,
      description: `Weeks where you responsibly renegotiated unrealistic targets averaged ${renAvg}% execution, keeping momentum alive rather than abandoning goals.`,
      comparison: {
        primaryLabel: 'RENEGOTIATED WEEKS',
        primaryScore: renAvg,
        primaryCount: renegotiated.length,
        secondaryLabel: 'FIXED WEEKS',
        secondaryScore: stdAvg,
        secondaryCount: standard.length,
      },
      confidence: getConfidence(totalWeeks),
    };
  }

  return null;
}

/**
 * 4. GOAL TYPE PERFORMANCE INSIGHT: Repetition vs Daily vs Quantity vs Once.
 */
export function calculateGoalTypeInsight(goals = [], allCheckins = [], weekHistory = []) {
  if (goals.length === 0 || allCheckins.length === 0) return null;

  const typeStats = {
    repetition: { total: 0, completed: 0, label: 'REPETITION' },
    daily: { total: 0, completed: 0, label: 'DAILY' },
    quantity: { total: 0, completed: 0, label: 'QUANTITY' },
    once: { total: 0, completed: 0, label: 'ONE-TIME' },
  };

  for (const w of weekHistory) {
    if (!w.commitments) continue;
    const startD = new Date(w.weekStart + 'T00:00:00');
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = formatLocalDate(endD);

    for (const c of w.commitments) {
      const goal = goals.find((g) => g.id === c.goalId);
      if (!goal) continue;
      const type = goal.goalType || 'repetition';
      if (!typeStats[type]) continue;

      const chks = allCheckins.filter((chk) => chk.goal_id === goal.id && chk.checkin_date >= w.weekStart && chk.checkin_date <= endStr);
      const prog = calculateGoalProgress(goal, chks, c);

      typeStats[type].total += 1;
      if (prog.isTargetMet) {
        typeStats[type].completed += 1;
      }
    }
  }

  const validTypes = Object.entries(typeStats)
    .filter(([_, data]) => data.total >= 4)
    .map(([type, data]) => ({
      type,
      label: data.label,
      rate: Math.round((data.completed / data.total) * 100),
      total: data.total,
    }))
    .sort((a, b) => b.rate - a.rate);

  if (validTypes.length < 2) return null;

  const best = validTypes[0];
  const lowest = validTypes[validTypes.length - 1];

  if (best.rate - lowest.rate < 12) return null;

  return {
    id: 'BEST_GOAL_TYPE',
    type: 'FORMAT',
    title: `STRONGEST FORMAT: ${best.label}`,
    conclusion: `${best.rate}% completion rate on ${best.label.toLowerCase()} goals.`,
    description: `You execute ${best.label.toLowerCase()} goals significantly more consistently than ${lowest.label.toLowerCase()} goals (${lowest.rate}%).`,
    comparison: {
      primaryLabel: best.label,
      primaryScore: best.rate,
      primaryCount: best.total,
      secondaryLabel: lowest.label,
      secondaryScore: lowest.rate,
      secondaryCount: lowest.total,
    },
    confidence: getConfidence(best.total + lowest.total),
  };
}

/**
 * 5. COMEBACK PROFILE INSIGHT: Rebound rate after difficult weeks.
 */
export function calculateComebackInsight(weekSummaries = []) {
  if (weekSummaries.length < 3) return null;

  let reboundCount = 0;
  let totalReboundScore = 0;

  for (let i = 1; i < weekSummaries.length; i++) {
    const prev = weekSummaries[i - 1];
    const curr = weekSummaries[i];
    if (prev.score < 50 && curr.score >= 80) {
      reboundCount++;
      totalReboundScore += curr.score;
    }
  }

  if (reboundCount === 0) return null;

  const avgRebound = Math.round(totalReboundScore / reboundCount);

  return {
    id: 'COMEBACK_PROFILE',
    type: 'RESILIENCE',
    title: 'COMEBACK SPECIALIST',
    conclusion: `${reboundCount} major recoveries (${avgRebound}% avg rebound).`,
    description: `When a difficult week happens, you consistently bounce back strong the following week rather than spiraling downward.`,
    metric: `${avgRebound}% REBOUND`,
    confidence: getConfidence(weekSummaries.length),
  };
}

/**
 * 6. COURT EFFECTIVENESS INSIGHT: Goal performance before vs after court resolution.
 */
export function calculateCourtEffectivenessInsight(goals = [], allCheckins = [], weekHistory = [], courtCases = []) {
  const resolvedCases = courtCases.filter((c) => c.status === 'resolved' && c.goalId);
  if (resolvedCases.length === 0) return null;

  for (const courtCase of resolvedCases) {
    const goal = goals.find((g) => g.id === courtCase.goalId && !g.isArchived);
    if (!goal) continue;

    const resolvedWeekStart = courtCase.weekStart;
    const postWeeks = weekHistory.filter((w) => w.weekStart > resolvedWeekStart && w.locked);
    if (postWeeks.length < 1) continue;

    const nextWeek = postWeeks[0];
    const nextCommitment = nextWeek.commitments?.find((c) => c.goalId === goal.id);
    if (!nextCommitment) continue;

    const startD = new Date(nextWeek.weekStart + 'T00:00:00');
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = endD.toISOString().slice(0, 10);

    const chks = allCheckins.filter((c) => c.goal_id === goal.id && c.checkin_date >= nextWeek.weekStart && c.checkin_date <= endStr);
    const prog = calculateGoalProgress(goal, chks, nextCommitment);

    if (prog.percent >= 80) {
      return {
        id: 'COURT_EFFECTIVENESS',
        type: 'DIAGNOSIS',
        title: 'THE COURT VERDICT WORKED',
        conclusion: `"${goal.title}" hit ${prog.percent}% after diagnosis.`,
        description: `Resolving the Character Court case for "${goal.title}" with diagnosis "${courtCase.diagnosis?.replace(/_/g, ' ')}" resulted in immediate execution recovery.`,
        metric: `${prog.percent}% POST-COURT`,
        confidence: CONFIDENCE_LEVELS.HIGH,
      };
    }
  }

  return null;
}

/**
 * Master evaluator: Loads all context in memory and generates structured insights.
 *
 * @param {string} userId
 * @returns {Promise<{ insights: Array<Object>, completedWeeksCount: number, hasEnoughData: boolean }>}
 */
export async function getAvailableInsights(userId) {
  if (!userId) return { insights: [], completedWeeksCount: 0, hasEnoughData: false };

  const [goals, allCheckins, weekHistory, courtCases] = await Promise.all([
    getGrindGoals(userId),
    getAllUserCheckins(userId),
    getWeekHistory(userId),
    getCourtCases(userId),
  ]);

  // Build sorted weekly summaries across all weeks in history (prioritize last 12 completed weeks)
  const lockedWeeks = weekHistory
    .filter((w) => w.locked)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const weekSummaries = [];

  for (const w of lockedWeeks) {
    const startD = new Date(w.weekStart + 'T00:00:00');
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = endD.toISOString().slice(0, 10);

    const chks = allCheckins.filter((c) => c.checkin_date >= w.weekStart && c.checkin_date <= endStr);
    const summary = calculateWeeklyProgress(goals, chks, w);

    const hasRenegotiation = Boolean(w.commitments?.some((c) => Boolean(c.adjustedAt)));

    weekSummaries.push({
      weekStart: w.weekStart,
      score: summary.grindScorePercent,
      commitmentsCount: w.commitments?.length || 0,
      goalsMetCount: summary.goalsMetCount,
      hasRenegotiation,
      tier: summary.tier,
    });
  }

  const completedWeeksCount = weekSummaries.length;
  const hasEnoughData = completedWeeksCount >= MIN_COMPLETED_WEEKS;

  if (!hasEnoughData) {
    return {
      insights: [],
      completedWeeksCount,
      hasEnoughData: false,
    };
  }

  // Calculate individual insights in priority order
  const insights = [];

  const loadInsight = calculateCommitmentLoadInsight(weekSummaries);
  if (loadInsight) insights.push(loadInsight);

  const sweetSpotInsight = calculateSweetSpotInsight(weekSummaries);
  if (sweetSpotInsight) insights.push(sweetSpotInsight);

  const courtInsight = calculateCourtEffectivenessInsight(goals, allCheckins, weekHistory, courtCases);
  if (courtInsight) insights.push(courtInsight);

  const comebackInsight = calculateComebackInsight(weekSummaries);
  if (comebackInsight) insights.push(comebackInsight);

  const goalTypeInsight = calculateGoalTypeInsight(goals, allCheckins, weekHistory);
  if (goalTypeInsight) insights.push(goalTypeInsight);

  const renegInsight = calculateRenegotiationInsight(weekSummaries);
  if (renegInsight) insights.push(renegInsight);

  return {
    insights,
    completedWeeksCount,
    hasEnoughData: true,
  };
}

/**
 * Get top single insight for dashboard highlight.
 */
export async function getTopInsight(userId) {
  const result = await getAvailableInsights(userId);
  if (result.insights.length > 0) {
    return result.insights[0];
  }
  return null;
}
