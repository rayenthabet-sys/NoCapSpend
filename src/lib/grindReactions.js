// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Character Reaction Engine
// Dedicated persona & motivational reaction system for The Grind.
//
// GUARANTEE:
// Does NOT modify or import characterEngine.js or characterReactions.js.
// Consumes only canonical assets registered in characters.js.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from './grindCheckins';

const DIALOGUE_POOLS = {
  SUCCESS: {
    characterKey: 'jazmine',
    assetId: 'jazmine_complete',
    animationType: 'webp',
    title: 'EXECUTION COMPLETE',
    quotes: [
      "THAT'S WHAT I'M TALKIN' ABOUT!",
      'KEEP THAT SAME ENERGY TOMORROW!',
      "YOU ACTUALLY DID WHAT YOU SAID YOU'D DO!",
    ],
    subtext: 'All commitments locked in for today. Discipline pays off.',
  },
  STREAK: {
    characterKey: 'ed',
    assetId: 'ed_wealth',
    animationType: 'native',
    title: 'STREAK IN MOTION',
    quotes: [
      'NOW THAT IS REAL CONSISTENCY.',
      "YOU'RE STARTING TO LOOK DANGEROUS.",
      'CAPITAL OF DISCIPLINE IS GROWING.',
    ],
    subtext: 'Multiple days of consecutive execution. Keep the chain unbroken.',
  },
  PARTIAL: {
    characterKey: 'riley',
    assetId: 'riley_light',
    animationType: 'native',
    title: 'PARTIAL PROGRESS',
    quotes: [
      'YOU DID SOME OF IT. NOW FINISH THE JOB.',
      "HALF THE WORK AIN'T THE WHOLE WORK.",
      'LIGHT PROGRESS TODAY, BUT WATCH YOUR PACE.',
    ],
    subtext: 'Some goals completed. Do not leave the rest on the table.',
  },
  FAILURE: {
    characterKey: 'stinkmeaner',
    assetId: 'stink_stern',
    animationType: 'webp',
    title: 'NO EXCUSES',
    quotes: [
      'YOU SAID YOU WAS GONNA DO IT!',
      'GRIND, MOTHERFUCKER!',
      'TOMORROW BETTER NOT LOOK LIKE TODAY!',
    ],
    subtext: 'Missed your targets today. Reset your focus and come back stronger.',
  },
  DISASTER: {
    characterKey: 'ruckus',
    assetId: 'ruckus_alarm',
    animationType: 'webp',
    title: 'DISCIPLINE COLLAPSE',
    quotes: [
      'DISASTER! ZERO DISCIPLINE DETECTED!',
      'ALL TARGETS ABANDONED! UNACCEPTABLE!',
    ],
    subtext: 'Every single goal marked not done today. Time for an intervention.',
  },
  DEFAULT: {
    characterKey: 'robert',
    assetId: 'robert_guidance',
    animationType: 'native',
    title: 'DAILY ACCOUNTABILITY',
    quotes: [
      '“YOU GOT PLANS OR YOU JUST TALKING?”',
      'LOOK AT YOUR TARGETS AS A WHOLE.',
      'STAY DISCIPLINED WITH YOUR TIME.',
    ],
    subtext: 'Set weekly targets. Check in daily. Keep that same energy.',
  },
};

