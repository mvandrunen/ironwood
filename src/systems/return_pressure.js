// src/systems/return_pressure.js
// Hidden Return Pressure system.
// - No UI. No timers. No meters. No warnings.
// - Updates only on region traversal + major obligation state.
// - Manifests via dialogue tone/pruning and mild access friction (data-only).

import { RETURN_PRESSURE_CONFIG } from "../data/return_pressure_config.js";

const DEFAULT_STATE = {
  stepsAwayFromIronwood: 0,
  unresolvedIronwoodFlags: 0,
  comfortDecay: 0,
  trustErosion: 0,
  lastIronwoodVisitStep: 0,
};

export function ensureReturnPressureState(existing) {
  const src = (existing && typeof existing === "object") ? existing : {};
  return {
    ...DEFAULT_STATE,
    stepsAwayFromIronwood: Number.isFinite(src.stepsAwayFromIronwood) ? src.stepsAwayFromIronwood : DEFAULT_STATE.stepsAwayFromIronwood,
    unresolvedIronwoodFlags: Number.isFinite(src.unresolvedIronwoodFlags) ? src.unresolvedIronwoodFlags : DEFAULT_STATE.unresolvedIronwoodFlags,
    comfortDecay: Number.isFinite(src.comfortDecay) ? src.comfortDecay : DEFAULT_STATE.comfortDecay,
    trustErosion: Number.isFinite(src.trustErosion) ? src.trustErosion : DEFAULT_STATE.trustErosion,
    lastIronwoodVisitStep: Number.isFinite(src.lastIronwoodVisitStep) ? src.lastIronwoodVisitStep : DEFAULT_STATE.lastIronwoodVisitStep,
  };
}

function buildAdjacency(worldMap) {
  const adj = {};
  for (const n of (worldMap?.nodes || [])) adj[n.id] = [];
  for (const e of (worldMap?.connections || [])) {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to]) adj[e.to] = [];
    adj[e.from].push(e.to);
    adj[e.to].push(e.from);
  }
  return adj;
}

function shortestDistanceToIronwood(nodeId, worldMap) {
  const target = "ironwood_town";
  if (!nodeId) return Infinity;
  if (nodeId === target) return 0;

  const adj = buildAdjacency(worldMap);
  const q = [target];
  const dist = { [target]: 0 };

  while (q.length) {
    const cur = q.shift();
    const cd = dist[cur];
    for (const nxt of (adj[cur] || [])) {
      if (dist[nxt] !== undefined) continue;
      dist[nxt] = cd + 1;
      q.push(nxt);
    }
  }

  return dist[nodeId] ?? Infinity;
}

function computeUnresolvedObligations(state) {
  // Canonical obligations are represented by quest completion + high-signal flags.
  const f = state?.flags || {};
  const q = state?.quest?.progress || {};

  let unresolved = 0;

  // Quarry Rescue: if started but not completed, it is an obligation.
  const q1 = q?.q1_quarry_rescue;
  if (q1?.started && !q1?.completed) unresolved += 1;
  if (!f.chapter1_quarryRescueComplete) {
    // Before the rescue is confirmed back home, absence should still carry weight.
    unresolved += 1;
  }

  // Crossroads: once the valley opens, delay should feel increasingly costly.
  const q2 = q?.q2_crossroads;
  if (q2?.started && !q2?.completed) unresolved += 1;
  if (f.chapter1_crossroadsStarted && !f.chapter1_quarryRescueComplete) unresolved += 1;

  // Clamp to a small range to keep the system subtle.
  return Math.min(4, unresolved);
}

export function computePressureLevel(returnPressure, config = RETURN_PRESSURE_CONFIG) {
  const rp = ensureReturnPressureState(returnPressure);
  const score = (rp.comfortDecay + rp.trustErosion) + (rp.unresolvedIronwoodFlags * 2);

  if (score >= config.levelThresholds.high) return "high";
  if (score >= config.levelThresholds.mid) return "mid";
  if (score >= config.levelThresholds.low) return "low";
  return "none";
}

export function getReturnPressureTier(state) {
  try {
    return computePressureLevel(state);
  } catch (e) {
    return "none";
  }
}

export function onRegionTraverse(fromMapId, toMapId, state, worldMap, maps) {
  const rp = ensureReturnPressureState(state?.returnPressure);

  const fromNode = maps?.[fromMapId]?.worldNodeId || null;
  const toNode = maps?.[toMapId]?.worldNodeId || null;

  const dFrom = shortestDistanceToIronwood(fromNode, worldMap);
  const dTo = shortestDistanceToIronwood(toNode, worldMap);

  // Update obligations first (pressure only matters when home is "waiting" on something).
  rp.unresolvedIronwoodFlags = computeUnresolvedObligations(state);

  const obligationsActive = rp.unresolvedIronwoodFlags > 0;

  // Moving away vs toward Ironwood is evaluated on graph distance.
  const movingAway = dTo > dFrom;
  const movingToward = dTo < dFrom;

  if (obligationsActive && movingAway) {
    rp.stepsAwayFromIronwood += 1;
    rp.comfortDecay += RETURN_PRESSURE_CONFIG.awayStepComfortGain;
    rp.trustErosion += RETURN_PRESSURE_CONFIG.awayStepTrustGain;
  }

  if (movingToward) {
    rp.comfortDecay = Math.max(0, rp.comfortDecay - RETURN_PRESSURE_CONFIG.towardStepComfortRelief);
    rp.trustErosion = Math.max(0, rp.trustErosion - RETURN_PRESSURE_CONFIG.towardStepTrustRelief);
  }

  if (toNode === "ironwood_town") {
    rp.lastIronwoodVisitStep = rp.stepsAwayFromIronwood;
    rp.comfortDecay = Math.max(0, rp.comfortDecay - RETURN_PRESSURE_CONFIG.onIronwoodVisitComfortRelief);
    rp.trustErosion = Math.max(0, rp.trustErosion - RETURN_PRESSURE_CONFIG.onIronwoodVisitTrustRelief);
  }

  return rp;
}

