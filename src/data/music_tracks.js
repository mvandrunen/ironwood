// data/music_tracks.js
// Music routing by map and UI mode.
// Files are loop-ready WAV placeholders (low-fi hybrid). Replace with composed stems later.
//
// IMPORTANT: Keep the keys stable so saves/builds remain compatible.
export const MUSIC_TRACKS = {
  // UI
  title: { file: "ironwood_town.wav", label: "Title / Ironwood Theme" },

  // Region themes
  ironwood_town: { file: "ironwood_town.wav", label: "Ironwood Town" },
  forest_camp: { file: "forest_camp.wav", label: "Forest Camp" },
  quarry: { file: "quarry.wav", label: "Quarry / Deep Cut" },
  junction: { file: "junction.wav", label: "Ironwood Junction" },
  river_road: { file: "river_road.wav", label: "River Road" },
  fishing_village: { file: "fishing_village.wav", label: "Fishing Village" },
  ursa_bluffs: { file: "ursa_bluffs.wav", label: "Ursa Bluffs" },
  mach_ranch: { file: "mach_ranch.wav", label: "Mach Ranch" },
  highlands: { file: "highlands.wav", label: "Highlands / Precipice Pass" },

  // Generic tension layer for encounters/combat
  combat: { file: "combat.wav", label: "Combat" },
};

// Map id -> track key
export const MAP_MUSIC = {
  // Ironwood + interiors
  ironwood_town: "ironwood_town",
  ironwood_caretaker_house: "ironwood_town",
  ironwood_general_store: "ironwood_town",
  ironwood_supply_shed: "ironwood_town",
  ironwood_inn: "ironwood_town",
  ironwood_town_hall: "ironwood_town",

  // Camps
  upper_forest_camp: "forest_camp",
  lower_forest_camp: "forest_camp",

  // Quarry / Deep Cut
  quarry_entrance: "quarry",
  quarry_floor1: "quarry",
  quarry_floor2: "quarry",
  quarry_boss_room: "quarry",

  // Chapter 1.5 route
  ironwood_junction: "junction",
  river_road: "river_road",
  fishing_village: "fishing_village",
  ursa_bluffs: "ursa_bluffs",
  mach_ranch: "mach_ranch",
  highlands: "highlands",
  precipice_pass: "highlands",
};