const WEEKLY_REVIEW_POOLS = {
  ELITE: {
    characterKey: 'ed',
    assetId: 'ed_wealth',
    animationType: 'native',
    speaker: 'ED WUNCLER III',
    quotes: [
      'NOW THAT IS REAL CONSISTENCY.',
      'CAPITAL OF DISCIPLINE IS FULLY ACCUMULATED.',
      'UNTOUCHABLE EXECUTION. THIS IS HOW WINNERS MOVE.',
      'A FULL WEEK OF EXCELLENCE. KEEP BUILDING CAPITAL.',
    ],
    badge: '★ ELITE EXECUTION',
  },
  SOLID: {
    characterKey: 'robert',
    assetId: 'robert_reassure',
    animationType: 'native',
    speaker: 'GRANDDAD ROBERT',
    quotes: [
      "THAT'S WHAT I'M TALKIN' ABOUT.",
      'KEEP THAT SAME ENERGY NEXT WEEK.',
      'YOU ACTUALLY HANDLED YOUR BUSINESS.',
      'A GOOD, SOLID WEEK. EVERYTHING IN ORDER.',
    ],
    badge: '✓ SOLID DISCIPLINE',
  },
  SHAKY: {
    characterKey: 'riley',
    assetId: 'riley_light',
    animationType: 'native',
    speaker: 'RILEY FREEMAN',
    quotes: [
      'YOU DID SOME WORK. NOW FINISH THE JOB.',
      "HALF THE WORK AIN'T THE WHOLE WORK.",
      'LIGHT PROGRESS, BUT YOU LEFT TOO MUCH ON THE TABLE.',
      'WE AIN’T DOING MEDIOCRE OUT HERE. STEP IT UP.',
    ],
    badge: '⚠ SHAKY OUTPUT',
  },
  STRUGGLING: {
    characterKey: 'stinkmeaner',
    assetId: 'stink_stern',
    animationType: 'webp',
    speaker: 'COLONEL STINKMEANER',
    quotes: [
      'YOU SAID YOU WAS GONNA DO IT!',
      'GRIND, MOTHERFUCKER!',
      'NEXT WEEK BETTER NOT LOOK LIKE THIS WEEK!',
      'STOP MAKING EXCUSES AND HANDLE YOUR BUSINESS!',
    ],
    badge: '✗ STANDARDS SLIPPED',
  },
  DISASTER: {
    characterKey: 'ruckus',
    assetId: 'ruckus_alarm',
    animationType: 'webp',
    speaker: 'UNCLE RUCKUS',
    quotes: [
      'DISASTER! ZERO DISCIPLINE DETECTED!',
      'A COMPLETE COLLAPSE OF STANDARDS!',
      'LOOK AT THIS PERFORMANCE! SHUT IT DOWN!',
      'NOT EVEN ONE GOAL HIT! UNACCEPTABLE!',
    ],
    badge: '🚨 CATASTROPHIC WEEK',
  },
};

/**
 * Deterministic string hash helper for consistent review quotes.
 */
function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Resolve character reaction for daily check-in state.
 */
export function resolveGrindReaction({
  totalTodayGoals = 0,
  completedTodayCount = 0,
  notDoneTodayCount = 0,
  streak = 0,
} = {}) {
  if (totalTodayGoals === 0) {
    const d = DIALOGUE_POOLS.DEFAULT;
    return { ...d, quote: d.quotes[0] };
  }

  if (completedTodayCount > 0 && completedTodayCount === totalTodayGoals) {
    if (streak >= 3) {
      const d = DIALOGUE_POOLS.STREAK;
      const quote = d.quotes[Math.floor(Math.random() * d.quotes.length)];
      return { ...d, quote, subtext: `${streak}-day streak locked in!` };
    }
    const d = DIALOGUE_POOLS.SUCCESS;
    const quote = d.quotes[Math.floor(Math.random() * d.quotes.length)];
    return { ...d, quote };
  }

  if (notDoneTodayCount > 0 && notDoneTodayCount === totalTodayGoals) {
    const d = DIALOGUE_POOLS.DISASTER;
    const quote = d.quotes[Math.floor(Math.random() * d.quotes.length)];
    return { ...d, quote };
  }

  if (notDoneTodayCount > 0 && notDoneTodayCount >= completedTodayCount) {
    const d = DIALOGUE_POOLS.FAILURE;
    const quote = d.quotes[Math.floor(Math.random() * d.quotes.length)];
    return { ...d, quote };
  }

  if (completedTodayCount > 0 && completedTodayCount < totalTodayGoals) {
    const d = DIALOGUE_POOLS.PARTIAL;
    const quote = d.quotes[Math.floor(Math.random() * d.quotes.length)];
    return { ...d, quote };
  }

  const d = DIALOGUE_POOLS.DEFAULT;
  return { ...d, quote: d.quotes[0] };
}

/**
 * Resolve deterministic weekly review character commentary.
 *
 * @param {string} userId
 * @param {string} weekStart
 * @param {string} tierKey - 'ELITE' | 'SOLID' | 'SHAKY' | 'STRUGGLING' | 'DISASTER'
 * @param {number} score
 * @returns {Object} Review reaction descriptor
 */
export function resolveWeeklyReviewReaction(userId = '', weekStart = '', tierKey = 'SOLID', score = 0) {
  const pool = WEEKLY_REVIEW_POOLS[tierKey] || WEEKLY_REVIEW_POOLS.SOLID;
  const seed = `${userId}:${weekStart}:${tierKey}`;
  const index = hashString(seed) % pool.quotes.length;
  const quote = pool.quotes[index];

  return {
    characterKey: pool.characterKey,
    assetId: pool.assetId,
    animationType: pool.animationType,
    speaker: pool.speaker,
    quote,
    badge: pool.badge,
    score,
  };
}

