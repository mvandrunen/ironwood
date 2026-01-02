// src/data/regions/region2.js
import { getReturnPressureTier } from "../../systems/return_pressure.js";
import { getBossIntro, getBossOutro } from "../boss_dialogue.js";
// Region 2: Frontier chain (Junction → Ursa → River Road → Fishing / Mach → Highlands → Pass)
//
// Drop-in notes:
// - This file exports `region2Maps` as an object keyed by map id.
// - Includes a safe `createFilled()` (no shared row references).
// - To avoid id-mismatch bugs, River Road is provided as BOTH `river_road` and `river_road_north`
//   (same map object). Exits can target either name safely.

function createFilled(w, h, baseValue = 0, fn = null) {
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => baseValue));

  if (typeof fn === "function") {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = fn(x, y);
        if (v !== undefined && v !== null) grid[y][x] = v;
      }
    }
  }

  return grid;
}

// Helper for a simple bordered room with optional “gates” (exits) carved into the border.
// `exitTile` lets individual maps decide whether exit coordinates should paint a visible path tile.
// For towns where all walkable space should remain grass, set exitTile=0
// and rely on the exit-pad overlay renderer for a consistent entry/exit look.
function borderedRoom({ w, h, exits = [], extra = null, exitTile = 2 }) {
  return createFilled(w, h, 0, (x, y) => {
    // carve exits on the border (tile value depends on map style)
    for (const e of exits) {
      if (e.x === x && e.y === y) return exitTile;
    }



// v1.14.1: exit readability (routes/non-town): add a small inward funnel and a nearby marker.
// Only apply when the map is using the route-style exit tile (2). Town hubs often use exitTile=0.
if (exitTile === 2) {
  for (const e of exits) {
    const isExit = (e.x === x && e.y === y);
    // Determine which side the exit sits on (or closest side, if author placed it inset).
    const side =
      (e.y === 0) ? "north" :
      (e.y === h - 1) ? "south" :
      (e.x === 0) ? "west" :
      (e.x === w - 1) ? "east" :
      null;

    // Inward vector (default to "south" if inset/unknown so we still highlight).
    const dx = (side === "west") ? 1 : (side === "east") ? -1 : 0;
    const dy = (side === "north") ? 1 : (side === "south") ? -1 : 0;

    const inner1 = { x: e.x + dx, y: e.y + dy };
    const inner2 = { x: e.x + dx * 2, y: e.y + dy * 2 };

    // Perpendicular (for a sign/marker) — choose a stable direction per side.
    const px = (side === "north" || side === "south") ? 1 : 0;
    const py = (side === "east" || side === "west") ? 1 : 0;
    const sign = { x: inner1.x + px, y: inner1.y + py };

    const inBounds = (p) => p.x > 0 && p.y > 0 && p.x < w - 1 && p.y < h - 1;

    // Funnel tiles (inner trail) — do not overwrite authored `extra()` tiles.
    if (inBounds(inner1) && x === inner1.x && y === inner1.y) return 2;
    if (inBounds(inner2) && x === inner2.x && y === inner2.y) return 2;

    // Marker tile (3) — only if the map's `extra()` doesn't already override it.
    if (inBounds(sign) && x === sign.x && y === sign.y) return 3;
  }
}

    // default border walls
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return 1;


    if (typeof extra === "function") {
      const v = extra(x, y);
      if (v !== undefined && v !== null) return v;
    }

    return 0;
  });
}

// =====================
// MAPS
// =====================

