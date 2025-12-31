// Placeholder maps for future regions described in the world plan.
// These let us plug in new content later without changing engine wiring.

export const regionFuture = {
  ironwood_junction: {
    id: "ironwood_junction",
    label: "Ironwood Junction (Future)",
    width: 18,
    height: 16,
    spawnX: 8,
    spawnY: 8,
    tiles: createFilled(18, 16, 1),
    npcs: [],
    enemies: [],
    exits: [],
    triggers: []
  },
  river_road: {
    id: "river_road",
    label: "River Road (Future)",
    width: 18,
    height: 16,
    spawnX: 8,
    spawnY: 8,
    tiles: createFilled(18, 16, 1),
    npcs: [],
    enemies: [],
    exits: [],
    triggers: []
  },
  fishing_village: {
    id: "fishing_village",
    label: "Fishing Village (Future)",
    width: 18,
    height: 16,
    spawnX: 8,
    spawnY: 8,
    tiles: createFilled(18, 16, 1),
    npcs: [],
    enemies: [],
    exits: [],
    triggers: []
  },
  mach_ranch: {
    id: "mach_ranch",
    label: "Mach Ranch (Future)",
    width: 18,
    height: 16,
    spawnX: 8,
    spawnY: 8,
    tiles: createFilled(18, 16, 1),
    npcs: [],
    enemies: [],
    exits: [],
    triggers: []
  },
  highlands: {
    id: "highlands",
    label: "Highlands (Future)",
    width: 18,
    height: 16,
    spawnX: 8,
    spawnY: 8,
    tiles: createFilled(18, 16, 1),
    npcs: [],
    enemies: [],
    exits: [],
    triggers: []
  },
  precipice_pass: {
    id: "precipice_pass",
    label: "Precipice Pass (Future)",
    width: 18,
    height: 16,
    spawnX: 8,
    spawnY: 8,
    tiles: createFilled(18, 16, 1),
    npcs: [],
    enemies: [],
    exits: [],
    triggers: []
  },
  ursa_bluffs: {
    id: "ursa_bluffs",
    label: "Ursa Bluffs (Future)",
    width: 18,
    height: 16,
    spawnX: 8,
    spawnY: 8,
    tiles: createFilled(18, 16, 1),
    npcs: [],
    enemies: [],
    exits: [],
    triggers: []
  }
};

function createFilled(w, h, value) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      row.push(value);
    }
    rows.push(row);
  }
  return rows;
}