/**
 * Resolve character reaction for converting a note to a Grind goal.
 */
export function resolveNoteConversionReaction() {
  const options = [
    {
      characterKey: 'robert',
      assetId: 'robert_guidance',
      animationType: 'native',
      speaker: 'GRANDDAD ROBERT',
      quote: 'YOU HAD AN IDEA. NOW YOU GOT A PLAN.',
      subtext: 'Turn thoughts into consistent execution.',
    },
    {
      characterKey: 'jazmine',
      assetId: 'jazmine_complete',
      animationType: 'webp',
      speaker: 'JAZMINE DUPREE',
      quote: 'LESS TALK. MORE EXECUTION!',
      subtext: 'Goal locked in. Now get to work.',
    },
    {
      characterKey: 'ed',
      assetId: 'ed_wealth',
      animationType: 'native',
      speaker: 'ED WUNCLER III',
      quote: 'EXECUTE THE BLUEPRINT.',
      subtext: 'Capital starts with a clear target.',
    },
  ];

  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Resolve character reaction for weekly intention events (lock-in, renegotiation, falling behind).
 */
export function resolveWeekIntentionReaction(eventType = 'LOCK_IN', params = {}) {
  if (eventType === 'RENEGOTIATION') {
    return {
      characterKey: 'robert',
      assetId: 'robert_guidance',
      animationType: 'native',
      speaker: 'GRANDDAD ROBERT',
      quote: "THERE'S A DIFFERENCE BETWEEN QUITTING AND MAKING A REALISTIC PLAN.",
      subtext: 'Smart adjustment. Now honor the new deal.',
    };
  }

  if (eventType === 'FALLING_BEHIND') {
    return {
      characterKey: 'riley',
      assetId: 'riley_light',
      animationType: 'native',
      speaker: 'RILEY FREEMAN',
      quote: "YOU LOCKED IT IN. NOW WHERE YOU AT?",
      subtext: params.goalTitle ? `You are falling behind on "${params.goalTitle}". Step it up.` : 'You fell behind on your weekly commitments.',
    };
  }

  if (eventType === 'PERFECT_WEEK') {
    return {
      characterKey: 'ed',
      assetId: 'ed_wealth',
      animationType: 'native',
      speaker: 'ED WUNCLER III',
      quote: "YOU'VE BEEN HANDLING BUSINESS.",
      subtext: 'Every single commitment honored. True capital of discipline.',
    };
  }

  // Default: LOCK_IN
  const lockInOptions = [
    {
      characterKey: 'ed',
      assetId: 'ed_wealth',
      animationType: 'native',
      speaker: 'ED WUNCLER III',
      quote: 'NO MORE PLANNING. TIME TO EXECUTE.',
      subtext: 'Your weekly commitments are locked in stone.',
    },
    {
      characterKey: 'jazmine',
      assetId: 'jazmine_complete',
      animationType: 'webp',
      speaker: 'JAZMINE DUPREE',
      quote: "YOU SAID YOU'D DO IT. NOW DO IT!",
      subtext: 'Targets are set for the week. Let’s get to work!',
    },
    {
      characterKey: 'robert',
      assetId: 'robert_reassure',
      animationType: 'native',
      speaker: 'GRANDDAD ROBERT',
      quote: 'YOU COMMITTED. NOW STAND ON BUSINESS.',
      subtext: 'Consistency starts with keeping your own promises.',
    },
  ];

  return lockInOptions[Math.floor(Math.random() * lockInOptions.length)];
}

/**
 * Resolve character reaction for an achievement unlock event.
 */
export function resolveAchievementReaction(achievementId = '') {
  if (achievementId === 'FIRST_GRIND' || achievementId === 'FIRST_CHECK') {
    return {
      characterKey: 'robert',
      assetId: 'robert_guidance',
      animationType: 'native',
      speaker: 'GRANDDAD ROBERT',
      quote: 'YOU FINALLY STARTED.',
      subtext: 'First blood on the board. Now keep showing up.',
    };
  }

  if (achievementId === 'STREAK_7' || achievementId === 'STREAK_3') {
    return {
      characterKey: 'riley',
      assetId: 'riley_light',
      animationType: 'native',
      speaker: 'RILEY FREEMAN',
      quote: "SEVEN DAYS? DON'T STOP NOW.",
      subtext: 'You built the momentum. Keep that same energy.',
    };
  }

  if (achievementId === 'PERFECT_WEEK' || achievementId === 'THREE_PERFECT') {
    return {
      characterKey: 'ed',
      assetId: 'ed_wealth',
      animationType: 'native',
      speaker: 'ED WUNCLER III',
      quote: "NOW THAT'S EXECUTION.",
      subtext: 'Flawless performance across every commitment.',
    };
  }

  if (achievementId === 'COMEBACK' || achievementId === 'BACK_IN_THE_ROOM') {
    return {
      characterKey: 'riley',
      assetId: 'riley_light',
      animationType: 'native',
      speaker: 'RILEY FREEMAN',
      quote: 'YOU FELL OFF. THEN YOU GOT BACK UP.',
      subtext: 'Real ones bounce back when things get shaky.',
    };
  }

  if (achievementId === 'STREAK_30' || achievementId === 'STREAK_14') {
    return {
      characterKey: 'ed',
      assetId: 'ed_wealth',
      animationType: 'native',
      speaker: 'ED WUNCLER III',
      quote: "THIRTY DAYS. NOW THAT'S A HABIT.",
      subtext: 'You operate on a different frequency now.',
    };
  }

  if (achievementId === 'NO_TALK') {
    return {
      characterKey: 'jazmine',
      assetId: 'jazmine_complete',
      animationType: 'webp',
      speaker: 'JAZMINE DUPREE',
      quote: 'NO TALK. ALL WORK.',
      subtext: 'Wrote it down, committed, and finished the job.',
    };
  }

  // Default achievement reaction
  return {
    characterKey: 'riley',
    assetId: 'riley_light',
    animationType: 'native',
    speaker: 'RILEY FREEMAN',
    quote: 'OKAY. I SEE YOU.',
    subtext: 'Achievement unlocked. Keep grinding.',
  };
}

/**
 * Resolve receipt verdict and character commentary for a weekly receipt.
 */
export function resolveReceiptVerdict(tierKey = 'SOLID', params = {}) {
  if (tierKey === 'ELITE') {
    return {
      characterKey: 'ed',
      assetId: 'ed_wealth',
      animationType: 'native',
      speaker: 'ED WUNCLER III',
      verdictTitle: 'UNTOUCHABLE EXECUTION',
      verdictBody: "YOU DID WHAT YOU SAID YOU'D DO. THAT'S CAPITAL.",
      quote: "NOW THAT'S A RECEIPT WORTH KEEPING.",
    };
  }

  if (tierKey === 'SOLID') {
    return {
      characterKey: 'robert',
      assetId: 'robert_guidance',
      animationType: 'native',
      speaker: 'GRANDDAD ROBERT',
      verdictTitle: 'STAND ON BUSINESS',
      verdictBody: 'NOT PERFECT. BUT YOU SHOWED UP AND HANDLED BUSINESS.',
      quote: "YOU DIDN'T HAVE TO BE PERFECT. YOU HAD TO BE CONSISTENT.",
    };
  }

  if (tierKey === 'SHAKY') {
    return {
      characterKey: 'riley',
      assetId: 'riley_light',
      animationType: 'native',
      speaker: 'RILEY FREEMAN',
      verdictTitle: 'LEFT WORK ON THE TABLE',
      verdictBody: 'YOU STARTED OFF AIGHT, BUT LET TOO MANY SLIP AT THE END.',
      quote: 'YOU KNOW EXACTLY WHERE YOU SLIPPED.',
    };
  }

  if (tierKey === 'STRUGGLING') {
    return {
      characterKey: 'ruckus',
      assetId: 'ruckus_scold',
      animationType: 'native',
      speaker: 'UNCLE RUCKUS',
      verdictTitle: 'TALK CHEAP',
      verdictBody: 'THE PLAN WAS BETTER THAN THE EXECUTION. STEP IT UP.',
      quote: 'READ THAT RECEIPT AGAIN! LOOK AT THIS TRAVESTY!',
    };
  }

  // DISASTER
  return {
    characterKey: 'ruckus',
    assetId: 'ruckus_scold',
    animationType: 'native',
    speaker: 'UNCLE RUCKUS',
    verdictTitle: 'GHOSTED YOUR OWN PLAN',
    verdictBody: 'YOU LOCKED IN COMMITMENTS AND THEN DISAPPEARED INTO THIN AIR.',
    quote: 'THAT RECEIPT IS AN ABOMINATION BEFORE GOD!',
  };
}

/**
 * Resolve character reaction when a weekly reflection is saved.
 */
export function resolveReflectionSavedReaction() {
  const options = [
    {
      characterKey: 'riley',
      assetId: 'riley_light',
      animationType: 'native',
      speaker: 'RILEY FREEMAN',
      quote: 'NOW YOU KNOW WHAT WAS ACTUALLY HOLDING YOU BACK.',
      subtext: 'You wrote it down. Don’t repeat the same mistakes.',
    },
    {
      characterKey: 'robert',
      assetId: 'robert_reassure',
      animationType: 'native',
      speaker: 'GRANDDAD ROBERT',
      quote: 'AN HONEST MAN CAN BUILD ON TRUTH.',
      subtext: 'Self-awareness is where real discipline starts.',
    },
    {
      characterKey: 'ed',
      assetId: 'ed_wealth',
      animationType: 'native',
      speaker: 'ED WUNCLER III',
      quote: 'ADAPT THE SYSTEM. EXECUTE NEXT WEEK.',
      subtext: 'Review the data. Make the adjustment. Move forward.',
    },
  ];

  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Resolve character reaction for Character Court confrontations and resolutions.
 */
export function resolveCourtReaction(trigger = 'REPEATED_WEEKLY_FAILURE', character = 'riley', params = {}) {
  if (character === 'robert' || trigger === 'REPEATED_RENEGOTIATION') {
    return {
      characterKey: 'robert',
      assetId: 'robert_guidance',
      animationType: 'native',
      speaker: 'GRANDDAD ROBERT',
      headline: 'REPEATED RENEGOTIATIONS',
      quote: "WE KEEP LOWERING THE TARGET. MAYBE THE PROBLEM ISN'T THE TARGET.",
      subtext: 'You adjusted this goal multiple weeks in a row. Let’s diagnose the real problem.',
    };
  }

  if (character === 'stinkmeaner' || trigger === 'GOAL_ABANDONMENT') {
    return {
      characterKey: 'stinkmeaner',
      assetId: 'stinkmeaner_roast',
      animationType: 'native',
      speaker: 'COLONEL STINKMEANER',
      headline: 'GOAL ABANDONMENT',
      quote: 'WHY DO YOU KEEP PRETENDING THIS MATTERS TO YOU?!',
      subtext: 'You committed to this goal and haven’t touched it once in weeks.',
    };
  }

  if (character === 'ed') {
    return {
      characterKey: 'ed',
      assetId: 'ed_wealth',
      animationType: 'native',
      speaker: 'ED WUNCLER III',
      headline: 'SYSTEMIC EXECUTION BREAKDOWN',
      quote: 'AT SOME POINT, THE PATTERN STOPS BEING AN ACCIDENT.',
      subtext: 'Look at the data. What is actually blocking you from getting this done?',
    };
  }

  // Default: Riley
  return {
    characterKey: 'riley',
    assetId: 'riley_light',
    animationType: 'native',
    speaker: 'RILEY FREEMAN',
    headline: 'REPEATED COMMITMENT FAILURE',
    quote: "YOU KEEP MAKING THE SAME PROMISE. NOW WHERE YOU AT?",
    subtext: params.goalTitle ? `You missed target on "${params.goalTitle}" multiple weeks in a row.` : 'You fell short on this goal two weeks in a row.',
  };
}

/**
 * Check if today's daily review event was already evaluated & shown to the user.
 */
export async function hasDailyReviewBeenShown(userId, date = getTodayDateString()) {
  if (!userId) return true;
  try {
    const key = `@bb_cache_${userId}:daily_review_${date}`;
    const val = await AsyncStorage.getItem(key);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark today's daily review event as shown.
 */
export async function markDailyReviewShown(userId, date = getTodayDateString()) {
  if (!userId) return;
  try {
    const key = `@bb_cache_${userId}:daily_review_${date}`;
    await AsyncStorage.setItem(key, 'true');
  } catch {}
}

/**
 * Check if a weekly review modal for this week has been viewed.
 */
export async function hasWeeklyReviewBeenShown(userId, weekStart) {
  if (!userId || !weekStart) return true;
  try {
    const key = `@bb_cache_${userId}:weekly_review_${weekStart}`;
    const val = await AsyncStorage.getItem(key);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark weekly review modal as viewed for this week.
 */
export async function markWeeklyReviewShown(userId, weekStart) {
  if (!userId || !weekStart) return;
  try {
    const key = `@bb_cache_${userId}:weekly_review_${weekStart}`;
    await AsyncStorage.setItem(key, 'true');
  } catch {}
}
