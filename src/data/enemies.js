// enemies.js
// Phase B1: data-driven enemy archetypes + Quarry-only spawn lists.

export const ENEMY_ARCHETYPES = {
  wolf: {
    displayName: "Coyote",
    kind: "animal",
    hpMax: 3,
    contactDamage: 2,
    moveSpeedMs: 260,
    aggroRangeTiles: 5,
    attackRangeTiles: 1,
    telegraphMs: 180,
    attackCooldownMs: 900,
    knockbackTiles: 1,
    drops: [
      { id: "hide_scrap", chance: 0.30, min: 1, max: 1 },
    ],
    ai: {
      mode: "melee",
      roamRadiusTiles: 3,
      leashRangeTiles: 8,
    },
  },

  bandit_melee: {
    displayName: "Bandit",
    kind: "human",
    hpMax: 4,
    contactDamage: 3,
    moveSpeedMs: 320,
    aggroRangeTiles: 6,
    attackRangeTiles: 1,
    telegraphMs: 240,
    attackCooldownMs: 1100,
    knockbackTiles: 1,
    drops: [
      { id: "small_coin", chance: 0.45, min: 1, max: 2 },
      { id: "field_tonic", chance: 0.12, min: 1, max: 1 },
    ],
    ai: {
      mode: "melee",
      roamRadiusTiles: 2,
      leashRangeTiles: 10,
    },
  },

  bandit_marksman: {
    displayName: "Marksman",
    kind: "human",
    hpMax: 3,
    contactDamage: 2,
    moveSpeedMs: 360,
    aggroRangeTiles: 8,
    attackRangeTiles: 6,
    telegraphMs: 520,
    attackCooldownMs: 1400,
    projectile: {
      speedTilesPerSec: 6,
      maxRangeTiles: 7,
      damage: 3,
      hitStunMs: 120,
    },
    drops: [
      { id: "ammo_scrap", chance: 0.35, min: 1, max: 2 },
      { id: "small_coin", chance: 0.35, min: 1, max: 2 },
    ],
    ai: {
      mode: "ranged",
      keepDistanceTiles: 3,
      roamRadiusTiles: 2,
      leashRangeTiles: 12,
    },
  },

  quarry_overseer: {
    displayName: "Quarry Overseer",
    kind: "boss",
    hpMax: 8,
    contactDamage: 4,
    moveSpeedMs: 340,
    aggroRangeTiles: 7,
    attackRangeTiles: 1,
    telegraphMs: 360,
    attackCooldownMs: 1200,
    phase2AtHp: 4,
    drops: [
      { id: "pay_script", chance: 1.0, min: 1, max: 1 },
      { id: "coin_bundle", chance: 0.70, min: 1, max: 1 },
      { id: "heart_container", chance: 1.0, min: 1, max: 1 },
      { id: "pistol", chance: 1.0, min: 1, max: 1 },
    ],
    ai: {
      mode: "melee",
      roamRadiusTiles: 0,
      leashRangeTiles: 14,
      boss: true,
    },
    onDeath: {
      setFlag: "quarryCleared",
      completeQuest: "quarry_rescue",
      completeObjective: "q1_quarry_rescue.clear_quarry",
    },
  },

  // =========================
  // Checkpoint bosses (v1.12.8)
  // =========================
  bluff_warden: {
    displayName: "Bluff Warden",
    kind: "boss",
    hpMax: 10,
    contactDamage: 4,
    moveSpeedMs: 320,
    aggroRangeTiles: 7,
    attackRangeTiles: 1,
    telegraphMs: 340,
    attackCooldownMs: 1150,
    phase2AtHp: 5,
    drops: [
      { id: "ammo_scrap", chance: 0.55, min: 1, max: 2 },
      { id: "coin_bundle", chance: 0.55, min: 1, max: 1 },
    ],
    ai: {
      mode: "melee",
      roamRadiusTiles: 0,
      leashRangeTiles: 14,
      boss: true,
    },
    onDeath: {
      setFlag: "checkpoint2_ursaBossDefeated",
    },
  },

  vale_lieutenant: {
    displayName: "Vale Lieutenant",
    kind: "boss",
    hpMax: 11,
    contactDamage: 4,
    moveSpeedMs: 340,
    aggroRangeTiles: 8,
    attackRangeTiles: 2,
    telegraphMs: 420,
    attackCooldownMs: 1250,
    drops: [
      { id: "vale_dossier", chance: 0.65, min: 1, max: 1 },
      { id: "coin_bundle", chance: 0.75, min: 1, max: 1 },
    ],
    ai: {
      mode: "melee",
      roamRadiusTiles: 0,
      leashRangeTiles: 14,
      boss: true,
    },
    onDeath: {
      setFlag: "checkpoint3_precipiceBossDefeated",
    },
  },

  deacon_vale: {
    displayName: "Deacon Vale",
    kind: "boss",
    hpMax: 14,
    contactDamage: 5,
    moveSpeedMs: 360,
    aggroRangeTiles: 8,
    attackRangeTiles: 2,
    telegraphMs: 460,
    attackCooldownMs: 1350,
    drops: [
      { id: "ironwood_charter", chance: 0.80, min: 1, max: 1 },
    ],
    ai: {
      mode: "melee",
      roamRadiusTiles: 0,
      leashRangeTiles: 16,
      boss: true,
    },
    onDeath: {
      setFlag: "finalBossDefeated",
    },
  },
};