const ironwood_junction = {
  id: "ironwood_junction",
  label: "Ironwood Junction",
  worldNodeId: "ironwood_junction",
  biome: "forest",
    buildingTileset: "wood_dark",
  width: 22,
  height: 18,
  spawnX: 11,
  spawnY: 2,

  // 0=floor, 1=wall, 2=exit, 3=sign
  tiles: borderedRoom({
    w: 22,
    h: 18,
    exitTile: 0,
    exits: [
      { x: 11, y: 1 },   // north -> forest_camp_south
      { x: 20, y: 8 },   // east -> river_road
      { x: 11, y: 16 }   // south -> mach_ranch
    ],
    extra: (x, y) => {      // Pokémon-like town grounding:
      // - default interior is grass (0)
      // - do not paint broad path fields; walkable space stays grass
      // - buildings are solid rectangles (tile ids 4+)
      // (exits are rendered via the exit-pad overlay, so underlying tiles remain grass)

      // v1.14.0: Phase 1 readability landmarks (signposts + a simple town center anchor)
      // Place signposts near each exit and a small civic marker near center.
      if ((x === 12 && y === 2) || (x === 19 && y === 8) || (x === 12 && y === 15) || (x === 10 && y === 8)) return 3;


      // v1.16.0: Junction flow grammar normalization (clear spine + forks)
      // Main vertical spine
      if (x === 11 && y >= 1 && y <= 16) return 2;
      // Main horizontal fork
      if (y === 8 && x >= 1 && x <= 20) return 2;
      // 3-wide aprons at exits
      if ((y === 2 && x >= 10 && x <= 12) || (y === 14 && x >= 10 && x <= 12)) return 2;
      if ((x === 2 && y >= 7 && y <= 9) || (x === 19 && y >= 7 && y <= 9)) return 2;

      // Light “rail line” obstacle suggestion (kept tight so it does not dominate the town).
      // Make it read as *unwalkable* (hedge wall), with a single obvious crossing.
      if ((y === 9 || y === 10) && x >= 6 && x <= 16) {
        // Crossing gaps (main spine + depot doorway)
        if (x === 11 || x === 6) return 0;
        return 21; // hedge wall (clear non-walkable)
      }

      // sign tiles (purely visual; triggers handle interaction)
      if (x === 3 && y === 4) return 3;
      if (x === 5 && y === 10) return 3;

      // v1.16.1: Fenced depot plot (authoring punctuation)
      // Plot border (x 2..10, y 3..9), opening at (6,9) toward the main spine
      if (x === 2 && y === 3) return 24;
      if (x === 10 && y === 3) return 26;
      if (x === 2 && y === 9) return 28;
      if (x === 10 && y === 9) return 29;
      if (y === 3 && x >= 3 && x <= 9) return 25;
      if (y === 9 && x >= 3 && x <= 9 && x !== 6) return 25;
      if (x === 2 && y >= 4 && y <= 8) return 27;
      if (x === 10 && y >= 4 && y <= 8) return 27;

      // rail depot exterior (rectangular, Pokémon-like silhouette)
      // footprint: x 3..9, y 4..8
      if (x >= 3 && x <= 9 && y >= 4 && y <= 8) {
        if (y === 4) return 9; // roof
        if (y === 5) {
          if (x === 6) return 7; // window
          return 5; // wall
        }
        // Doorway on the south face (reachable because we carved a rail crossing at x=6)
        if (x === 6 && y === 8) return 0;
        return 5;
      }

      // small landmark post near the crossing to support wayfinding
      if (x === 11 && y === 8) return 3;


      // Left-side train tracks: 2-tile wide rail spine that reads clearly from top to bottom.
      // Tile ids 510/511 are authored as rail halves inside the forest tileset.
      if (y >= 1 && y <= 16 && (x === 1 || x === 2)) {
        return x === 1 ? 510 : 511;
      }

      return null;
        }
  }),

  npcs: [
    {
      id: "railman",
      x: 12,
      y: 6,

      onInteract(state, game) {
        if (state.quest?.progress?.q2_crossroads?.started) {
          game.setObjectiveDone("q2_crossroads", "speak_railman");
        }
      },
      dialogue(state) {
        if (state?.flags?.ursaCleared) {
          return [
            "Rails are breathing again. That canyon choke is open.",
            "If you head back north, folks will want to hear it from you."
          ];
        }
        if (state?.flags?.quarryCleared) {
          return [
            "Word travels fast when it’s good news. Quarry’s quiet, folks say.",
            "That buys Ironwood time. Doesn’t buy you an easy road.",
            "East takes you to River Road. Southeast puts you in the bluffs.",
            "Pick your line and stick to it. The valley punishes hesitation."
          ];
        }
        return [
          "Junction used to hum. Now it just waits.",
          "Bandits have been testing the roads south, like they own the dust.",
          "If you go toward Ursa Bluffs, go ready."
        ];
	      }
	    }
	  ],

  enemies: [],

  exits: [
    // North back to Lower Forest Camp (Region 1)
    { x: 11, y: 1, to: "route_ironwood_junction_to_lower_forest_camp", spawnX: 11, spawnY: 16 },

    // Depot interior
    { x: 6, y: 8, to: "ironwood_junction_depot", spawnX: 8, spawnY: 10 },

    // Southeast to river road
    { x: 20, y: 14, to: "route_ironwood_junction_to_river_road", spawnX: 1, spawnY: 9,
      gate: {
        requires: [
          { type: "flag", id: "chapter1_5_fishingVillageComplete" }
        ],
        blockedMessage: "The bluffs can wait. The river folk were expecting you first."
      },
      onTraverse(state, game) {
        if (state.quest?.progress?.q2_crossroads?.started) {
          game.setObjectiveDone("q2_crossroads", "choose_route");
        }
      }
    },

    // East to Mach Ranch (Checkpoint 2 gate)
    { x: 20, y: 8, to: "route_ironwood_junction_to_mach_ranch", spawnX: 1, spawnY: 9,
      gate: {
        requires: [
          { type: "questObjective", questId: "q1_quarry_rescue", objectiveId: "report_back" },
          { type: "flag", id: "checkpoint2_ursaBossDefeated" }
        ],
        blockedMessage: "Not yet. The canyon road isn’t yours until the bluffs stop hunting men."
      },
      onTraverse(state, game) {
        if (state.quest?.progress?.q2_crossroads?.started) {
          game.setObjectiveDone("q2_crossroads", "choose_route");
        }
      }
    },

    // (Removed stray unreachable depot exit at y=7)
],

  items: [],

  triggers: [
    {
      type: "sign",
      x: 3,
      y: 4,
      lines: ["IRONWOOD JUNCTION", "South: Ursa Bluffs   North: Ironwood"]
    }
  ]
};

