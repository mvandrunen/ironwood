// src/data/return_pressure_config.js
// v0.6.1: Calibration-only constants for the hidden Return Pressure system.
// No UI indicators. Effects are felt via dialogue tone and soft access friction.

export const RETURN_PRESSURE_CONFIG = {
  // How quickly pressure accrues when moving away from Ironwood while obligations remain unresolved.
  awayStepComfortGain: 1,
  awayStepTrustGain: 1,

  // Dampening when moving closer to Ironwood (keeps travel from feeling punitive).
  towardStepComfortRelief: 1,
  towardStepTrustRelief: 1,

  // Relief when actually entering Ironwood (partial relief, never full reset).
  onIronwoodVisitComfortRelief: 3,
  onIronwoodVisitTrustRelief: 2,

  // Pressure "levels" (used to decide how strongly we prune/shorten dialogue).
  // These are intentionally conservative to keep the effect subtle.
  levelThresholds: {
    low: 3,
    mid: 7,
    high: 12,
  },

  // Dialogue pruning by pressure level (max lines returned from NPC dialogue).
  dialogueMaxLinesByLevel: {
    none: 999,
    // Keep Chapter 1 readable: pressure should color tone, not remove critical information.
    low: 4,
    mid: 3,
    high: 2,
  },

  // Fishing Village "temptation loop" tuning:
  // Staying in comfort while obligations are unresolved quietly raises pressure.
  // (Implemented as periodic increments based on in-map steps; no timers/meters/UI.)
  stayTickSteps: 12,
  stayComfortGain: 0.6,
  stayTrustGain: 0.6,

  // Region-specific additional pruning (only in the three key regions).
  regionOverrides: {
    // Forest Camps: unease, less chatter.
    upper_forest_camp: { maxLinesDelta: 0 },
    lower_forest_camp: { maxLinesDelta: 0 },

    // Fishing Village: comfort that becomes quieter over time.
    fishing_village: { maxLinesDelta: -1 },

    // Mach Ranch: trust becomes conditional.
    mach_ranch: { maxLinesDelta: -1 },
  },
};
