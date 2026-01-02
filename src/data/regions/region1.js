import { getBossIntro, getBossOutro } from "../boss_dialogue.js";

export const region1Maps = {
  ironwood_town: {
    id: "ironwood_town",
    label: "Ironwood Town",
    worldNodeId: "ironwood_town",
    biome: "forest",
    buildingTileset: "wood_light",
    width: 32,
    height: 24,
    spawnX: 6,
    spawnY: 9,
    // 0 = floor, 1 = wall, 2 = exit, 3 = sign
    tiles: createFilled(32, 24, 0, (x, y) => {
      // town walls border
      if (x === 0 || y === 0 || x === 31 || y === 23) return 1;
      // v1.12.7: entrance/exit readability markers (trail funnel + threshold)
      if ((x === 14 && y === 1) || (x === 15 && y === 1) || (x === 16 && y === 1) || (x === 15 && y === 2) || (x === 15 && y === 3) || (x === 14 && y === 2) || (x === 16 && y === 2)) return 2;
      if ((x === 6 && y === 22) || (x === 7 && y === 22) || (x === 8 && y === 22) || (x === 7 && y === 21) || (x === 7 && y === 20) || (x === 6 && y === 21) || (x === 8 && y === 21)) return 2;
      // v1.14.0: Phase 1 readability landmarks (signposts / notice board)
// These are non-blocking markers that make exits and town center obvious at a glance.
if ((x === 17 && y === 2) || (x === 9 && y === 21) || (x === 12 && y === 9)) return 3;

// simple buildings / obstacles
      // v1.9.8: buildings use dedicated forest building tiles (4+) for a Pokémon-like read
      // Tile ids (forest): 4=roof_caretaker, 5=wall, 6=doorframe, 7=window, 8=sign, 9=roof_store, 10=store_sign
      // Caretaker house (rectangular; door/exit at x=6,y=4)
      if (x >= 4 && x <= 9 && y >= 2 && y <= 4) {
        if (y === 2) return 4; // roof
        if (y === 3) {
          if (x === 5 || x === 8) return 7; // windows
          if (x === 4) return 8; // small sign/post
          return 5; // wall
        }
        // bottom row: keep door tile walkable; exit-pad overlay will render on exits
        if (x === 6 && y === 4) return 6; // doorframe (walkable)
        return 5;
      }
      // General Store (rectangular; door/exit at x=6,y=14)
      if (x >= 4 && x <= 9 && y >= 12 && y <= 14) {
        if (y === 12) return 9; // roof
        if (y === 13) {
          if (x === 4) return 10; // store sign
          if (x === 5 || x === 8) return 7; // windows
          return 5; // wall
        }
        // bottom row: door is walkable for the interior exit
        if (x === 6 && y === 14) return 6; // doorframe (walkable)
        return 5;
      }

      
      // Town Hall (rectangular; entrance at x=8,y=6)
      if (x >= 6 && x <= 11 && y >= 4 && y <= 7) {
        if (y === 4) return 4; // roof (reuse house roof)
        if (y === 5) {
          if (x === 7 || x === 10) return 7; // windows
          return 5; // wall
        }
        // entrance on south wall center (keep walkable for interior exit trigger)
        // IMPORTANT: The entrance must be on the bottom row of the footprint to be reachable.
        if (x === 8 && y === 7) return 6; // doorframe (walkable)
        return 5;
      }

      // Supply Shed (right side; door/exit at x=23,y=12)
      if (x >= 21 && x <= 26 && y >= 10 && y <= 12) {
        if (y === 10) return 4; // roof
        if (y === 11) {
          if (x === 22 || x === 25) return 7; // windows
          return 5; // wall
        }
        if (x === 23 && y === 12) return 6; // doorframe (walkable)
        return 5;
      }

      // Inn (right side; door/exit at x=23,y=18)
      if (x >= 21 && x <= 26 && y >= 16 && y <= 18) {
        if (y === 16) return 9; // roof variant
        if (y === 17) {
          if (x === 21) return 10; // sign plank
          if (x === 22 || x === 25) return 7; // windows
          return 5;
        }
        if (x === 23 && y === 18) return 6; // doorframe (walkable)
        return 5;
      }



      // v1.16.1: Fenced-lot town authoring (Pokémon-style plots)
      // Fence tiles (24-31) are authored in the building tileset and are SOLID by default (tile >= 4).
      // Caretaker lot border (x 3..10, y 1..5), opening at (6,5)
      if (x === 3 && y === 1) return 24;
      if (x === 10 && y === 1) return 26;
      if (x === 3 && y === 5) return 28;
      if (x === 10 && y === 5) return 29;
      if (y === 1 && x >= 4 && x <= 9) return 25;
      if (y === 5 && x >= 4 && x <= 9 && x !== 6) return 25;
      if (x === 3 && y >= 2 && y <= 4) return 27;
      if (x === 10 && y >= 2 && y <= 4) return 27;

      // General Store lot border (x 3..10, y 11..15), opening at (6,15)
      if (x === 3 && y === 11) return 24;
      if (x === 10 && y === 11) return 26;
      if (x === 3 && y === 15) return 28;
      if (x === 10 && y === 15) return 29;
      if (y === 11 && x >= 4 && x <= 9) return 25;
      if (y === 15 && x >= 4 && x <= 9 && x !== 6) return 25;
      if (x === 3 && y >= 10 && y <= 12) return 27;
      if (x === 10 && y >= 10 && y <= 12) return 27;

      // Town Hall lot border (x 5..12, y 3..8), opening at (8,8)
      if (x === 5 && y === 3) return 24;
      if (x === 12 && y === 3) return 26;
      if (x === 5 && y === 8) return 28;
      if (x === 12 && y === 8) return 29;
      if (y === 3 && x >= 6 && x <= 11) return 25;
      if (y === 8 && x >= 6 && x <= 11 && x !== 8) return 25;
      if (x === 5 && y >= 4 && y <= 7) return 27;
      if (x === 12 && y >= 4 && y <= 7) return 27;

      // Supply Shed lot border (x 20..27, y 9..13), opening at (23,13)
      if (x === 20 && y === 9) return 24;
      if (x === 27 && y === 9) return 26;
      if (x === 20 && y === 13) return 28;
      if (x === 27 && y === 13) return 29;
      if (y === 9 && x >= 21 && x <= 26) return 25;
      if (y === 13 && x >= 21 && x <= 26 && x !== 23) return 25;
      if (x === 20 && y >= 10 && y <= 12) return 27;
      if (x === 27 && y >= 10 && y <= 12) return 27;

      // Inn lot border (x 20..27, y 15..19), opening at (23,19)
      if (x === 20 && y === 15) return 24;
      if (x === 27 && y === 15) return 26;
      if (x === 20 && y === 19) return 28;
      if (x === 27 && y === 19) return 29;
      if (y === 15 && x >= 21 && x <= 26) return 25;
      if (y === 19 && x >= 21 && x <= 26 && x !== 23) return 25;
      if (x === 20 && y >= 16 && y <= 18) return 27;
      if (x === 27 && y >= 16 && y <= 18) return 27;

      // v1.16.0: Town path grammar normalization (Pokémon-style readability)
      // Main south-to-center spine
      if (x === 7 && y >= 9 && y <= 22) return 2;
      // North spur from the northern exit to town center
      if (x === 15 && y >= 1 && y <= 9) return 2;
      if (y === 9 && x >= 7 && x <= 15) return 2;

      // Store approach (3-wide apron)
      if (y === 12 && x >= 5 && x <= 9) return 2;
      if (y === 11 && x >= 6 && x <= 8) return 2;

      // Town Hall approach (3-wide apron)
      if (y === 7 && x >= 7 && x <= 9) return 2;
      if (y === 8 && x >= 6 && x <= 8) return 2;

      // Caretaker house approach
      if (y === 4 && x >= 6 && x <= 7) return 2;

      // Right-side house approach
      if (y === 18 && x >= 22 && x <= 24) return 2;
      if (y === 17 && x >= 21 && x <= 25) return 2;

// Town exits render via exit-pad overlay; keep walkable tiles as grass.
      if (y === 22 && x === 7) return 0;
      if (y === 1 && x === 15) return 0;

      return 0;
    }),
    npcs: [
      {
        id: "elder",
        x: 3,
        y: 6,
        spriteIndex: 0,

        onInteract(state, game) {
          // Start quest on first contact
          if (!state.quest?.progress?.q1_quarry_rescue?.started) {
            game.startQuest("q1_quarry_rescue");
          }
          game.setObjectiveDone("q1_quarry_rescue", "talk_caretaker");
          state.flags = state.flags || {};
          state.flags.chapter1_introStarted = true;

          // If quarry is cleared, reporting back completes the quest
          if (state.flags?.quarryCleared) {
            game.setObjectiveDone("q1_quarry_rescue", "report_back");
            state.flags.chapter1_reportedBack = true;

            // Narrative unlock: the Elder grants the Town Map after the Quarry is cleared.
            // This gates access to the world map ("M") behind earned trust / knowledge.
            if (!state.flags.hasTownMap) {
              state.flags.hasTownMap = true;
              try {
                // Use pickup ceremony: subtle SFX + toast.
                game._playPickupSfx({ id: "town_map", name: "Town Map", kind: "paper" });
              } catch (_) {}
              try { game._showToast("Received: Town Map"); } catch (_) {}
            }

            // Chain the next step of Chapter 1
            if (!state.quest?.progress?.q2_crossroads?.started) {
              game.startQuest("q2_crossroads");
            }
          }

          // Finale: after Deacon Vale is defeated, speaking to the Elder unlocks the end card.
          if (state.flags?.finalBossDefeated) {
            state.flags.endingEligible = true;
          }
        },
        dialogue(state, game) {
          const rp = state?.returnPressure || {};
          const impatience = (rp.trustErosion || 0) + (rp.comfortDecay || 0);

          if (state.flags.finalBossDefeated) {
            return [
              "It’s over. The pressure in the town’s air is gone.",
              "Vale’s men will scatter when they hear the truth.",
              "You didn’t win by luck. You won by returning.",
              "Go on. Rest. Ironwood will try again."
            ];
          }

          if (state.flags.quarryCleared) {
            // AFTER quarry boss
            return [
              "So it’s done. The stone is quiet again.",
              "Tell me straight—are the crews alive?",
              "Good. Then we can move. Shed opens. Names go back on the board.",
              "You did the work. Now take the word where it belongs."
            ];
          } else {
            // BEFORE quarry boss
            if (impatience >= 6) {
              return [
                "Ironwood can’t wait on you.",
                "Go to the quarry entrance. Speak to the Miner.",
                "If you mean to help, do it with your feet."
              ];
            }
            return [
              "Ironwood has seen kinder seasons.",
              "If you’ve got strength, take the quarry road.",
              "Find the Miner at the entrance. Hear what’s true."
            ];
          }
        }
      }
    ],
    exits: [
      { x: 15, y: 1, to: "route_ironwood_town_to_upper_forest_camp", spawnX: 11, spawnY: 16 },
      { x: 7, y: 22, to: "route_ironwood_town_to_lower_forest_camp", spawnX: 11, spawnY: 1 },

      // Interiors
      { x: 6, y: 4, to: "ironwood_caretaker_house", spawnX: 7, spawnY: 9 },
      // General Store entrance (doorframe tile is at y=14 after the v1.16.1 downward shift)
      { x: 6, y: 14, to: "ironwood_general_store", spawnX: 7, spawnY: 9 },
      { x: 8, y: 7, to: "ironwood_town_hall", spawnX: 7, spawnY: 9 },
      { x: 23, y: 12, to: "ironwood_supply_shed", spawnX: 7, spawnY: 9 },
      { x: 23, y: 18, to: "ironwood_inn", spawnX: 7, spawnY: 9 },
],
    items: [
      {
        id: "field_tonic",
        x: 11,
        y: 10,
        name: "Field Tonic",
        description: "Restores a bit of strength after a bad scrape.",
        kind: "healing",
        amount: 10
      }
    ],
    triggers: [
      {
        type: "sign",
        x: 7,
        y: 7,
        lines: [
          "Town Hall – once busy, now quiet.",
          "The Elder keeps the ledgers by lamplight, waiting for better days."
        ]
      },
      {
        type: "sign",
        x: 15,
        y: 2,
        lines: ["Trail Marker", "North: Forest Camp (North)"]
      },
      {
        type: "sign",
        x: 7,
        y: 21,
        lines: ["Trail Marker", "South: Forest Camp (South)"]
      },
      {
        id: "boss_intro_deacon_vale",
        type: "area",
        x: 0,
        y: 0,
        w: 32,
        h: 24,
        once: false,
        run: (s, game) => {
          if (!s || !s.flags) return;
          const bossId = "deacon_vale";
          const introKey = `bossIntro_${bossId}`;
          const outroKey = `bossOutro_${bossId}`;

          const enemies = game._getEnemiesForCurrentMap();
          const bossAlive = enemies.some(e => e && !e.dead && e.archetypeId === bossId);

          // Intro fires only once, only if Vale is present (late-game condition).
          if (bossAlive && !s.flags[introKey] && !s.dialogue.isActive()) {
            s.flags[introKey] = true;
            s.dialogue.startDialogue(getBossIntro(bossId));
            return;
          }

          // Outro after defeat (once).
          const bossDefeated = !!s.flags.finalBossDefeated && !bossAlive;
          if (bossDefeated && !s.flags[outroKey] && !s.dialogue.isActive()) {
            s.flags[outroKey] = true;
            s.dialogue.startDialogue(getBossOutro(bossId));
          }
        }
      }
    ]

  },

  upper_forest_camp: {
    id: "upper_forest_camp",
    label: "Forest Camp (North)",
    worldNodeId: "upper_forest_camp",
    biome: "forest",
    buildingTileset: "wood_dark",
    width: 18,
    height: 16,
    spawnX: 9,
    spawnY: 12,
    tiles: createFilled(18, 16, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 17 || y === 15) return 1;
      // v1.12.7: entrance/exit readability markers (trail funnel + threshold)
      if ((x === 8 && y === 14) || (x === 9 && y === 14) || (x === 10 && y === 14) || (x === 9 && y === 13) || (x === 9 && y === 12) || (x === 8 && y === 13) || (x === 10 && y === 13)) return 2;
      if ((x === 1 && y === 6) || (x === 1 && y === 7) || (x === 1 && y === 8) || (x === 2 && y === 7) || (x === 3 && y === 7) || (x === 2 && y === 6) || (x === 2 && y === 8)) return 2;
      // All walkable space is grass; exit-pad overlay handles entry/exit markers.
      return 0;
    }),
    npcs: [
      {
        id: "scout",
        x: 8,
        y: 11,
        spriteIndex: 5,

        onInteract(state, game) {
          if (state.quest?.progress?.q1_quarry_rescue?.started) {
            game.setObjectiveDone("q1_quarry_rescue", "visit_upper_camp");
          }
        },
        dialogue() {
          return [
            "You’re the one the Elder vouched for?",
            "Road’s rough ahead. The quarry’s to the west, just beyond town.",
            "If you’re going out there, keep your eyes open. Folks vanish in those cuts."
          ];
        }
      }
    ],
    enemies: [],
    exits: [
      { x: 9, y: 14, to: "route_upper_forest_camp_to_ironwood_town", spawnX: 11, spawnY: 1 },
      { x: 1, y: 7, to: "route_upper_forest_camp_to_quarry_entrance", spawnX: 20, spawnY: 9 }
    ],
    triggers: [
      {
        type: "sign",
        x: 9,
        y: 13,
        lines: ["Trail Marker", "South: Ironwood Town"]
      },
      {
        type: "sign",
        x: 2,
        y: 7,
        lines: ["Trail Marker", "West: Quarry Entrance"]
      }
    ]
  },

  lower_forest_camp: {
    id: "lower_forest_camp",
    label: "Forest Camp (South)",
    worldNodeId: "lower_forest_camp",
    biome: "forest",
    buildingTileset: "wood_dark",
    width: 18,
    height: 16,
    spawnX: 9,
    spawnY: 3,
    tiles: createFilled(18, 16, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 17 || y === 15) return 1;
      // v1.12.7: entrance/exit readability markers (trail funnel + threshold)
      if ((x === 8 && y === 1) || (x === 9 && y === 1) || (x === 10 && y === 1) || (x === 9 && y === 2) || (x === 9 && y === 3) || (x === 8 && y === 2) || (x === 10 && y === 2)) return 2;
      if ((x === 8 && y === 14) || (x === 9 && y === 14) || (x === 10 && y === 14) || (x === 9 && y === 13) || (x === 9 && y === 12) || (x === 8 && y === 13) || (x === 10 && y === 13)) return 2;
      // All walkable space is grass; exit-pad overlay handles entry/exit markers.
      return 0;
    }),
    npcs: [
      {
        id: "mentor",
        x: 8,
        y: 9,
        spriteIndex: 1,
        onInteract(state, game) {
          if (state.quest?.progress?.q1_quarry_rescue?.started) {
            game.setObjectiveDone("q1_quarry_rescue", "visit_lower_camp");
          }
        },
        dialogue(state) {
          if (state.flags?.quarryCleared) {
            return [
              "You look like you slept in stone dust and bad choices.",
              "If the quarry’s quiet, don’t let that work go to waste. Tell the Caretaker.",
              "After that, the junction’s south. Past the last pines, you’ll see the rails.",
              "That’s where the valley splits. Folks with plans are already waiting there."
            ];
          }
          return [
            "Camp’s the last warm place before the cuts and the rock.",
            "If you’re heading for the quarry, keep your water close and your eyes up.",
            "When you come back, don’t just pass through. People need to hear what’s true."
          ];
        }
      }
    ],
    enemies: [],
    exits: [
      { x: 9, y: 1, to: "route_lower_forest_camp_to_ironwood_town", spawnX: 11, spawnY: 16 },
      { x: 9, y: 14, to: "route_lower_forest_camp_to_ironwood_junction", onTraverse(state, game) {
        if (state.quest?.progress?.q2_crossroads?.started) {
          game.setObjectiveDone("q2_crossroads", "reach_junction");
        } else if (state.flags?.chapter1_quarryRescueComplete) {
          game.startQuest("q2_crossroads");
          game.setObjectiveDone("q2_crossroads", "reach_junction");
        }
      }, spawnX: 9, spawnY: 2 }
    ],
    triggers: [
      {
        type: "sign",
        x: 9,
        y: 2,
        lines: ["Trail Marker", "North: Ironwood Town"]
      },
      {
        type: "sign",
        x: 9,
        y: 13,
        lines: ["Trail Marker", "South: Ironwood Junction"]
      }
    ]
  },

  quarry_entrance: {
    id: "quarry_entrance",
    label: "Quarry Entrance",
    worldNodeId: "quarry_entrance",
    biome: "canyon",
    width: 18,
    height: 16,
    spawnX: 15,
    spawnY: 8,
    tiles: createFilled(18, 16, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 17 || y === 15) return 1;
// v1.14.1: non-town exit funnel + marker (Phase 1b)
if ((x === 15 && y === 8) || (x === 10 && y === 13)) return 3;
if ((Math.abs(x - 16) + Math.abs(y - 8) <= 1) || (Math.abs(x - 9) + Math.abs(y - 14) <= 1)) return 2;
      // return to upper forest camp
      if (x === 2 && y === 7) return 2;
      // entrance down into floor 1
      if (x === 9 && y === 14) return 2;
      return 0;
    }),
    npcs: [
      {
        id: "miner",
        x: 4,
        y: 8,
        spriteIndex: 4,

        onInteract(state, game) {
          if (!state.quest?.progress?.q1_quarry_rescue?.started) {
            game.startQuest("q1_quarry_rescue");
          }
          game.setObjectiveDone("q1_quarry_rescue", "reach_quarry");
        },
        dialogue(state, game) {
          if (state.flags.quarryCleared) {
            return [
              "Feels different down there now. Like the stone’s breathing easy again.",
              "Crews’ll come back once word spreads. Maybe the town’ll hear hammers in the morning again.",
              "If you’re heading back, tell the Elder we’re ready to work honest, not scared."
            ];
          } else {
            return [
              "You’re a stubborn one to make it out here alone.",
              "The quarry slipped its leash. Rock falls where it shouldn’t, and men vanish in dust.",
              "I stayed because someone had to. Someone who knew which tunnels still listened.",
              "If you’re set on going in, follow the lanterns. When the air feels wrong, turn back.",
              "If you come out the other side, maybe Ironwood’s got a future yet."
            ];
          }
        }
      }
    ],
    enemies: [],
    exits: [
      { x: 16, y: 8, to: "route_quarry_entrance_to_upper_forest_camp", spawnX: 1, spawnY: 9 },
      { x: 9, y: 14, to: "quarry_floor1", spawnX: 9, spawnY: 2 }
    ],
    items: [
      {
        id: "knife",
        x: 6,
        y: 9,
        name: "Knife",
        description: "A working knife left in the dust. Improves melee damage.",
        kind: "weapon",
        amount: 1
      }
    ],
    triggers: [
      {
        id: "boss_intro_quarry_overseer",
        type: "area",
        x: 0,
        y: 0,
        w: 16,
        h: 12,
        once: false,
        run: (s, game) => {
          if (!s || !s.flags) return;
          const bossId = "quarry_overseer";
          const introKey = `bossIntro_${bossId}`;
          const outroKey = `bossOutro_${bossId}`;

          const enemies = game._getEnemiesForCurrentMap();
          const bossAlive = enemies.some(e => e && !e.dead && e.archetypeId === bossId);

          // On entry, fire intro once while boss is alive.
          if (bossAlive && !s.flags[introKey] && !s.dialogue.isActive()) {
            s.flags[introKey] = true;
            s.dialogue.startDialogue(getBossIntro(bossId));
            return;
          }

          // After defeat, fire outro once.
          const bossDefeated = !!s.flags.quarryCleared && !bossAlive;
          if (bossDefeated && !s.flags[outroKey] && !s.dialogue.isActive()) {
            s.flags[outroKey] = true;
            s.dialogue.startDialogue(getBossOutro(bossId));
          }
        }
      }
    ]
  },

  quarry_floor1: {
    id: "quarry_floor1",
    label: "Deep Quarry – Level 1",
    worldNodeId: "quarry_entrance",
    biome: "canyon",
    width: 18,
    height: 16,
    spawnX: 9,
    spawnY: 2,
    tiles: createFilled(18, 16, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 17 || y === 15) return 1;

// v1.14.1: non-town exit funnel + marker (Phase 1b)
if ((x === 10 && y === 2) || (x === 10 && y === 13)) return 3;
if ((Math.abs(x - 9) + Math.abs(y - 1) <= 1) || (Math.abs(x - 9) + Math.abs(y - 14) <= 1)) return 2;
      // stairs up to entrance
      if (x === 9 && y === 1) return 2;
      // stairs down to level 2
      if (x === 9 && y === 14) return 2;


      // central pit
      if (x >= 7 && x <= 10 && y >= 6 && y <= 9) return 1;

      // pillars / supports
      if (x === 4 && y >= 3 && y <= 12) return 1;
      if (x === 13 && y >= 3 && y <= 12) return 1;

      // exit back up
      if (x === 9 && y === 1) return 2;

      return 0;
    }),
    npcs: [],
    enemies: [],

    exits: [
      { x: 9, y: 1, to: "quarry_entrance", spawnX: 9, spawnY: 13 },
      { x: 9, y: 14, to: "quarry_floor2", spawnX: 9, spawnY: 2 }
    ],
    items: [],
    triggers: [
      {
        id: "boss_intro_quarry_overseer",
        type: "area",
        x: 0,
        y: 0,
        w: 16,
        h: 12,
        once: false,
        run: (s, game) => {
          if (!s || !s.flags) return;
          const bossId = "quarry_overseer";
          const introKey = `bossIntro_${bossId}`;
          const outroKey = `bossOutro_${bossId}`;

          const enemies = game._getEnemiesForCurrentMap();
          const bossAlive = enemies.some(e => e && !e.dead && e.archetypeId === bossId);

          // On entry, fire intro once while boss is alive.
          if (bossAlive && !s.flags[introKey] && !s.dialogue.isActive()) {
            s.flags[introKey] = true;
            s.dialogue.startDialogue(getBossIntro(bossId));
            return;
          }

          // After defeat, fire outro once.
          const bossDefeated = !!s.flags.quarryCleared && !bossAlive;
          if (bossDefeated && !s.flags[outroKey] && !s.dialogue.isActive()) {
            s.flags[outroKey] = true;
            s.dialogue.startDialogue(getBossOutro(bossId));
          }
        }
      }
    ]
  }