const ursa_bluffs = {
  id: "ursa_bluffs",
  label: "Ursa Bluffs",
  worldNodeId: "ursa_bluffs",
  biome: "canyon",
    buildingTileset: "wood_dark",
  width: 22,
  height: 18,
  spawnX: 11,
  spawnY: 2,

  tiles: borderedRoom({
    w: 22,
    h: 18,
    exits: [
      { x: 1, y: 9 },    // west -> ironwood_junction
      { x: 20, y: 15 },  // east -> river_road(_north)
      { x: 20, y: 4 },   // cliff drop (rope)
      { x: 20, y: 6 }    // marked cut (waystone)
    ],
    exitTile: 0,
    extra: (x, y) => {
      // Readability pass: make the trail continuous (no 'floating' path fragments).
      // - Connect spawn (top) down to the main shelf.
      // - Single clear run from west exit to east exit.
      const onTrail =
        (x === 11 && y >= 2 && y <= 9) ||          // spawn drop
        (y === 9 && x >= 1 && x <= 12) ||          // main shelf from west
        (x === 12 && y >= 9 && y <= 15) ||         // turn down toward the east line
        (y === 15 && x >= 12 && x <= 20);          // finish to the east exit

      if (onTrail) return 2;

      // Endurance pass: ridge lines / shelves
      if (y === 4 && x >= 2 && x <= 14) return 1;
      if (y === 9 && x >= 7 && x <= 19) return 1;
      if (y === 13 && x >= 3 && x <= 18) return 1;

      if (x === 8 && y >= 2 && y <= 8) return 1;
      if (x === 14 && y >= 8 && y <= 16) return 1;

      // Carve obvious trail gaps through ridge lines (do NOT block exits)
      if (y === 4 && x >= 6 && x <= 9) return 0;
      if (y === 9 && x >= 12 && x <= 14) return 0;
      if (y === 13 && x >= 15 && x <= 16) return 0;

      // Windbreak node (left): small shelter pocket
      if ((x === 4 || x === 6) && y >= 6 && y <= 8) return 1;
      if ((y === 6 || y === 8) && x >= 4 && x <= 6) return 1;
      if (x === 5 && y === 7) return 3;

      // Dry shelf node (right): shelter pocket near completion
      if ((x === 17 || x === 19) && y >= 12 && y <= 14) return 1;
      if ((y === 12 || y === 14) && x >= 17 && x <= 19) return 1;
      if (x === 18 && y === 13) return 3;

      // Landmark the ridge gaps (helps players read 'this is the way through')
      if ((x === 7 && y === 4) || (x === 13 && y === 9) || (x === 15 && y === 13)) return 3;

      // Extra roughness: broken lip near the bottom forces committed movement
      if (y === 16 && x >= 3 && x <= 12) return 1;

      return null;
    }
  }),

  npcs: [
    {
      id: "bluff_trapper",
      x: 6,
      y: 4,
      onInteract(state) {
        state.flags.chapter1_5_ursaBluffsComplete = true;
        if (state.flags.chapter1_5_riverRoadComplete && state.flags.chapter1_5_fishingVillageComplete) {
          state.flags.chapter1_5_machRanchUnlocked = true;
        }
      },
      dialogue(state) {
        if (!state.flags.chapter1_5_ursaBluffsComplete) {
          return [
            "Wind cuts clean up here. Takes the softness out of you.",
            "Ranch men keep their gates shut unless they know you’ve walked the hard way.",
            "If you’ve done river and village proper, you can try Mach Ranch next.",
          ];
        }
        return [
          "You’ve seen enough stone and water to know what comfort costs.",
          "Mach Ranch is east from River Road. Their steward listens, if you’ve earned it.",
        ];
      }
    },
    
    {
      id: "bluff_scout",
      x: 12,
      y: 6,
      onInteract(state, game) {
        // Talking is enough to complete the "endurance" beat, but post-completion you can earn a shortcut.
        state.flags = state.flags || {};
        state.flags.ursa_spokeToScout = true;

        if (state.flags.chapter1_5_ursaBluffsComplete) {
          if (game && typeof game._grantItemOnce === "function") {
            game._grantItemOnce({
              id: "bluff_waystone",
              name: "Bluff Waystone",
              description: "A flat stone marked with a simple cut. It’s not a talisman—just a sign that someone mapped the safe line.",
              kind: "key",
              amount: 1,
            });
            if (!state.flags._msgGotBluffWaystone) {
              state.flags._msgGotBluffWaystone = true;
              state.message = "Received: Bluff Waystone";
            }
          }
        }
      },
      dialogue(state) {
        const f = state?.flags || {};
        if (!f.chapter1_5_ursaBluffsComplete) {
          return [
            "Stay low when you can. High rock makes you honest—every step shows.",
            "If you’re going east, don’t chase the easy ground. It breaks under you.",
            "There’s a dry shelf ahead. Touch it, then keep moving."
          ];
        }
        return [
          "You made it through without looking for help.",
          "River Road runs east. Mach Ranch sits off it—if they decide you’re worth the gate."
        ];
      }
    },
{
          id: "bench_sitter",
          x: 13,
          y: 9,
          dialogue(state) {
            const tier = getReturnPressureTier(state);
            const lingered = !!state.flags.rr_lingered;
    
            if (lingered) {
              return [
                "You keep passing by like you’re waiting on permission.",
                "A man can rest anywhere. A home only waits so long."
              ];
            }
    
            if (tier === "high") {
              return [
                "River’s calm today. Makes trouble feel far away.",
                "That’s how towns die—quietly, while folks breathe easy."
              ];
            }
    
            if (tier === "mid") {
              return [
                "Good road. No one asking questions.",
                "Best kind of place to lose a week."
              ];
            }
    
            return [
              "You look like you’ve earned a quiet mile.",
              "Don’t mistake it for safety."
            ];
          }
        }
  ],
  enemies: [],

  exits: [
    { x: 20, y: 15, to: "route_ursa_bluffs_to_fishing_village", spawnX: 1, spawnY: 9 },

    // Rope drop: faster return line down to ironwood junction (earned in the village).
    { x: 2, y: 4, to: "route_ursa_bluffs_to_ironwood_junction", spawnX: 11, spawnY: 16,
      gate: {
        requires: [ { type: "item", id: "rope_coil" } ],
        blockedMessage: "It’s a long drop. Without rope, you’d break yourself."
      }
    }

  ],

  items: [],

  triggers: [
    // Safe nodes (diegetic, no UI)
    {
      type: "sign",
      x: 5,
      y: 7,
      lines: ["Windbreak", "A low ring of stone. Enough to stand out of the worst of it."]
    },
    {
      type: "sign",
      x: 18,
      y: 13,
      lines: ["Dry Shelf", "Cold air. Dry ground. You can breathe here, but you can’t live here."]
    },

    // Completion: reaching the far shelf marks endurance (no triumph beat).
    {
      type: "area",
      x: 17,
      y: 12,
      w: 3,
      h: 3,
      // Completion is checkpoint-based; do not consume the trigger unless the boss is down.
      once: false,
      run(state) {
        state.flags = state.flags || {};
        if (!state.flags.checkpoint2_ursaBossDefeated) return;
        state.flags.chapter1_5_ursaBluffsComplete = true;
        state.flags.ironwood_bluffEndurance = true; // subtle Ironwood tone/access cue

        // Derived unlock convenience
        if (state.flags.chapter1_5_riverRoadComplete && state.flags.chapter1_5_fishingVillageComplete) {
          state.flags.chapter1_5_machRanchUnlocked = true;
        }

        // Legacy / dev flag retained
        state.flags.ursaCleared = true;
      }
    }
]
  ,
  triggers: [
    {
      id: "boss_intro_bluff_warden",
      type: "area",
      x: 0,
      y: 0,
      w: 22,
      h: 18,
      once: false,
      run: (s, game) => {
        if (!s || !s.flags) return;
        const bossId = "bluff_warden";
        const introKey = `bossIntro_${bossId}`;
        const outroKey = `bossOutro_${bossId}`;

        const enemies = game._getEnemiesForCurrentMap();
        const bossAlive = enemies.some(e => e && !e.dead && e.archetypeId === bossId);

        if (bossAlive && !s.flags[introKey] && !s.dialogue.isActive()) {
          s.flags[introKey] = true;
          s.dialogue.startDialogue(getBossIntro(bossId));
          return;
        }

        const bossDefeated = !!s.flags.checkpoint2_ursaBossDefeated && !bossAlive;
        if (bossDefeated && !s.flags[outroKey] && !s.dialogue.isActive()) {
          s.flags[outroKey] = true;
          s.dialogue.startDialogue(getBossOutro(bossId));
        }
      }
    }
  ]
};

