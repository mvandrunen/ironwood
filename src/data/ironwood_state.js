// src/data/ironwood_state.js
// Ironwood reactivity is derived (not stored) from existing progression flags.
// No UI, no cutscenes: all changes are discoverable through play.

export function computeIronwoodStage(state) {
  const f = state?.flags || {};
  // Stage ordering (earliest -> latest):
  // 0: before quarry is cleared
  // 1: quarry cleared / word spreading
  // 2: Chapter 1 rescue complete and crossroads begun (town mobilizes)
  if (f.chapter1_crossroadsStarted) return 2;
  if (f.chapter1_quarryRescueComplete) return 2;
  if (f.quarryCleared) return 1;
  return 0;
}

export function getIronwoodReactivity(state) {
  const stage = computeIronwoodStage(state);

  // Doors are controlled by swapping the door tile to either wall(1) or exit(2).
  const doors = {
    caretakerHouse: true,                 // always accessible
    generalStore: stage >= 2,             // reopens after rescue is confirmed
    supplyShed: stage >= 1,               // supplies begin moving after quarry is quiet
    inn: stage >= 2,                      // travelers return once routes resume
    townHall: stage >= 2,                 // sealed until the town is ready to mobilize
  };

  // Population density changes by stage (NPC count and placement).
  // All NPCs are data-only and use simple dialogue branches.
  const population = {
    extraNpcCount: stage === 0 ? 0 : (stage === 1 ? 2 : 5),
  };

  return { stage, doors, population };
}

// Applies a lightweight runtime patch to maps related to Ironwood Town.
// Returns a NEW map object (no mutation of source maps).
export function applyIronwoodReactivity(baseMap, state) {
  if (!baseMap || baseMap.worldNodeId !== "ironwood_town") return baseMap;

  const { stage, doors } = getIronwoodReactivity(state);

  // Clone (preserve functions on NPCs/triggers by shallow copying objects)
  const map = {
    ...baseMap,
    tiles: baseMap.tiles ? baseMap.tiles.map(r => r.slice()) : baseMap.tiles,
    npcs: (baseMap.npcs || []).map(n => ({ ...n })),
    exits: (baseMap.exits || []).map(e => ({ ...e })),
    triggers: (baseMap.triggers || []).map(t => ({ ...t })),
    items: (baseMap.items || []).map(it => ({ ...it })),
  };

  // --- Door gating (tile swap only; exits remain defined) ---
  // Coordinates are defined in region1.js and must remain in-bounds.
  // Door tiles are: 2 = exit, 1 = wall/closed.
  const setDoor = (x, y, open) => {
    if (!map.tiles || !map.tiles[y] || typeof map.tiles[y][x] === "undefined") return;
    map.tiles[y][x] = open ? 2 : 1;
  };

  // Existing
  setDoor(6, 4, doors.caretakerHouse);      // caretaker house door
  setDoor(6, 12, doors.generalStore);       // general store door

  // New (v0.5.0)
  setDoor(8, 6, doors.townHall);            // town hall door
  setDoor(23, 12, doors.supplyShed);        // supply shed door
  setDoor(23, 18, doors.inn);               // inn door

  // Delay consequence: visible but non-blocking regression cue (no cutscenes, no UI).
  // If the player lingers on River Road, one Ironwood door shuts and a sign appears.
  if (state?.flags?.ironwood_delayStagnation) {
    setDoor(23, 12, false); // supply shed shutters again (still non-critical)
    map.triggers.push({
      type: "sign",
      x: 22,
      y: 12,
      lines: ["Supply Shed", "Shut tight. A note: Back when the runner returns."]
    });
  }


  // Fishing Village consequence: comfort elsewhere slows home momentum.
  // Visible cue only (no hard lock, no moral framing).
  if (state?.flags?.ironwood_villageComplacency) {
    setDoor(23, 18, false); // inn shutters again (non-critical)
    map.triggers.push({
      type: "sign",
      x: 22,
      y: 18,
      lines: ["Inn", "Closed. A note: No rooms held for wanderers."]
    });
  }
  // Ursa Bluffs consequence: endurance abroad reads as competence at home (subtle, no reward splash).
  if (state?.flags?.ironwood_bluffEndurance) {
    // A scout appears near the north exit, and a small note is posted.
    map.npcs.push({
      id: "ironwood_scout",
      x: 14,
      y: 2,
      dialogue() {
        return [
          "You came back with dust in your teeth. Folks notice that.",
          "North trail’s watched now. Not safer—just watched."
        ];
      }
    });

    map.triggers.push({
      type: "sign",
      x: 14,
      y: 3,
      lines: ["Notice", "Scouts posted north. No promises. Just eyes on the road."]
    });
  }



  // --- NPC density + dialogue shifts (no explicit progress messaging) ---
  // Keep existing npcs, then add staged ambience npcs in the town exterior only.
  if (map.id === "ironwood_town") {
    const extra = [];

    if (stage >= 1) {
      // Returning laborers / helpers
      extra.push({
        id: "laborer_1",
        x: 11,
        y: 10,
        spriteIndex: 1,
        dialogue() {
          return stage >= 2
            ? [
                "You hear that? Hammers again. About time.",
                "If you’ve got a minute, check the board. Folks are asking for hands."
              ]
            : [
                "Quarry went quiet, they say.",
                "Quiet don’t mean safe, but it means we can breathe."
              ];
        }
      });

      extra.push({
        id: "laborer_2",
        x: 13,
        y: 14,
        spriteIndex: 1,
        dialogue() {
          return [
            "Shed’s got bandages and nails when it’s open.",
            "Take what you need. Leave what you can."
          ];
        }
      });
    }

    if (stage >= 2) {
      // Travelers + guards + civic tension
      extra.push({
        id: "guard_1",
        x: 9,
        y: 6,
        spriteIndex: 0,
        dialogue() {
          return [
            "Town Hall’s back open. Keep it civil inside.",
            "No shouting, no fists. We’re done bleeding in the street."
          ];
        }
      });

      extra.push({
        id: "traveler_1",
        x: 18,
        y: 16,
        spriteIndex: 1,
        dialogue() {
          return [
            "Didn’t expect to see Ironwood lit again.",
            "Roads feel different when a town remembers itself."
          ];
        }
      });

      extra.push({
        id: "merchant_1",
        x: 7,
        y: 14,
        spriteIndex: 1,
        dialogue() {
          return [
            "Store’s taking stock again. Slow, but honest.",
            "If you need cord, powder, or clean water… ask polite."
          ];
        }
      });
    }

    // Deduplicate by id (in case content changes)
    const seen = new Set(map.npcs.map(n => n.id));
    for (const n of extra) {
      if (!seen.has(n.id)) map.npcs.push(n);
    }
  }

  // --- Ambient sign text changes (discoverable, not a progress UI) ---
  if (map.triggers && map.triggers.length) {
    for (const t of map.triggers) {
      if (t.type === "sign" && t.x === 7 && t.y === 7) {
        t.lines = stage >= 2
          ? [
              "Town Hall – doors open. Voices inside.",
              "A notice is nailed fresh: “Routes. Supplies. Names.”"
            ]
          : [
              "Town Hall – once busy, now quiet.",
              "The Elder keeps the ledgers by lamplight, waiting for better days."
            ];
      }
    }
  }

  return map;
}
