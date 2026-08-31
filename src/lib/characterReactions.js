// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Character Dialogue Registry
// Isolated from Option B financial terminology.
// Character reactions do NOT mutate financial state.
// ─────────────────────────────────────────────────────────────────

export const characterDialogue = {
  robert: {
    default: [
      "LOOK AT THE MONTH AS A WHOLE.",
      "EVERYTHING IN ORDER.",
      "STAY DISCIPLINED WITH YOUR FINANCES.",
    ],
    reassure: [
      "BALANCE RESTORED. PROCEED.",
      "GOOD. BACK UNDER CONTROL.",
    ],
    farewell: [
      "UNTIL NEXT TIME. STAY SAFE OUT THERE.",
      "STAY DISCIPLINED. UNTIL NEXT TIME.",
    ],
  },
  slickback: {
    income: [
      "NOW THAT'S HOW YOU BUILD SAVINGS.",
      "INCOME RECEIVED. PROCEED ACCORDINGLY.",
      "REVENUE LOOKING PROPER.",
    ],
    bigIncome: [
      "A SERIOUS INFLOW. MAGNIFICENT.",
      "THAT'S A MAJOR DEPOSIT. WELL DONE.",
    ],
  },
  riley: {
    lightSpend: [
      "REALLY? THAT'S WHAT WE SPENDING ON?",
      "LIGHT WORK, BUT WATCH IT.",
      "ANOTHER SMALL EXPENSE.",
    ],
  },
  stinkmeaner: {
    consequential: [
      "WHAT ARE YOU BUYING NOW?!",
      "YOU DON'T NEED THAT! STOP OVERSPENDING!",
      "ANOTHER ONE?! ARE YOU SERIOUS?!",
    ],
  },
  tom: {
    warning: [
      "WE'RE GETTING TOO CLOSE TO THE LIMIT...",
      "PLEASE SLOW DOWN BEFORE WE BREACH!",
      "I'M GETTING NERVOUS ABOUT THIS BUDGET.",
    ],
  },
  ruckus: {
    critical: [
      "IT'S AN ABSOLUTE DISASTER! SHUT IT DOWN!",
      "BUDGET EXCEEDED! WE ARE IN THE RED!",
      "CODE RED! THE LEDGER HAS COLLAPSED!",
    ],
  },
  jazmine: {
    progress: [
      "LOOK AT THAT PROGRESS! ALMOST THERE!",
      "GREAT PROGRESS! KEEP GOING!",
    ],
    complete: [
      "WE REACHED THE TARGET! WE ACTUALLY SAVED IT!",
      "GOAL ACCOMPLISHED! YES!",
    ],
  },
  huey: {
    analytics: [
      "LET'S EXAMINE WHAT THE DATA ACTUALLY SAYS.",
      "THE NUMBERS DON'T LIE.",
      "ANALYZING INCOME VERSUS EXPENSES.",
    ],
  },
  ed: {
    wealth: [
      "UNTOUCHABLE SURPLUS. CAPITAL IS GROWING.",
      "FULLY LIQUID AND COMFORTABLE.",
      "THIS IS HOW CAPITAL GROWS.",
    ],
  },
};

/**
 * Pure helper to retrieve a random dialogue string for a given character & context.
 * Returns a fallback if key is not found. Never mutates state.
 */
export function getRandomDialogue(characterKey, contextKey = 'default') {
  const character = characterDialogue[characterKey];
  if (!character) return "LOOK AT THE MONTH AS A WHOLE.";

  const pool = character[contextKey] || character.default || Object.values(character)[0];
  if (!pool || pool.length === 0) return "LOOK AT THE MONTH AS A WHOLE.";

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}