// River Road (provided under two ids to prevent wiring mismatches)
const river_road_north = {
  id: "river_road_north",
  label: "River Road",
  worldNodeId: "river_road",
  biome: "coast",
    buildingTileset: "wood_dark",
  width: 22,
  height: 18,
  spawnX: 1,
  spawnY: 12,

  tiles: borderedRoom({
    w: 22,
    h: 18,
    exits: [
      { x: 1, y: 12 },    // west -> junction
      { x: 20, y: 12 }   // east -> fishing_village
    ],
    exitTile: 0,
    extra: (x, y) => {
      // Authoritative lane paint only (avoid any accidental "second exit" reads).
      // Paint exit pads explicitly so borderedRoom() does not create additional path fragments.
      if ((x === 1 && y === 12) || (x === 20 && y === 12)) return 2;

      // Readability pass: explicit road lane + clear spur to the southern exit.
      // Single clear lane (no apparent branching exits)
      const road = (y === 12 && x >= 2 && x <= 19);
      // Simple approach from the west spawn to the road
      const approach = (x === 2 && y >= 10 && y <= 12);
      if (road || approach) return 2;

      // river “edge” suggestion (walls), with a single obvious bridge at y=12.
      if (x === 12 && y >= 2 && y <= 15) {
        if (y === 12) return 0; // crossing is the road itself
        return 1;
      }

      // bridge marker
      if (x === 12 && y === 11) return 3;

      return null;
        }
  }),

  npcs: [
    {
      id: "river_scout",
      x: 4,
      y: 4,
      onInteract(state, game) {
        state.flags = state.flags || {};
        state.flags.chapter1_5_riverRoadComplete = true;

        // Small proof-of-passage: enables a quiet shortcut later (no power spike).
        if (game && typeof game._grantItemOnce === "function") {
          game._grantItemOnce({
            id: "rail_pass_stub",
            name: "Rail Pass Stub",
            description: "A torn transit stub with a depot stamp. Enough to convince a boatman you aren’t drifting.",
            kind: "key",
            amount: 1,
          });
          if (!state.flags._msgGotRailPassStub) {
            state.flags._msgGotRailPassStub = true;
            state.message = "Received: Rail Pass Stub";
          }
        }

        // Derived unlock convenience
        if (state.flags.chapter1_5_fishingVillageComplete && state.flags.chapter1_5_ursaBluffsComplete) {
          state.flags.chapter1_5_machRanchUnlocked = true;
        }
      },
            dialogue(state) {
              const tier = getReturnPressureTier(state);
              const lingered = !!state.flags.rr_lingered;
              const away = state?.returnPressure?.stepsAwayFromIronwood || 0;
      
              if (!state.flags.chapter1_5_riverRoadComplete) {
                if (tier === "high" || away >= 12) {
                  return [
                    "You look like a man who’s been gone too long.",
                    "River Road’s easy on the lungs. Easy on the conscience, too.",
                    "Walk it clean. Don’t let the calm talk you into staying put."
                  ];
                }
                return [
                  "You’re headed the right way—river air makes men forget obligations.",
                  "Stay on the road. The fishers east of here will talk, if you listen."
                ];
              }
      
              if (lingered) {
                return [
                  "You’ve worn the dust thin on this stretch.",
                  "If Ironwood’s yours, go see it with your own eyes."
                ];
              }
      
              if (tier === "mid") {
                return [
                  "Comfort’s a fine thing—until it dulls you.",
                  "Fishing Village is east. Keep your feet moving."
                ];
              }
              if (tier === "high") {
                return [
                  "You’ve got Ironwood on your back, whether you admit it or not.",
                  "Don’t trade duty for a quiet road."
                ];
              }
	              return [
	                "Fishing Village is east. Road stays kind if you don’t abuse it."
	              ];
	            }
	      }
	  ],
  enemies: [],

  exits: [
    // Return to Junction (this is your requested wiring)
    { x: 1, y: 12, to: "route_river_road_to_ironwood_junction", spawnX: 20, spawnY: 9 },


    // East/Southeast to Fishing Village
    { x: 20, y: 12, to: "route_river_road_to_fishing_village", spawnX: 1, spawnY: 10,
      gate: {
        requires: [ { type: "flag", id: "chapter1_5_riverRoadComplete" } ],
        blockedMessage: "Easy living’s east—but earn the road first. Find the scout."
      }
    }
  ],

  items: [],
  triggers: [
    {
      type: "sign",
      x: 9,
      y: 3,
      lines: ["River Road", "Easy miles. Easy forgetting."]
    },
    {
      type: "sign",
      x: 5,
      y: 10,
      lines: ["Old Post", "The ink is washed. It points nowhere."]
    },
    {
      type: "sign",
      x: 6,
      y: 12,
      lines: ["East", "Fishing Village — quiet work, steady meals."]
    }
  ]
};

 // Alias object so exits can safely use `river_road` too.
const river_road = { ...river_road_north, id: "river_road" };