,
  ironwood_caretaker_house: {
    id: "ironwood_caretaker_house",
    label: "Caretaker House",
    worldNodeId: "ironwood_town",
    biome: "wood_light",
    buildingTileset: "wood_light",
    width: 14,
    height: 12,
    spawnX: 7,
    spawnY: 9,
    tiles: createFilled(14, 12, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 13 || y === 11) return 1;
      // door back out
      if (x === 7 && y === 10) return 2;
      // simple furniture blocks
      if (x >= 3 && x <= 10 && y === 4) return 1;
      if (x === 4 && y === 7) return 1;
      return 0;
    }),
    npcs: [],
    enemies: [],
    exits: [
      { x: 7, y: 10, to: "ironwood_town", spawnX: 6, spawnY: 5 }
    ],
    items: [],
    triggers: [
      {
        id: "boss_intro_quarry_overseer",
        type: "area",
        x: 0,
        y: 0,
        w: 16,
        h: 12,
        once: false,
        run: (s, game) => {
          if (!s || !s.flags) return;
          const bossId = "quarry_overseer";
          const introKey = `bossIntro_${bossId}`;
          const outroKey = `bossOutro_${bossId}`;

          const enemies = game._getEnemiesForCurrentMap();
          const bossAlive = enemies.some(e => e && !e.dead && e.archetypeId === bossId);

          // On entry, fire intro once while boss is alive.
          if (bossAlive && !s.flags[introKey] && !s.dialogue.isActive()) {
            s.flags[introKey] = true;
            s.dialogue.startDialogue(getBossIntro(bossId));
            return;
          }

          // After defeat, fire outro once.
          const bossDefeated = !!s.flags.quarryCleared && !bossAlive;
          if (bossDefeated && !s.flags[outroKey] && !s.dialogue.isActive()) {
            s.flags[outroKey] = true;
            s.dialogue.startDialogue(getBossOutro(bossId));
          }
        }
      }
    ]
  },

  ironwood_general_store: {
    id: "ironwood_general_store",
    label: "General Store",
    worldNodeId: "ironwood_town",
    biome: "wood_light",
    buildingTileset: "wood_light",
    width: 14,
    height: 12,
    spawnX: 7,
    spawnY: 9,
    tiles: createFilled(14, 12, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 13 || y === 11) return 1;
      // door back out
      if (x === 7 && y === 10) return 2;
      // counter/shelves
      if (y === 4 && x >= 2 && x <= 11) return 1;
      if (x === 3 && y >= 7 && y <= 8) return 1;
      if (x === 10 && y >= 6 && y <= 9) return 1;
      return 0;
    }),
    npcs: [],
    enemies: [],
    exits: [
      { x: 7, y: 10, to: "ironwood_town", spawnX: 6, spawnY: 13 }
    ],
    items: [],
    triggers: [
      {
        id: "boss_intro_quarry_overseer",
        type: "area",
        x: 0,
        y: 0,
        w: 16,
        h: 12,
        once: false,
        run: (s, game) => {
          if (!s || !s.flags) return;
          const bossId = "quarry_overseer";
          const introKey = `bossIntro_${bossId}`;
          const outroKey = `bossOutro_${bossId}`;

          const enemies = game._getEnemiesForCurrentMap();
          const bossAlive = enemies.some(e => e && !e.dead && e.archetypeId === bossId);

          // On entry, fire intro once while boss is alive.
          if (bossAlive && !s.flags[introKey] && !s.dialogue.isActive()) {
            s.flags[introKey] = true;
            s.dialogue.startDialogue(getBossIntro(bossId));
            return;
          }

          // After defeat, fire outro once.
          const bossDefeated = !!s.flags.quarryCleared && !bossAlive;
          if (bossDefeated && !s.flags[outroKey] && !s.dialogue.isActive()) {
            s.flags[outroKey] = true;
            s.dialogue.startDialogue(getBossOutro(bossId));
          }
        }
      }
    ]
  },


  ironwood_supply_shed: {
    id: "ironwood_supply_shed",
    label: "Supply Shed",
    worldNodeId: "ironwood_town",
    biome: "wood_light",
    buildingTileset: "wood_light",
    width: 14,
    height: 12,
    spawnX: 7,
    spawnY: 9,
    tiles: createFilled(14, 12, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 13 || y === 11) return 1;
      if (x === 7 && y === 10) return 2; // door back out
      // crates / shelves (blockout)
      if (y === 4 && x >= 3 && x <= 10) return 1;
      if (y === 6 && x >= 3 && x <= 6) return 1;
      if (y === 6 && x >= 8 && x <= 10) return 1;
      return 0;
    }),
    npcs: [],
    enemies: [],
    exits: [
      { x: 7, y: 10, to: "ironwood_town", spawnX: 23, spawnY: 13 },
    ],
    items: [],
    triggers: [
      {
        type: "sign",
        x: 3,
        y: 3,
        lines: [
          "Supplies are sorted by hand.",
          "Bandages, nails, lantern oil. Not enough of any."
        ]
      }
    ]
  },

  ironwood_inn: {
    id: "ironwood_inn",
    label: "Ironwood Inn",
    worldNodeId: "ironwood_town",
    biome: "wood_light",
    buildingTileset: "wood_light",
    width: 16,
    height: 12,
    spawnX: 8,
    spawnY: 9,
    tiles: createFilled(16, 12, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 15 || y === 11) return 1;
      if (x === 8 && y === 10) return 2; // door back out
      // tables / bunks (blockout)
      if (y === 4 && x >= 3 && x <= 12 && (x === 3 || x === 12)) return 1;
      if (y === 6 && x >= 4 && x <= 11 && (x === 4 || x === 11)) return 1;
      return 0;
    }),
    npcs: [],
    enemies: [],
    exits: [
      { x: 8, y: 10, to: "ironwood_town", spawnX: 23, spawnY: 19 },
    ],
    items: [],
    triggers: [
      {
        type: "sign",
        x: 2,
        y: 2,
        lines: [
          "A chalkboard lists beds by name.",
          "Some names are crossed out. Some are new."
        ]
      }
    ]
  },

  ironwood_town_hall: {
    id: "ironwood_town_hall",
    label: "Town Hall",
    worldNodeId: "ironwood_town",
    biome: "wood_light",
    buildingTileset: "wood_light",
    width: 16,
    height: 12,
    spawnX: 8,
    spawnY: 9,
    tiles: createFilled(16, 12, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 15 || y === 11) return 1;
      if (x === 8 && y === 10) return 2; // door back out
      // dais / ledger desk (blockout)
      if (y === 3 && x >= 5 && x <= 10) return 1;
      if (y === 5 && x === 8) return 1;
      return 0;
    }),
    npcs: [],
    enemies: [],
    exits: [
      { x: 8, y: 10, to: "ironwood_town", spawnX: 9, spawnY: 7 },
    ],
    items: [],
    triggers: [
      {
        type: "sign",
        x: 2,
        y: 2,
        lines: [
          "A ledger lies open.",
          "Routes. Rations. Names written careful."
        ]
      }
    ]
  },

  quarry_floor2: {
    id: "quarry_floor2",
    label: "Deep Quarry – Level 2",
    worldNodeId: "quarry_entrance",
    biome: "canyon",
    width: 18,
    height: 16,
    spawnX: 9,
    spawnY: 2,
    tiles: createFilled(18, 16, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 17 || y === 15) return 1;

// v1.14.1: non-town exit funnel + marker (Phase 1b)
if ((x === 10 && y === 2) || (x === 10 && y === 13)) return 3;
if ((Math.abs(x - 9) + Math.abs(y - 1) <= 1) || (Math.abs(x - 9) + Math.abs(y - 14) <= 1)) return 2;
      // stairs up / down
      if (x === 9 && y === 1) return 2;
      if (x === 9 && y === 14) return 2;

      // tighter corridors
      if (x === 6 && y >= 3 && y <= 12) return 1;
      if (x === 12 && y >= 3 && y <= 12) return 1;
      if (y === 8 && x >= 2 && x <= 15) return 1;

      // side pockets
      if (x === 3 && y === 5) return 1;
      if (x === 14 && y === 11) return 1;

      return 0;
    }),
    npcs: [],
    enemies: [],
    exits: [
      { x: 9, y: 1, to: "quarry_floor1", spawnX: 9, spawnY: 13 },
      { x: 9, y: 14, to: "quarry_boss_room", spawnX: 8, spawnY: 9 }
    ],
    items: [],
    triggers: [
      {
        id: "boss_intro_quarry_overseer",
        type: "area",
        x: 0,
        y: 0,
        w: 16,
        h: 12,
        once: false,
        run: (s, game) => {
          if (!s || !s.flags) return;
          const bossId = "quarry_overseer";
          const introKey = `bossIntro_${bossId}`;
          const outroKey = `bossOutro_${bossId}`;

          const enemies = game._getEnemiesForCurrentMap();
          const bossAlive = enemies.some(e => e && !e.dead && e.archetypeId === bossId);

          // On entry, fire intro once while boss is alive.
          if (bossAlive && !s.flags[introKey] && !s.dialogue.isActive()) {
            s.flags[introKey] = true;
            s.dialogue.startDialogue(getBossIntro(bossId));
            return;
          }

          // After defeat, fire outro once.
          const bossDefeated = !!s.flags.quarryCleared && !bossAlive;
          if (bossDefeated && !s.flags[outroKey] && !s.dialogue.isActive()) {
            s.flags[outroKey] = true;
            s.dialogue.startDialogue(getBossOutro(bossId));
          }
        }
      }
    ]
  },

  quarry_boss_room: {
    id: "quarry_boss_room",
    label: "Deep Quarry – Boss Room",
    worldNodeId: "quarry_entrance",
    biome: "canyon",
    width: 16,
    height: 12,
    spawnX: 8,
    spawnY: 9,
    tiles: createFilled(16, 12, 0, (x, y) => {
      if (x === 0 || y === 0 || x === 15 || y === 11) return 1;

// v1.14.1: non-town exit funnel + marker (Phase 1b)
// (Removed v1.14.1 faux-exit markers at the top edge; they read like an exit that does not exist.)
      // entrance / exit back up
      if (x === 8 && y === 10) return 2;

      // rubble ring opening (prevents sealed arena)
      if (x === 8 && y === 8) return 0;

      // rubble ring
      if ((x === 3 || x === 12) && y >= 3 && y <= 8) return 1;
      if ((y === 3 || y === 8) && x >= 4 && x <= 11) return 1;

      return 0;
    }),
    npcs: [],
    enemies: [
      {
        id: "quarry_overseer",
        x: 8,
        y: 5,
        hp: 6,
        onDeath(game) {
          game.state.flags.quarryCleared = true;
          // Quest objective
          if (game?.state?.quest) {
            game.setObjectiveDone("q1_quarry_rescue", "clear_quarry");
          }
          game.state.message = "The quarry goes quiet. The valley can breathe again.";
        }
      }
    ],
    exits: [
      { x: 8, y: 10, to: "quarry_floor2", spawnX: 9, spawnY: 13 }
    ],
    items: [],
    triggers: [
      {
        id: "boss_intro_quarry_overseer",
        type: "area",
        x: 0,
        y: 0,
        w: 16,
        h: 12,
        once: false,
        run: (s, game) => {
          if (!s || !s.flags) return;
          const bossId = "quarry_overseer";
          const introKey = `bossIntro_${bossId}`;
          const outroKey = `bossOutro_${bossId}`;

          const enemies = game._getEnemiesForCurrentMap();
          const bossAlive = enemies.some(e => e && !e.dead && e.archetypeId === bossId);

          // On entry, fire intro once while boss is alive.
          if (bossAlive && !s.flags[introKey] && !s.dialogue.isActive()) {
            s.flags[introKey] = true;
            s.dialogue.startDialogue(getBossIntro(bossId));
            return;
          }

          // After defeat, fire outro once.
          const bossDefeated = !!s.flags.quarryCleared && !bossAlive;
          if (bossDefeated && !s.flags[outroKey] && !s.dialogue.isActive()) {
            s.flags[outroKey] = true;
            s.dialogue.startDialogue(getBossOutro(bossId));
          }
        }
      }
    ]
  },
};

function createFilled(w, h, baseValue, fn) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      row.push(fn ? fn(x, y) : baseValue);
    }
    rows.push(row);
  }
  return rows;
}

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
for (const __k in region1Maps) {
  try { cleanWalkPlane(region1Maps[__k]); } catch (e) { /* no-op */ }
}
