// src/data/chapter1_state.js
// Chapter 1 "gold path" reactivity.
//
// Goals:
// - Enforce a clear Chapter 1 spine through access changes + environmental cues.
// - Keep changes modular and data-driven.
// - No UI indicators, no tutorials, no timers.

export function ensureChapter1Flags(flags) {
  const f = (flags && typeof flags === "object") ? flags : {};

  const out = {
    // Legacy / existing flags
    quarryCleared: !!f.quarryCleared,

    // Chapter 1 progression
    chapter1_introStarted: !!f.chapter1_introStarted,
    chapter1_reportedBack: !!f.chapter1_reportedBack,
    chapter1_quarryRescueComplete: !!f.chapter1_quarryRescueComplete,

    // Chapter 1.5 route contract flags
    rr_lingered: !!f.rr_lingered,
    ironwood_delayStagnation: !!f.ironwood_delayStagnation,

    chapter1_5_riverRoadComplete: !!f.chapter1_5_riverRoadComplete,
    chapter1_5_fishingVillageComplete: !!f.chapter1_5_fishingVillageComplete,
    chapter1_5_ursaBluffsComplete: !!f.chapter1_5_ursaBluffsComplete,
    chapter1_5_machRanchUnlocked: !!f.chapter1_5_machRanchUnlocked,
    chapter1_5_machRanchReached: !!f.chapter1_5_machRanchReached,

    // Mach Ranch — restraint outcome (v1.5.0)
    machRanchRestraintResolved: !!f.machRanchRestraintResolved,
    machRanchRestraintRespected: !!f.machRanchRestraintRespected,
    machRanchRestraintViolated: !!f.machRanchRestraintViolated,
    machRanchAccordReceived: !!f.machRanchAccordReceived,

    // Ironwood leanings (systemic; not labeled)
    ironwoodLeanProsperous: !!f.ironwoodLeanProsperous,
    ironwoodLeanFortified: !!f.ironwoodLeanFortified,


    // Fishing Village temptation loop flags (v1.3.0)
    fv_contractAccepted: !!f.fv_contractAccepted,
    fv_netsFixed: !!f.fv_netsFixed,
    fv_contractDone: !!f.fv_contractDone,
    fv_temptationBeat: !!f.fv_temptationBeat,
    fv_stayedOnce: !!f.fv_stayedOnce,

    // Ironwood consequence from village comfort
    ironwood_villageComplacency: !!f.ironwood_villageComplacency,

    // Chapter 2 hook (kept for forward compatibility)
    chapter1_crossroadsStarted: !!f.chapter1_crossroadsStarted,

    // Core checkpoints (v1.12.8)
    // - Checkpoint 1: Quarry Overseer defeated (maps to existing `quarryCleared`)
    // - Checkpoint 2: Ursa Bluffs boss defeated
    // - Checkpoint 3: Precipice Pass boss defeated
    checkpoint2_ursaBossDefeated: !!f.checkpoint2_ursaBossDefeated,
    checkpoint3_precipiceBossDefeated: !!f.checkpoint3_precipiceBossDefeated,

    // Final confrontation state (spawns in Ironwood Town after Checkpoint 3)
    finalBossDefeated: !!f.finalBossDefeated,

    // Preserve any other flags set by content elsewhere
    ...f,
  };

  // Derived convenience: Mach Ranch unlock is determined by the contract completes.
  out.chapter1_5_machRanchUnlocked =
    !!out.chapter1_5_machRanchUnlocked ||
    (!!out.chapter1_5_riverRoadComplete &&
      !!out.chapter1_5_fishingVillageComplete &&
      !!out.chapter1_5_ursaBluffsComplete);

  // Derived convenience: Checkpoint 2 implies Ursa Bluffs completion.
  // (We keep the older area-trigger flag for backward compatibility with existing saves.)
  out.chapter1_5_ursaBluffsComplete =
    !!out.chapter1_5_ursaBluffsComplete ||
    !!out.checkpoint2_ursaBossDefeated ||
    !!out.ursaCleared;

  // Derived convenience: Checkpoint 3 implies the pass is cleared.
  out.passCleared = !!out.passCleared || !!out.checkpoint3_precipiceBossDefeated;

  return out;
}