const fishing_village = {
  id: "fishing_village",
  label: "Fishing Village",
  worldNodeId: "fishing_village",
  biome: "coast",
    buildingTileset: "wood_dark",
  width: 22,
  height: 18,
  spawnX: 1,
  spawnY: 10,

  tiles: borderedRoom({
    w: 22,
    h: 18,
    exits: [ { x: 1, y: 10 }, { x: 21, y: 16 } ],
    exitTile: 0,
    extra: (x, y) => {
      // Readability pass: preserve the 'safe, easy to stay' feel while clarifying lanes.
      const westToSquare = (y === 10 && x >= 1 && x <= 12);
      const squareToHead = (x === 12 && y >= 6 && y <= 10);
      const squareToExit = (x === 12 && y >= 10 && y <= 16) || (y === 16 && x >= 12 && x <= 21);

      if (westToSquare || squareToHead || squareToExit) return 2;

      // Settlement blockout (walls), with deliberate openings aligned to the main lane.
      if (x >= 3 && x <= 18 && (y === 6 || y === 12)) {
        // openings at the 'street' column and a secondary alley
        if (x === 12 || x === 7) return 0;
        return 1;
      }

      // market awning / shed (rectangular; solid)
      // footprint: x 13..18, y 3..6
      if (x >= 13 && x <= 18 && y >= 3 && y <= 6) {
        if (y === 3) return 4; // roof
        if (y === 4) {
          if (x === 15 || x === 16) return 7; // windows
          return 5;
        }
        return 5; // solid walls/bottom
      }

      // small hut (rectangular; solid)
      // footprint: x 5..10, y 2..5
      if (x >= 5 && x <= 10 && y >= 2 && y <= 5) {
        if (y === 2) return 4; // roof
        if (y === 3) {
          if (x === 7 || x === 9) return 7; // windows
          return 5;
        }
        return 5;
      }

      // notice post + extra 'pier marker' to anchor direction
      if (x === 12 && y === 9) return 3;
      if (x === 16 && y === 15) return 3;


      // Waterline + dock (coast biome)
      // Use direct biome indices so water reads clearly: 1000+3 corresponds to the water tile in tileset_coast.
      const inWater = (x >= 10 && y >= 9) || (x >= 15 && y >= 6);
      if (inWater) return 1000 + 3;

      // Small dock platform leading toward the canoe/exit to Ursa Bluffs
      // Use direct building indices (2000+) so we can use plank tiles from wood_dark.
      const onDock = (x >= 16 && x <= 21 && y >= 12 && y <= 16);
      if (onDock) return 2000 + 0;

      // Dock approach lane
      if (y === 12 && x >= 12 && x <= 21) return 2;

      // Exit marker (makes the Ursa Bluffs route obvious)
      if (x === 21 && y === 16) return 3;

      return null;
        }
  }),

  npcs: [
    // 1) The welcoming anchor (offers work + belonging)
    {
      id: "village_head",
      x: 11,
      y: 8,
      spriteIndex: 2,
      onInteract(state, game) {
        state.flags = state.flags || {};
        // "Temptation" beat becomes true once the player has accepted (or finished) the simple work handoff.
        if (!state.flags.fv_contractAccepted) {
          state.flags.fv_contractAccepted = true;
        } else if (state.flags.fv_netsFixed && !state.flags.fv_contractDone) {
          state.flags.fv_contractDone = true;
          state.flags.fv_temptationBeat = true;
          state.flags.chapter1_5_fishingVillageComplete = true;

          // Small, grounded reward (no currency system needed)
          state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
          state.inventory.push({
            id: "salted_fish",
            name: "Salted Fish",
            description: "Wrapped in paper. Keeps a while. Smells like home you didn’t go to.",
            kind: "consumable",
            amount: 1,
          });

          // Convenience: if the rest of Chapter 1.5 is done, unlock Mach Ranch.
          if (state.flags.chapter1_5_riverRoadComplete && state.flags.chapter1_5_ursaBluffsComplete) {
            state.flags.chapter1_5_machRanchUnlocked = true;
          }
        }
      },
      dialogue(state) {
        const f = state?.flags || {};
        const tier = getReturnPressureTier(state);

        if (!f.fv_contractAccepted) {
          return [
            "You look wore down. Sit. Eat if you’ve got the stomach for it.",
            "We don’t ask much here. A hand on a line, a hand on a net.",
            "If you want to feel useful without bleeding for it—help Lila mend the torn nets."
          ];
        }

        if (f.fv_contractAccepted && !f.fv_netsFixed) {
          return [
            "No rush here. That’s the trick of it.",
            "Lila’s by the hut. Torn net, simple stitch. You finish that, you’ve earned a plate."
          ];
        }

        if (f.fv_netsFixed && !f.fv_contractDone) {
          return [
            "You stitched it? Good. Come back and I’ll set you up proper for the road.",
            ...(tier === "mid" || tier === "high"
              ? ["Ironwood’s a long way behind you. Long enough to change without you."]
              : [])
          ];
        }

        // After temptation beat
        return [
          "There’s always a place for you here, if you decide the road can wait.",
          "But the bluffs don’t wait on weather. When you’re ready—follow the river back and take the west track.",
          ...(tier === "mid" || tier === "high"
            ? ["If you stay too long, home stops holding its breath."]
            : [])
        ];
      }
    },

    // 2) The simple work handoff (flag-based errand)
    {
      id: "net_mender",
      x: 8,
      y: 5,
      spriteIndex: 3,
      onInteract(state, game) {
        state.flags = state.flags || {};
        if (state.flags.fv_contractAccepted && !state.flags.fv_netsFixed) {
          state.flags.fv_netsFixed = true;

          // Practical tool, not a stat upgrade: unlocks a marked cliff shortcut in the bluffs.
          if (game && typeof game._grantItemOnce === "function") {
            game._grantItemOnce({
              id: "rope_coil",
              name: "Rope Coil",
              description: "Hemp rope, freshly re-spliced. Useful for one hard drop and a safer return.",
              kind: "tool",
              amount: 1,
            });
            if (!state.flags._msgGotRopeCoil) {
              state.flags._msgGotRopeCoil = true;
              state.message = "Received: Rope Coil";
            }
          }
        }
      },
      dialogue(state) {
        const f = state?.flags || {};
        if (!f.fv_contractAccepted) {
          return [
            "You’re passing through? Most are.",
            "If you’re staying, you’ll find work without anyone asking twice."
          ];
        }
        if (f.fv_contractAccepted && !f.fv_netsFixed) {
          return [
            "Tore it on driftwood. Happens every season.",
            "Hold the edge. There—tight stitch. You’ve done this before, haven’t you?"
          ];
        }
        return [
          "That’ll fish again.",
          "Don’t let the quiet fool you. Quiet’s how folks lose track of what they meant to do."
        ];
      }
    },

    // 3) A comfort NPC that explicitly encourages staying (no moral framing)
    {
      id: "dockhand",
      x: 9,
      y: 11,
      spriteIndex: 4,
      onInteract(state) {
        state.flags = state.flags || {};
        state.flags.fv_stayedOnce = true;
        // Mark the temptation beat if the player lingers here after taking work.
        if (state.flags.fv_contractAccepted) state.flags.fv_temptationBeat = true;
      },
      dialogue(state) {
        const tier = getReturnPressureTier(state);
        return [
          "You can sleep by the fire if the wind’s up. Nobody counts what you owe.",
          "Tomorrow’s the same as today, mostly. That’s why some don’t leave.",
          ...(tier === "mid" || tier === "high"
            ? ["Funny thing: the longer you rest, the harder it is to feel the pull of home."]
            : [])
        ];
      }
    }
  ],
  enemies: [],

  exits: [
    { x: 1, y: 10, to: "route_fishing_village_to_river_road", spawnX: 20, spawnY: 12 },

    // Quiet canoe cut back toward the Junction (earned via proof, not payment).
    { x: 21, y: 16, to: "route_fishing_village_to_ursa_bluffs", spawnX: 11, spawnY: 1,
      gate: {
        requires: [ { type: "item", id: "rail_pass_stub" } ],
        blockedMessage: "The canoe’s tied off. The dockhand won’t untie it for a drifter."
      }
    }
  ],

  items: [],
  triggers: [
    {
      type: "sign",
      x: 12,
      y: 9,
        spriteIndex: 1,
      lines: ["Notice Post", "Work’s honest. Meals are steady. Nobody asks where you’re heading."]
    }
  ]
};


