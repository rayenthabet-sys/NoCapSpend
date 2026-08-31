// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Centralized Character Asset Registry
// Maps all 20 canonical PNG assets and 8 delivered animation sequences.
// ─────────────────────────────────────────────────────────────────

// ── 20 Canonical Character PNGs (Hash-Verified) ──
export const canonicalAssets = {
  // Robert Freeman (Baseline / Host)
  robert_neutral:  require('../../assets/characters/canonical/robert_neutral.png'),
  robert_guidance: require('../../assets/characters/canonical/robert_guidance.png'),
  robert_reassure: require('../../assets/characters/canonical/robert_reassure.png'),

  // Tom DuBois (Budget Pressure / Preventive Warning)
  tom_caution: require('../../assets/characters/canonical/tom_caution.png'),
  tom_alarm:   require('../../assets/characters/canonical/tom_alarm.png'),

  // Stinkmeaner (Large / Consequential / Repeated Expense)
  stink_stern:     require('../../assets/characters/canonical/stink_stern.png'),
  stink_explosive: require('../../assets/characters/canonical/stink_explosive.png'),

  // Uncle Ruckus (Critical Warning / Over-Budget Emergency)
  ruckus_alarm:     require('../../assets/characters/canonical/ruckus_alarm.png'),
  ruckus_emergency: require('../../assets/characters/canonical/ruckus_emergency.png'),

  // Riley Freeman (Light / Discretionary Expense)
  riley_light: require('../../assets/characters/canonical/riley_light.png'),
  riley_spend: require('../../assets/characters/canonical/riley_spend.png'),

  // Jazmine DuBois (Goal Progress / Completion)
  jazmine_progress: require('../../assets/characters/canonical/jazmine_progress.png'),
  jazmine_complete: require('../../assets/characters/canonical/jazmine_complete.png'),

  // Huey Freeman (Statistics / Analytics Host)
  huey_neutral: require('../../assets/characters/canonical/huey_neutral.png'),
  huey_analyze: require('../../assets/characters/canonical/huey_analyze.png'),
  huey_review:  require('../../assets/characters/canonical/huey_review.png'),

  // A Pimp Named Slickback (Income / Cash-In)
  slickback_cash:    require('../../assets/characters/canonical/slickback_cash.png'),
  slickback_bigcash: require('../../assets/characters/canonical/slickback_bigcash.png'),

  // Ed Wuncler III (Sustained Wealth / Abundance)
  ed_wealth:  require('../../assets/characters/canonical/ed_wealth.png'),
  ed_surplus: require('../../assets/characters/canonical/ed_surplus.png'),
};

// ── Delivered Animated WebP Sequences ──
export const animationWebPAssets = {
  stink_stern:     require('../../assets/characters/animations/stink_stern.webp'),
  stink_explosive: require('../../assets/characters/animations/stink_explosive.webp'),

  ruckus_alarm:               require('../../assets/characters/animations/ruckus_alarm.webp'),
  ruckus_alarm_critical_hold: require('../../assets/characters/animations/ruckus_alarm_critical_hold.webp'),
  ruckus_alarm_exit:          require('../../assets/characters/animations/ruckus_alarm_exit.webp'),

  ruckus_emergency:               require('../../assets/characters/animations/ruckus_emergency.webp'),
  ruckus_emergency_critical_hold: require('../../assets/characters/animations/ruckus_emergency_critical_hold.webp'),
  ruckus_emergency_exit:          require('../../assets/characters/animations/ruckus_emergency_exit.webp'),

  jazmine_progress: require('../../assets/characters/animations/jazmine_progress.webp'),
  jazmine_complete: require('../../assets/characters/animations/jazmine_complete.webp'),

  slickback_cash:    require('../../assets/characters/animations/slickback_cash.webp'),
  slickback_bigcash: require('../../assets/characters/animations/slickback_bigcash.webp'),
};

// ── Native Animation Parameter Profiles ──
export const nativeProfiles = require('../constants/nativeAnimationProfiles.json');

// ── Standard Character Aspect Ratio (512 / 768 = ~0.667) ──
export const CHARACTER_ASPECT_RATIO = 512 / 768;

// ── Standard Size Presets (Rendered height in px) ──
export const characterSizes = {
  micro:  60,
  small:  90,
  medium: 150,
  large:  210,
  hero:   260,
};

// Backward-compatible fallback getter
export function getCharacterAsset(assetId, animationType = 'native', ruckusPhase = 'entrance') {
  if (animationType === 'webp') {
    if (assetId === 'ruckus_alarm' || assetId === 'ruckus_emergency') {
      const key = `${assetId}${ruckusPhase === 'hold' ? '_critical_hold' : ruckusPhase === 'exit' ? '_exit' : ''}`;
      return animationWebPAssets[key] || animationWebPAssets[assetId] || canonicalAssets[assetId];
    }
    return animationWebPAssets[assetId] || canonicalAssets[assetId];
  }
  return canonicalAssets[assetId] || canonicalAssets.robert_neutral;
}