// Spawns by map. Towns/camps remain safe; travel routes can be exposed.
export const SPAWNS_BY_MAP = {
  quarry_floor1: [
    { id: "q1_wolf_01", archetypeId: "wolf", x: 10, y: 7 },
    { id: "q1_bandit_01", archetypeId: "bandit_melee", x: 14, y: 9 },
  ],
  quarry_floor2: [
    { id: "q2_marksman_01", archetypeId: "bandit_marksman", x: 9, y: 12 },
    { id: "q2_bandit_01", archetypeId: "bandit_melee", x: 13, y: 10 },
  ],
  quarry_boss_room: [
    { id: "qb_overseer", archetypeId: "quarry_overseer", x: 8, y: 6 },
  ],

  ursa_bluffs: [
    // Reuse existing archetypes; difficulty comes from exposure + placement, not UI.
    { id: "ub_wolf_01", archetypeId: "wolf", x: 9, y: 6 },
    { id: "ub_wolf_02", archetypeId: "wolf", x: 12, y: 11 },
    { id: "ub_bandit_01", archetypeId: "bandit_melee", x: 16, y: 12 },

    // Checkpoint 2 boss — must be defeated to unlock the Junction → Mach Ranch route.
    { id: "ub_boss_warden", archetypeId: "bluff_warden", x: 18, y: 13 },
  ],

  precipice_pass: [
    // Checkpoint 3 boss — the last gate before the Ironwood Town confrontation.
    { id: "pp_boss_lieutenant", archetypeId: "vale_lieutenant", x: 11, y: 6 },
  ],

  ironwood_town: [
    // Final boss appears only after Checkpoint 3.
    {
      id: "iw_final_boss_vale",
      archetypeId: "deacon_vale",
      x: 15,
      y: 9,
      requiresFlags: ["checkpoint3_precipiceBossDefeated"],
      requiresNotFlags: ["finalBossDefeated"],
    },
  ],
  // Travel routes (fightable exposure between safe nodes)
  route_fishing_village_to_river_road: [
    { id: "r_fishing_village_to_river_road_01", archetypeId: "bandit_melee", x: 12, y: 9 },
    { id: "r_fishing_village_to_river_road_02", archetypeId: "bandit_marksman", x: 16, y: 10 },
  ],

  route_fishing_village_to_ursa_bluffs: [
    { id: "r_fishing_village_to_ursa_bluffs_01", archetypeId: "bandit_melee", x: 12, y: 9 },
    { id: "r_fishing_village_to_ursa_bluffs_02", archetypeId: "bandit_marksman", x: 16, y: 10 },
  ],

  route_highlands_to_mach_ranch: [
    { id: "r_highlands_to_mach_ranch_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_highlands_to_mach_ranch_02", archetypeId: "wolf", x: 15, y: 8 },
    { id: "r_highlands_to_mach_ranch_03", archetypeId: "bandit_marksman", x: 16, y: 12 },
  ],

  route_highlands_to_precipice_pass: [
    { id: "r_highlands_to_precipice_pass_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_highlands_to_precipice_pass_02", archetypeId: "wolf", x: 15, y: 8 },
    { id: "r_highlands_to_precipice_pass_03", archetypeId: "bandit_marksman", x: 16, y: 12 },
  ],

  route_ironwood_junction_to_lower_forest_camp: [
    { id: "r_ironwood_junction_to_lower_forest_camp_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_ironwood_junction_to_lower_forest_camp_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_ironwood_junction_to_mach_ranch: [
    { id: "r_ironwood_junction_to_mach_ranch_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_ironwood_junction_to_mach_ranch_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_ironwood_junction_to_river_road: [
    { id: "r_ironwood_junction_to_river_road_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_ironwood_junction_to_river_road_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_ironwood_town_to_lower_forest_camp: [
    { id: "r_ironwood_town_to_lower_forest_camp_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_ironwood_town_to_lower_forest_camp_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_ironwood_town_to_upper_forest_camp: [
    { id: "r_ironwood_town_to_upper_forest_camp_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_ironwood_town_to_upper_forest_camp_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_lower_forest_camp_to_ironwood_junction: [
    { id: "r_lower_forest_camp_to_ironwood_junction_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_lower_forest_camp_to_ironwood_junction_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_lower_forest_camp_to_ironwood_town: [
    { id: "r_lower_forest_camp_to_ironwood_town_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_lower_forest_camp_to_ironwood_town_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_mach_ranch_to_highlands: [
    { id: "r_mach_ranch_to_highlands_01", archetypeId: "bandit_melee", x: 12, y: 9 },
    { id: "r_mach_ranch_to_highlands_02", archetypeId: "bandit_marksman", x: 16, y: 10 },
  ],

  route_mach_ranch_to_ironwood_junction: [
    { id: "r_mach_ranch_to_ironwood_junction_01", archetypeId: "bandit_melee", x: 12, y: 9 },
    { id: "r_mach_ranch_to_ironwood_junction_02", archetypeId: "bandit_marksman", x: 16, y: 10 },
  ],

  route_precipice_pass_to_highlands: [
    { id: "r_precipice_pass_to_highlands_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_precipice_pass_to_highlands_02", archetypeId: "wolf", x: 15, y: 8 },
    { id: "r_precipice_pass_to_highlands_03", archetypeId: "bandit_marksman", x: 16, y: 12 },
  ],

  route_quarry_entrance_to_upper_forest_camp: [
    { id: "r_quarry_entrance_to_upper_forest_camp_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_quarry_entrance_to_upper_forest_camp_02", archetypeId: "wolf", x: 15, y: 8 },
    { id: "r_quarry_entrance_to_upper_forest_camp_03", archetypeId: "bandit_marksman", x: 16, y: 12 },
  ],

  route_river_road_to_fishing_village: [
    { id: "r_river_road_to_fishing_village_01", archetypeId: "bandit_melee", x: 12, y: 9 },
    { id: "r_river_road_to_fishing_village_02", archetypeId: "bandit_marksman", x: 16, y: 10 },
  ],

  route_river_road_to_ironwood_junction: [
    { id: "r_river_road_to_ironwood_junction_01", archetypeId: "bandit_melee", x: 12, y: 9 },
    { id: "r_river_road_to_ironwood_junction_02", archetypeId: "bandit_marksman", x: 16, y: 10 },
  ],

  route_upper_forest_camp_to_ironwood_town: [
    { id: "r_upper_forest_camp_to_ironwood_town_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_upper_forest_camp_to_ironwood_town_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_upper_forest_camp_to_quarry_entrance: [
    { id: "r_upper_forest_camp_to_quarry_entrance_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_upper_forest_camp_to_quarry_entrance_02", archetypeId: "bandit_melee", x: 14, y: 10 },
  ],

  route_ursa_bluffs_to_fishing_village: [
    { id: "r_ursa_bluffs_to_fishing_village_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_ursa_bluffs_to_fishing_village_02", archetypeId: "wolf", x: 15, y: 8 },
    { id: "r_ursa_bluffs_to_fishing_village_03", archetypeId: "bandit_marksman", x: 16, y: 12 },
  ],

  route_ursa_bluffs_to_ironwood_junction: [
    { id: "r_ursa_bluffs_to_ironwood_junction_01", archetypeId: "wolf", x: 11, y: 9 },
    { id: "r_ursa_bluffs_to_ironwood_junction_02", archetypeId: "wolf", x: 15, y: 8 },
    { id: "r_ursa_bluffs_to_ironwood_junction_03", archetypeId: "bandit_marksman", x: 16, y: 12 },
  ],

};
