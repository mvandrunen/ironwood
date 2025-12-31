// src/data/world_map.js
// Normalized coordinates (x,y) are relative to the world map image.
// Keep these data-only so regions can expand without touching engine code.

export const worldMap = {
  nodes: [
    // Left spine (north -> south)
    {
      id: "quarry_entrance",
      number: 3,
      label: "Quarry Entrance",
      x: 0.11,
      y: 0.18,
      summary: "First real danger. Combat objectives. Rescue miners and spark the rebuild questline.",
    },
    {
      id: "upper_forest_camp",
      number: 2,
      label: "Upper Forest Camp",
      x: 0.11,
      y: 0.26,
      summary: "First safe zone. NPC helpers, supplies, and tutorial beats.",
    },
    {
      id: "ironwood_town",
      number: 1,
      label: "Ironwood Town",
      x: 0.11,
      y: 0.34,
      summary: "Opening scene. Caretaker, exposition, and the quarry incident that kicks everything off.",
    },
    {
      id: "lower_forest_camp",
      number: 4,
      label: "Lower Forest Camp",
      x: 0.11,
      y: 0.50,
      summary: "Recovery point. Mentor reinforces purpose and points you onward.",
    },
    {
      id: "ironwood_junction",
      number: 5,
      label: "Ironwood Junction",
      x: 0.11,
      y: 0.64,
      summary: "Railroad frontier. Bandit pressure rises. First hints of Deacon Vale.",
    },

    // South / canyon
    {
      id: "ursa_bluffs",
      number: 8,
      label: "Ursa Bluffs",
      x: 0.30,
      y: 0.86,
      summary: "Canyon pass and major bandit boss. Clearing it re-opens trade routes.",
    },

    // Right spine (north -> south)
    {
      id: "precipice_pass",
      number: 11,
      label: "Precipice Pass",
      x: 0.67,
      y: 0.25,
      summary: "Hard passage. Ambush and danger. Once cleared, a shortcut unlocks for the return home lap.",
    },
    {
      id: "highlands",
      number: 10,
      label: "Highlands",
      x: 0.67,
      y: 0.39,
      summary: "Elevation and tension. Border disputes and pressure from Vale’s enforcers. Corruption arc begins.",
    },
    {
      id: "mach_ranch",
      number: 9,
      label: "Mach Ranch",
      x: 0.52,
      y: 0.55,
      summary: "Economic payoff. Ranchland allies. Foreshadows late-game bandits tied to Vale.",
    },
    {
      id: "river_road",
      number: 6,
      label: "River Road",
      x: 0.52,
      y: 0.69,
      summary: "Merchant protection. Convoy escort mechanics and long-travel western pacing.",
    },

    // Coast / maritime beat
    {
      id: "fishing_village",
      number: 7,
      label: "Fishing Village",
      x: 0.84,
      y: 0.78,
      summary: "Nautical substitution. Isolation, hunger, scarcity. Homeric echoes with a western skin.",
    },
  ],

  // These connections are intended to match the black pathways drawn on the map image.
  connections: [
    // Left spine
    { from: "quarry_entrance", to: "upper_forest_camp" },
    { from: "upper_forest_camp", to: "ironwood_town" },
    { from: "ironwood_town", to: "lower_forest_camp" },
    { from: "lower_forest_camp", to: "ironwood_junction" },
    { from: "ironwood_junction", to: "ursa_bluffs" },
    { from: "ironwood_junction", to: "river_road" },

    // South connector to right spine
    { from: "ursa_bluffs", to: "river_road" },

    // Right spine + branch
    { from: "precipice_pass", to: "highlands" },
    { from: "highlands", to: "mach_ranch" },
    { from: "mach_ranch", to: "river_road" },

    // Coast
    { from: "river_road", to: "fishing_village" },
  ],
};