const mach_ranch = {
  id: "mach_ranch",
  label: "Mach Ranch",
  worldNodeId: "mach_ranch",
  biome: "coast",
    buildingTileset: "wood_dark",
  width: 22,
  height: 18,
  spawnX: 1,
  spawnY: 8,

  tiles: borderedRoom({
    w: 22,
    h: 18,
    exits: [ { x: 1, y: 8 }, { x: 11, y: 1 } ],
    extra: (x, y) => {
      // Readability pass: preserve layout, but mark the intended approach to the yard and storehouse.
      const toFenceGap = (x === 12 && y >= 9 && y <= 10) || (y === 9 && x >= 8 && x <= 13);
      const toStorehouseDoor = (y === 9 && x >= 13 && x <= 19);

      if (toFenceGap || toStorehouseDoor) return 2;

      // East-side storehouse footprint (rectangular; solid, not enterable yet).
      // Building: x 16..20, y 6..12 (roof on y=6)
      const inStorehouse = (x >= 16 && x <= 20 && y >= 6 && y <= 12);
      if (inStorehouse) {
        if (y === 6) return 9; // roof
        if (y === 7 && x === 18) return 7; // window
        // Keep entire footprint solid for now; when we add an interior, we'll put the exit-pad at the door.
        return 5; // wall
      }

      // A thin fence line to make the place feel managed (non-maze; purely visual).
      if (x === 13 && y >= 4 && y <= 14) return 1;
      if (y === 4 && x >= 13 && x <= 20) return 1;

      // fence opening toward the yard (now visibly 'framed')
      if (x === 13 && y === 9) return 0;
      if ((x === 12 && y === 9) || (x === 14 && y === 9) || (x === 13 && y === 8)) return 3;

      // storehouse door marker (visual only)
      if (x === 19 && y === 8) return 3;

	      return null;
	    }
  }),

  npcs: [
    {
      id: "mach_steward",
      x: 6,
      y: 8,
        spriteIndex: 5,
      onInteract(state) {
        state.flags = state.flags || {};
        // Mark that the player has reached Mach Ranch (useful for subtle world reactivity).
        state.flags.chapter1_5_machRanchReached = true;
      },
      dialogue(state) {
        const f = state.flags || {};
        if (f.machRanchRestraintResolved) {
          if (f.machRanchRestraintRespected) {
            return [
              "You kept to the terms. That gets remembered here.",
              "If you need a paper trail, the storehouse ledger’s east. Door’s open."
            ];
          }
          return [
            "Mach Ranch runs on numbers and witnesses.",
            "You took extra. You’ll get no more of either from me."
          ];
        }

        return [
          "You’re on Mach land. Water’s clean. Feed’s stacked. Work’s steady.",
          "One rule: take what’s handed. Nothing more.",
          {
            type: "choice",
            prompt: "The steward sets down a plate and a canteen.",
            options: [
              {
                label: "Take the set portion.",
                onChoose: (s) => {
                  s.flags = s.flags || {};
                  s.flags.machRanchRestraintResolved = true;
                  s.flags.machRanchRestraintRespected = true;
                  s.flags.machRanchRestraintViolated = false;

                  // Subtle Ironwood lean: prosperity through trust, not extraction.
                  s.flags.ironwoodLeanProsperous = true;
                },
                after: [
                  "He nods once. No warmth. No threat. Just the ledger in his head turning."
                ]
              },
              {
                label: "Pocket extra from the table.",
                onChoose: (s) => {
                  s.flags = s.flags || {};
                  s.flags.machRanchRestraintResolved = true;
                  s.flags.machRanchRestraintRespected = false;
                  s.flags.machRanchRestraintViolated = true;

                  // Subtle Ironwood lean: tightened gates and watchfulness.
                  s.flags.ironwoodLeanFortified = true;
                },
                after: [
                  "He doesn’t raise his voice.",
                  "But the yard goes quiet in a way you can feel."
                ]
              }
            ]
          },
          "There’s a bunkhouse if you’re still welcome by nightfall."
        ];
      }
    },

    {
      id: "mach_worker",
      x: 5,
      y: 12,
        spriteIndex: 5,
      dialogue(state) {
        const f = state.flags || {};
        if (!f.machRanchRestraintResolved) {
          return [
            "Steward’s watching for the first wrong move.",
            "Out here, you don’t test what isn’t yours."
          ];
        }
        if (f.machRanchRestraintViolated) {
          return [
            "Don’t talk to me. I’ve got hours to log and a boss who counts.",
            "If you’re looking for favors, you picked the wrong day."
          ];
        }
        if (f.machRanchAccordReceived) {
          return [
            "Ledger’s signed. That’s the only kind of welcome that lasts."
          ];
        }
        return [
          "You kept your hands honest. That’s rare enough to mention.",
          "If you want proof of terms, there’s a ledger in the storehouse. East wall. Quiet door."
        ];
      }
    },

    {
      id: "mach_enforcer",
      x: 18,
      y: 9,
        spriteIndex: 6,
      dialogue(state) {
        const f = state.flags || {};
        if (!f.machRanchRestraintResolved) {
          return [
            "Talk to the steward first.",
            "Then decide what kind of trouble you are."
          ];
        }
        if (f.machRanchRestraintViolated) {
          return [
            "That door stays shut to you.",
            "Mach doesn’t pay out to people who take first."
          ];
        }
        return [
          "Door’s open. Keep it clean inside."
        ];
      }
    }
  ],

  enemies: [],

  exits: [
    { x: 1, y: 8, to: "route_mach_ranch_to_ironwood_junction", spawnX: 20, spawnY: 9 },

    // Progression north remains available; Mach is a test of restraint, not a hard gate.
    { x: 11, y: 1, to: "route_mach_ranch_to_highlands", spawnX: 11, spawnY: 16 },

    // Storehouse (access is the systemic consequence)
    {
      x: 19, y: 9, to: "mach_storehouse", spawnX: 2, spawnY: 6,
      gate: {
        requires: [ { type: "flag", id: "machRanchRestraintRespected" } ],
        blockedMessage: "A hand slides between you and the door. Not a shove. Just a boundary."
      }
    }
  ],

  items: [],
  triggers: []
};

