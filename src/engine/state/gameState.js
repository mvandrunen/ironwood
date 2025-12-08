export const gameState = {
  player: {
    x: 2,
    y: 2,
    mapId: "ironwood_town",
    hp: 20,
    maxHp: 20,
    gold: 0,
    inventory: [],
    equipment: {},
    stats: { level: 1, xp: 0 }
  },

  town: {
    level: 1,
    buildings: {},
    population: 5,
    reputation: 0
  },

  quests: {
    active: [],
    completed: [],
    flags: {}
  },

  scores: {
    security: 0,
    prosperity: 0,
    discovery: 0,
    community: 0
  },

  meta: {
    timePlayedSeconds: 0,
    saveSlot: 1
  }
};