function clampMaxLines(baseMax, delta) {
  const v = (baseMax + (delta || 0));
  return Math.max(1, v);
}

function pruneDialogueLines(lines, maxLines) {
  if (!Array.isArray(lines)) return lines;
  if (!Number.isFinite(maxLines)) return lines;
  return lines.slice(0, maxLines);
}

export function applyReturnPressureReactivity(baseMap, state) {
  if (!baseMap) return baseMap;

  // Never apply pressure effects to Ironwood interior/exterior; that is handled by Ironwood reactivity.
  if (baseMap.worldNodeId === "ironwood_town") return baseMap;

  const rp = ensureReturnPressureState(state?.returnPressure);
  rp.unresolvedIronwoodFlags = computeUnresolvedObligations(state);

  // If nothing is unresolved, we keep the world normal.
  if (rp.unresolvedIronwoodFlags <= 0) return baseMap;

  const level = computePressureLevel(rp);
  const cfg = RETURN_PRESSURE_CONFIG;
  const baseMax = cfg.dialogueMaxLinesByLevel[level] ?? cfg.dialogueMaxLinesByLevel.none;

  const override = cfg.regionOverrides?.[baseMap.worldNodeId] || null;
  const maxLines = clampMaxLines(baseMax, override?.maxLinesDelta);

  // Clone map shallowly; preserve triggers and functions by copying objects.
  const map = {
    ...baseMap,
    npcs: (baseMap.npcs || []).map(n => ({ ...n })),
    triggers: (baseMap.triggers || []).map(t => ({ ...t })),
    exits: (baseMap.exits || []).map(e => ({ ...e })),
    items: (baseMap.items || []).map(i => ({ ...i })),
  };

  // Dialogue tone/pruning: keep meaning, reduce comfort.
  for (const npc of (map.npcs || [])) {
    const fn = npc.dialogue;
    if (typeof fn !== "function") continue;
    npc.dialogue = function patchedDialogue() {
      try {
        // IMPORTANT: preserve the original dialogue signature (state, game, ...).
        // Many NPC dialogue functions depend on the passed-in state (e.g., state.flags).
        const lines = fn.apply(this, arguments);
        return pruneDialogueLines(lines, maxLines);
      } catch (e) {
        return fn.apply(this, arguments);
      }
    };
  }

  // Region-specific “felt” pressure without UI: adjust sign text subtly where present.
  // (Only if a map already has sign triggers; we do not add new ones.)
  if (Array.isArray(map.triggers)) {
    for (const t of map.triggers) {
      if (t?.type !== "sign" || !Array.isArray(t.lines)) continue;

      if (baseMap.worldNodeId === "fishing_village" && level !== "none") {
        // A gentle reminder of outside momentum without naming it.
        t.lines = pruneDialogueLines(
          [
            ...t.lines,
            "A posted note is sun-faded. The ink looks older than it should."
          ],
          3
        );
      }

      if ((baseMap.worldNodeId === "upper_forest_camp" || baseMap.worldNodeId === "lower_forest_camp") && level !== "none") {
        t.lines = pruneDialogueLines(
          [
            ...t.lines,
            "The camp feels tighter tonight. Fewer voices linger." 
          ],
          3
        );
      }

      if (baseMap.worldNodeId === "mach_ranch" && (level === "mid" || level === "high")) {
        t.lines = pruneDialogueLines(
          [
            ...t.lines,
            "Someone has wiped a name from the chalk board. No explanation."
          ],
          3
        );
      }
    }
  }

  // Route breadcrumb (non-UI): once the player experiences the Fishing Village "temptation" beat,
  // a washed-out post on River Road becomes readable and points toward Ursa Bluffs.
  if (state?.flags?.fv_temptationBeat && map.worldNodeId === "river_road") {
    const t = (map.triggers || []).find(tr => tr?.type === "sign" && tr.x === 5 && tr.y === 10);
    if (t) {
      t.lines = ["West Track", "Ursa Bluffs — follow the broken stones and keep the river on your right."];
    } else {
      map.triggers = Array.isArray(map.triggers) ? map.triggers : [];
      map.triggers.push({
        type: "sign",
        x: 5,
        y: 10,
        lines: ["West Track", "Ursa Bluffs — follow the broken stones and keep the river on your right."],
      });
    }
  }


  return map;
}