const mach_storehouse = {
  id: "mach_storehouse",
  label: "Mach Ranch — Storehouse",
  worldNodeId: "mach_ranch",
  biome: "wood_dark",
    buildingTileset: "wood_dark",
  width: 10,
  height: 8,
  spawnX: 2,
  spawnY: 6,

  tiles: borderedRoom({
    w: 10,
    h: 8,
    exits: [
      { x: 1, y: 6 } // back to yard
    ],
    extra: (x, y) => {
      // Ledger table (visual)
      if (x === 6 && y === 3) return 1;
      return null;
    }
  }),

  npcs: [],
  enemies: [],

  exits: [
    { x: 1, y: 6, to: "mach_ranch", spawnX: 18, spawnY: 9 }
  ],

  items: [],

  triggers: [
    {
      type: "area",
      x: 6,
      y: 3,
        spriteIndex: 1,
      w: 1,
      h: 1,
      once: true,
      run(state, game) {
        state.flags = state.flags || {};
        if (state.flags.machRanchAccordReceived) return;

        state.flags.machRanchAccordReceived = true;

        // Lightweight inventory receipt (no new systems).
        if (!Array.isArray(state.inventory)) state.inventory = [];
        state.inventory.push({
          id: "mach_ranch_accord",
          name: "Ranch Accord",
          kind: "key",
          amount: 1,
          description: "A signed line in Mach Ranch’s ledger. Proof you kept to their terms.",
        });

        state.message = "You copied the terms into your satchel.";
      }
    }
  ]
};



const highlands = {
  id: "highlands",
  label: "Highlands",
  worldNodeId: "highlands",
  biome: "canyon",
    buildingTileset: "wood_dark",
  width: 22,
  height: 18,
  spawnX: 11,
  spawnY: 16,

  tiles: borderedRoom({
    w: 22,
    h: 18,
    exits: [ { x: 11, y: 16 }, { x: 11, y: 1 } ],
    extra: (x, y) => {
      // “ridge” walls
      if (y === 7 && x >= 2 && x <= 19) return 1;
      return null;
    }
  }),

  npcs: [],
  enemies: [],

  exits: [
    { x: 11, y: 16, to: "route_highlands_to_mach_ranch", spawnX: 11, spawnY: 1,
      gate: {
        requires: [
          { type: "flag", id: "chapter1_5_riverRoadComplete" },
          { type: "flag", id: "chapter1_5_fishingVillageComplete" },
          { type: "flag", id: "chapter1_5_ursaBluffsComplete" }
        ],
        blockedMessage: "You won’t reach Mach Ranch from up here until you’ve earned the lower routes."
      }
    },
    { x: 11, y: 1, to: "route_highlands_to_precipice_pass", spawnX: 11, spawnY: 16 }
  ],

  items: [],
  triggers: []
};

const precipice_pass = {
  id: "precipice_pass",
  label: "Precipice Pass",
  worldNodeId: "precipice_pass",
  biome: "canyon",
    buildingTileset: "wood_dark",
  width: 22,
  height: 18,
  spawnX: 11,
  spawnY: 16,

  tiles: borderedRoom({
    w: 22,
    h: 18,
    exits: [ { x: 11, y: 16 } ],
    extra: (x, y) => {
      // narrow pass “walls”
      if ((x === 7 || x === 14) && y >= 3 && y <= 14) return 1;
      return null;
    }
  }),

  npcs: [],
  enemies: [],

  exits: [{ x: 11, y: 16, to: "route_precipice_pass_to_highlands", spawnX: 11, spawnY: 1 }],

  items: [],
  triggers: [
    // Placeholder “pass cleared” trigger (ambush)
    {
      type: "area",
      x: 11,
      y: 6,
      w: 1,
      h: 1,
      // Pass clearance is checkpoint-based; do not consume the trigger unless the boss is down.
      once: false,
      run(state) {
        state.flags = state.flags || {};
        if (!state.flags.checkpoint3_precipiceBossDefeated) return;
        state.flags.passCleared = true;
      }
    }
  ]
};

// Export maps (object keyed by id)