function cloneMap(baseMap) {
  if (!baseMap || typeof baseMap !== "object") return baseMap;
  return {
    ...baseMap,
    tiles: baseMap.tiles ? baseMap.tiles.map(r => r.slice()) : baseMap.tiles,
    npcs: (baseMap.npcs || []).map(n => ({ ...n })),
    exits: (baseMap.exits || []).map(e => ({ ...e })),
    triggers: (baseMap.triggers || []).map(t => ({ ...t })),
    items: (baseMap.items || []).map(i => ({ ...i })),
  };
}

function isObjectiveDone(state, qid, objId) {
  const done = state?.quest?.progress?.[qid]?.objectivesDone || {};
  return !!done[objId];
}

function setDoorTile(map, x, y, open) {
  if (!map?.tiles || !map.tiles[y] || typeof map.tiles[y][x] === "undefined") return;
  map.tiles[y][x] = open ? 2 : 1;
}

export function applyChapter1Reactivity(baseMap, state) {
  if (!baseMap) return baseMap;
  const s = state || {};
  s.flags = ensureChapter1Flags(s.flags);

  const map = cloneMap(baseMap);

  // =========================
  // Spine gating (no softlocks)
  // =========================

  // 1) Ironwood Town → must speak to the Caretaker before heading north.
  if (map.id === "ironwood_town") {
    const spokeCaretaker = isObjectiveDone(s, "q1_quarry_rescue", "talk_caretaker");
    // Gate the north exit until the player has spoken to the Caretaker.
    setDoorTile(map, 15, 1, spokeCaretaker);

    // Environmental cue: a subtle sign near the north gate.
    map.triggers = Array.isArray(map.triggers) ? map.triggers.slice() : [];
    map.triggers.push({
      type: "sign",
      x: 14,
      y: 2,
      lines: spokeCaretaker
        ? ["North Gate", "Fresh tracks lead into the pines."]
        : ["North Gate", "A note is nailed up: \"See the Caretaker first.\""]
    });

    // Record that Chapter 1 has started once the player can leave with intent.
    if (spokeCaretaker) {
      s.flags.chapter1_introStarted = true;
    }

    // Checkpoint 1 gate (Quarry Overseer defeat): block the south route out of Ironwood Town.
    // Implemented as a physical NPC block so it reads diegetic and deterministic.
    if (!s.flags.quarryCleared) {
      map.npcs = Array.isArray(map.npcs) ? map.npcs.slice() : [];
      // Stand directly on the south exit pad (exit is at x=7,y=22 in region1) so it can't be bypassed.
      map.npcs.push({
        id: "south_gate_guard",
        x: 7,
        y: 22,
        spriteIndex: 3,
        dialogue() {
          return [
            "Hold there.",
            "No one takes the south trail while the quarry's still boiling.",
            "Settle the Overseer. Then you can walk it."
          ];
        }
      });
    }
  }

  // 2) Upper Forest Camp → objective clarity via on-arrival state.
  if (map.id === "upper_forest_camp") {
    map.triggers = Array.isArray(map.triggers) ? map.triggers.slice() : [];
    map.triggers.push({
      type: "area",
      x: map.spawnX,
      y: map.spawnY,
      w: 2,
      h: 2,
      once: true,
      run(state, game) {
        if (state.quest?.progress?.q1_quarry_rescue?.started) {
          game.setObjectiveDone("q1_quarry_rescue", "visit_upper_camp");
        }
      }
    });

    // Cue: the quarry path is called out without a tutorial.
    map.triggers.push({
      type: "sign",
      x: 3,
      y: 7,
      lines: ["Trail Marker", "West: Quarry Road", "Lanterns hang low where the trail narrows."]
    });
  }

  // 3) Quarry Entrance → do not let the player descend until the Miner has been spoken to.
  if (map.id === "quarry_entrance") {
    const spokeMiner = isObjectiveDone(s, "q1_quarry_rescue", "reach_quarry");
    setDoorTile(map, 9, 14, spokeMiner);

    map.triggers = Array.isArray(map.triggers) ? map.triggers.slice() : [];
    map.triggers.push({
      type: "sign",
      x: 9,
      y: 13,
      lines: spokeMiner
        ? ["A lantern line disappears into the cut.", "The air smells of damp stone."]
        : ["A lantern line disappears into the cut.", "Someone has scratched: \"Talk to the Miner.\""]
    });
  }

  // 4) Lower Forest Camp → keep Chapter 1 focused: no Junction until rescue is confirmed back home.
  if (map.id === "lower_forest_camp") {
    const rescueConfirmed = !!s.flags.chapter1_quarryRescueComplete;
    setDoorTile(map, 9, 14, rescueConfirmed);

    // Once the quarry is cleared, arriving here should feel like a "turn back" moment.
    map.triggers = Array.isArray(map.triggers) ? map.triggers.slice() : [];
    map.triggers.push({
      type: "area",
      x: map.spawnX,
      y: map.spawnY,
      w: 2,
      h: 2,
      once: true,
      run(state, game) {
        if (state.flags?.quarryCleared) {
          game.setObjectiveDone("q1_quarry_rescue", "visit_lower_camp");
        }
      }
    });

    map.triggers.push({
      type: "sign",
      x: 10,
      y: 13,
      lines: rescueConfirmed
        ? ["South", "Junction ahead. Rails in sight."]
        : ["South", "The path opens up… but your work isn’t finished.\nIronwood is waiting."]
    });
  }

  // 4.5) Ironwood Junction → Checkpoint 2 gate: block the Mach Ranch route until Ursa boss is defeated.
  if (map.id === "ironwood_junction") {
    if (!s.flags.checkpoint2_ursaBossDefeated) {
      map.npcs = Array.isArray(map.npcs) ? map.npcs.slice() : [];
      // Stand directly on the exit pad at x=20,y=8 (region2 exit definition) so it can't be bypassed.
      map.npcs.push({
        id: "mach_route_blocker",
        x: 20,
        y: 8,
        spriteIndex: 3,
        dialogue() {
          return [
            "You can try the ranch road if you like.",
            "But the bluffs are taking men off the switchback.",
            "Clear the Warden. Then we talk about southbound."
          ];
        }
      });
    }
  }

  
  // 4.5) Supply Shed merchant (unlocks after Checkpoint 1: Quarry Overseer)
  if (map.id === "ironwood_supply_shed") {
    if (s.flags.quarryCleared) {
      const hasId = (map.npcs || []).some(n => n.id === "supply_shed_merchant");
      if (!hasId) {
        if (!Array.isArray(map.npcs)) map.npcs = [];
        map.npcs.push({
          id: "supply_shed_merchant",
          x: 7,
          y: 6,
          spriteIndex: 1,
          dialogue(state) {
            const inv = Array.isArray(state.inventory) ? state.inventory : (state.inventory = []);
            const coinValue = (id) => {
              if (id === "small_coin") return 1;
              if (id === "coin_bundle") return 5;
              return 0;
            };
            const coinTotal = () => inv.reduce((sum, it) => sum + coinValue(it?.id), 0);

            const payCoins = (cost) => {
              let need = cost;
              if (coinTotal() < need) return false;

              // Remove small coins first, then bundles.
              const order = ["small_coin", "coin_bundle"];
              for (const cid of order) {
                if (need <= 0) break;
                for (let i = inv.length - 1; i >= 0 && need > 0; i--) {
                  if (inv[i]?.id !== cid) continue;
                  const val = coinValue(cid);
                  inv.splice(i, 1);
                  need -= val;
                }
              }

              // If we overpaid with a bundle, make change in small coins.
              while (need < 0) {
                inv.push({ id: "small_coin", name: "Small Coin", kind: "loot" });
                need += 1;
              }
              return true;
            };

            const buyTonicCost = 3;
            const buyBulletsCost = 2; // 3 rounds
            const coins = coinTotal();

            return [
              "The shed smells of oil, canvas, and old rope.",
              `"I can sell you a little, if you’ve got coin." (You have ${coins}.)`,
              {
                type: "choice",
                prompt: "What do you want?",
                options: [
                  {
                    label: `Buy Field Tonic (${buyTonicCost})`,
                    onChoose(st) {
                      const ok = payCoins(buyTonicCost);
                      if (!ok) { st.message = "Not enough coin."; return; }
                      st.inventory.push({
                        id: "field_tonic",
                        name: "Field Tonic",
                        description: "Restores a bit of strength after a bad scrape.",
                        kind: "healing",
                        amount: 10
                      });
                      st.message = "Bought Field Tonic.";
                    },
                    after: [
                      "He slides a stoppered bottle across the counter. \"Don’t waste it.\""
                    ]
                  },
                  {
                    label: `Buy Bullets (3) (${buyBulletsCost})`,
                    onChoose(st) {
                      const ok = payCoins(buyBulletsCost);
                      if (!ok) { st.message = "Not enough coin."; return; }
                      for (let i = 0; i < 3; i++) {
                        st.inventory.push({ id: "bullet", name: "Bullet", kind: "supply" });
                      }
                      st.message = "Bought bullets.";
                    },
                    after: [
                      "Three dull rounds. \"Keep ’em dry,\" he says."
                    ]
                  },
                  {
                    label: "Leave",
                    after: ["Suit yourself."]
                  }
                ]
              }
            ];
          }
        });
      }
    }
  }

// 5) Reporting back → set a clear consequence flag (used for Ironwood reactivity).
  // This is set by the Caretaker's onInteract in region data, but we harden it here too.
  if (s.flags.quarryCleared && isObjectiveDone(s, "q1_quarry_rescue", "report_back")) {
    s.flags.chapter1_reportedBack = true;
  }

  

  // Ironwood Town (bottom-right building interior) — Blacksmith unlocks after Checkpoint 2 (Ursa Bluffs boss)
  if (map.id === "ironwood_inn") {
    if (s.flags.checkpoint2_ursaBossDefeated) {
      const hasId = (map.npcs || []).some(n => n.id === "ironwood_blacksmith");
      if (!hasId) {
        if (!Array.isArray(map.npcs)) map.npcs = [];
        map.npcs.push({
          id: "ironwood_blacksmith",
          x: 8,
          y: 6,
          spriteIndex: 4,
          dialogue(state) {
            const inv = Array.isArray(state.inventory) ? state.inventory : (state.inventory = []);
            const coinValue = (id) => {
              if (id === "small_coin") return 1;
              if (id === "coin_bundle") return 5;
              return 0;
            };
            const coinTotal = () => inv.reduce((sum, it) => sum + coinValue(it?.id), 0);

            const payCoins = (cost) => {
              let need = cost;
              if (coinTotal() < need) return false;

              // Remove small coins first, then bundles.
              const order = ["small_coin", "coin_bundle"];
              for (const cid of order) {
                if (need <= 0) break;
                for (let i = inv.length - 1; i >= 0 && need > 0; i--) {
                  if (inv[i]?.id !== cid) continue;
                  const val = coinValue(cid);
                  inv.splice(i, 1);
                  need -= val;
                }
              }

              // If we overpaid with a bundle, make change in small coins.
              while (need < 0) {
                inv.push({ id: "small_coin", name: "Small Coin", kind: "loot" });
                need += 1;
              }
              return true;
            };

            const hasItem = (id) => inv.some(it => it && it.id === id);

            const rifleCost = 10;
            const saberCost = 7;
            const coins = coinTotal();

            return [
              "A man with scarred hands works the steel like it’s a prayer he doesn’t say aloud.",
              `"If you’ve come back from the bluffs, you’ve earned better than farm tools." (You have ${coins}.)`,
              {
                type: "choice",
                prompt: "What are you after?",
                options: [
                  {
                    label: hasItem("rifle") ? "Rifle (owned)" : `Buy Rifle (${rifleCost})`,
                    disabled: hasItem("rifle"),
                    onChoose(st) {
                      if (hasItem("rifle")) { st.message = "Already have a rifle."; return; }
                      const ok = payCoins(rifleCost);
                      if (!ok) { st.message = "Not enough coin."; return; }
                      st.inventory.push({ id: "rifle", name: "Rifle", kind: "weapon" });
                      st.message = "Bought Rifle.";
                    },
                    after: [
                      "He sets the long gun down gentle, like it might bruise. \"Keep it dry. Keep it fed.\""
                    ]
                  },
                  {
                    label: hasItem("saber") ? "Saber (owned)" : `Buy Saber (${saberCost})`,
                    disabled: hasItem("saber"),
                    onChoose(st) {
                      if (hasItem("saber")) { st.message = "Already have a saber."; return; }
                      const ok = payCoins(saberCost);
                      if (!ok) { st.message = "Not enough coin."; return; }
                      st.inventory.push({ id: "saber", name: "Saber", kind: "weapon" });
                      st.message = "Bought Saber.";
                    },
                    after: [
                      "The blade is plain, honest. \"Don’t swing it angry. Swing it clean.\""
                    ]
                  },
                  { label: "Leave", onChoose() {} }
                ]
              }
            ];
          }
        });
      }
    }
  }

return map;
}