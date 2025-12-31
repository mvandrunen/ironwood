// data/ambient_tracks.js
// Intentional, sparse ambient beds. Files are placeholder WAVs; replace with authentic field layers later.
export const AMBIENT_TRACKS = {
  wind_light: { file: "wind_light.wav", label: "Light Wind / Settlement Creak" },
  forest_insects: { file: "forest_insects.wav", label: "Forest Insects" },
  quarry_drip: { file: "quarry_drip.wav", label: "Quarry Drip / Rail Groan" },
  junction_rail: { file: "junction_rail.wav", label: "Rail Creak / Cart Rattle" },
  wind_heavy: { file: "wind_heavy.wav", label: "Heavy Wind (Exposed)" },
  water_lap: { file: "water_lap.wav", label: "Water Lap / Shore" },
  ranch_flies: { file: "ranch_flies.wav", label: "Flies / Fence Creak" },
  wind_thin: { file: "wind_thin.wav", label: "Thin Wind (Highlands)" },
  interior_silence: { file: "interior_silence.wav", label: "Interior Air / Near-Silence" },
};

export const MAP_AMBIENT = {
  // Ironwood + interiors
  ironwood_town: "wind_light",
  ironwood_caretaker_house: "interior_silence",
  ironwood_general_store: "interior_silence",
  ironwood_supply_shed: "interior_silence",
  ironwood_inn: "interior_silence",
  ironwood_town_hall: "interior_silence",

  // Camps + forest routes
  upper_forest_camp: "forest_insects",
  lower_forest_camp: "forest_insects",

  // Quarry
  quarry_entrance: "quarry_drip",
  quarry_floor1: "quarry_drip",
  quarry_floor2: "quarry_drip",
  quarry_boss_room: "quarry_drip",

  // Junction / trade
  ironwood_junction: "junction_rail",
  mach_ranch_gate: "junction_rail",

  // River Road / Fishing
  river_road: "forest_insects",
  fishing_village: "water_lap",

  // Ursa Bluffs
  ursa_bluffs: "wind_heavy",

  // Mach Ranch
  mach_ranch: "ranch_flies",

  // Highlands / Precipice
  highlands: "wind_thin",
  precipice_pass: "wind_thin",
};