// --- Interior: Rail Depot (Ironwood Junction) ---
const ironwood_junction_depot = {
  id: "ironwood_junction_depot",
  label: "Rail Depot",
  worldNodeId: "ironwood_junction",
  biome: "wood_dark",
    buildingTileset: "wood_dark",
  width: 16,
  height: 12,
  spawnX: 8,
  spawnY: 9,

  // 0=floor, 1=wall, 2=exit, 3=sign
  tiles: borderedRoom({
    w: 16,
    h: 12,
    exits: [{ x: 8, y: 11 }],
    extra: (x, y) => {
      // crates and benches (blockout)
      if (y === 4 && x >= 3 && x <= 12) return 1;
      if (x === 4 && y >= 6 && y <= 9) return 1;
      if (x === 11 && y >= 6 && y <= 9) return 1;
      return null;
    }
  }),

  npcs: [
    {
      id: "depot_buyer",
      x: 12,
      y: 6,
      spriteIndex: 2,
      dialogue(state) {
        const inv = Array.isArray(state.inventory) ? state.inventory : (state.inventory = []);

        const coinValue = (id) => {
          if (id === "small_coin") return 1;
          if (id === "coin_bundle") return 5;
          return 0;
        };

        const valueOfItem = (it) => {
          const id = it?.id;
          if (!id) return 0;
          if (coinValue(id) > 0) return 0; // never "sell" coins back

          // Explicit prices for early-game goods (grounded, modest economy).
          if (id === "field_tonic") return 2;
          if (id === "ammo_scrap") return 1;
          if (id === "rations") return 1;

          // Generic rule: trade in loot items (pelts, scrap, trinkets, etc.) at 1 coin.
          if (it?.kind === "loot") return 1;

          // Don't allow selling weapons/quest papers/keys by default.
          return 0;
        };

        const countCoins = () => inv.reduce((sum, it) => sum + coinValue(it?.id), 0);

        const sellAllTradeGoods = () => {
          let gained = 0;

          for (let i = inv.length - 1; i >= 0; i--) {
            const it = inv[i];
            const v = valueOfItem(it);
            if (v <= 0) continue;
            gained += v;
            inv.splice(i, 1);
          }

          if (gained <= 0) return 0;

          // Pay out: bundles first for readability, then singles.
          while (gained >= 5) {
            inv.push({ id: "coin_bundle", name: "Coin Bundle", kind: "loot" });
            gained -= 5;
          }
          while (gained > 0) {
            inv.push({ id: "small_coin", name: "Small Coin", kind: "loot" });
            gained -= 1;
          }

          return 1;
        };

        const coins = countCoins();

        return [
          "A man in a vest keeps a small ledger and a tin scale.",
          `"If it fits the scale, I can turn it into coin." (You have ${coins}.)`,
          {
            type: "choice",
            prompt: "What do you do?",
            options: [
              {
                label: "Sell trade goods",
                onChoose(st) {
                  const ok = sellAllTradeGoods();
                  if (!ok) { st.message = "You don't have anything he'd buy."; return; }
                  st.message = "Sold goods for coin.";
                },
                after: [
                  "He counts out coins without looking up.",
                  "\"Fair weight. Next.\""
                ]
              },
              {
                label: "What do you buy?",
                after: [
                  "\"Scrap, pelts, small finds. No letters. No heirlooms.\"",
                  "\"If it's meant to be kept, keep it.\""
                ]
              },
              {
                label: "Leave",
                after: [
                  "\"Rail runs when it runs.\""
                ]
              }
            ]
          }
        ];
      }
    }
  ],
  enemies: [],

  exits: [
    { x: 8, y: 11, to: "ironwood_junction", spawnX: 6, spawnY: 8 }
  ],

  items: [],
  triggers: []
};

export const region2Maps = {
  ironwood_junction,
  ironwood_junction_depot,
  ursa_bluffs,

  // both names map to the same layout to avoid wiring mismatches
  river_road_north,
  river_road,

  fishing_village,
  mach_ranch,
  mach_storehouse,
  highlands,
  precipice_pass
};

export default region2Maps;

// v1.14.2: Phase 1c — systematic walk-plane cleaning sweep
// Remove stray decor noise (tile=3) from primary traversal planes while preserving:
// - decor adjacent to blocked silhouettes
// - decor near exits (used as navigation anchors)
function __isBlockedTile(v) { return v === 1 || v >= 4; }
function __manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function __collectExitPoints(map) {
  const pts = [];
  if (map && Array.isArray(map.exits)) {
    for (const ex of map.exits) {
      if (ex && Number.isInteger(ex.x) && Number.isInteger(ex.y)) pts.push({ x: ex.x, y: ex.y });
    }
  }
  return pts;
}
function cleanWalkPlane(map) {
  if (!map || !Array.isArray(map.tiles) || map.tiles.length === 0) return;
  const h = map.tiles.length;
  const w = map.tiles[0].length || 0;
  const exits = __collectExitPoints(map);
  for (let y = 0; y < h; y++) {
    const row = map.tiles[y];
    for (let x = 0; x < w; x++) {
      if (row[x] !== 3) continue;
      // Preserve decor that reinforces silhouettes (adjacent to blocked tiles)
      const n = (y > 0) ? map.tiles[y-1][x] : 1;
      const s = (y < h-1) ? map.tiles[y+1][x] : 1;
      const wv = (x > 0) ? map.tiles[y][x-1] : 1;
      const e = (x < w-1) ? map.tiles[y][x+1] : 1;
      if (__isBlockedTile(n) || __isBlockedTile(s) || __isBlockedTile(wv) || __isBlockedTile(e)) continue;

      // Preserve decor near exits (navigation anchors)
      let nearExit = false;
      for (const ex of exits) {
        if (__manhattan({x,y}, ex) <= 2) { nearExit = true; break; }
      }
      if (nearExit) continue;

      // Otherwise: remove to clean traversal plane
      row[x] = 0;
    }
  }
}

// Apply sweep to all maps in this region definition.
for (const __k in region2Maps) {
  try { cleanWalkPlane(region2Maps[__k]); } catch (e) { /* no-op */ }
}