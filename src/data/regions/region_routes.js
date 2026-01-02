// src/data/regions/region_routes.js
// Auto-generated travel routes between existing world-node locations.
// These maps are intentionally simple: readable trail + a small set of fightable enemies.

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

function routeMap({ id, label, fromId, toId, worldNodeId, biome, entrySide, exitSide, toSpawnX, toSpawnY, backSpawnX, backSpawnY }) {
  const w = 22;
  const h = 18;
  const midx = Math.floor(w / 2);
  const midy = Math.floor(h / 2);
  function exitCoord(side) {
    if (side === 'north') return { x: midx, y: 0 };
    if (side === 'south') return { x: midx, y: h - 1 };
    if (side === 'west')  return { x: 0, y: midy };
    if (side === 'east')  return { x: w - 1, y: midy };
    return { x: midx, y: h - 1 };
  }
  function entryCoord(side) {
    if (side === 'north') return { x: midx, y: 1 };
    if (side === 'south') return { x: midx, y: h - 2 };
    if (side === 'west')  return { x: 1, y: midy };
    if (side === 'east')  return { x: w - 2, y: midy };
    return { x: midx, y: h - 2 };
  }

  const entry = entryCoord(entrySide);
  const exitInner = entryCoord(exitSide);
  const backExit = exitCoord(entrySide);
  const fwdExit = exitCoord(exitSide);

  const tiles = createFilled(w, h, 0, (x, y) => {
    // Border walls
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return 1;


// v1.12.7: highlight exits/entries so borders are visually obvious
// Paint a small threshold + funnel at both ends (even though the true exit tile is on the border).
const isBackExit = (x === backExit.x && y === backExit.y);
const isFwdExit  = (x === fwdExit.x  && y === fwdExit.y);
const nearBack = (
  isBackExit ||
  (x === entry.x && y === entry.y) ||
  (Math.abs(x - entry.x) + Math.abs(y - entry.y) === 1 && (x === entry.x || y === entry.y))
);
const nearFwd = (
  isFwdExit ||
  (x === exitInner.x && y === exitInner.y) ||
  (Math.abs(x - exitInner.x) + Math.abs(y - exitInner.y) === 1 && (x === exitInner.x || y === exitInner.y))
);
if (nearBack || nearFwd) return 2;
    // Trail: entry -> center -> exit
    const cx = midx;
    const cy = midy;
    const onTrail = (
      (y === entry.y && ((x >= Math.min(entry.x, cx) && x <= Math.max(entry.x, cx)))) ||
      (x === cx && (y >= Math.min(entry.y, cy) && y <= Math.max(entry.y, cy))) ||
      (y === cy && (x >= Math.min(cx, exitInner.x) && x <= Math.max(cx, exitInner.x))) ||
      (x === exitInner.x && (y >= Math.min(cy, exitInner.y) && y <= Math.max(cy, exitInner.y)))
    );
    if (onTrail) return 2;

    // Forest richness pass (v1.16.3): add authored tree/bush clusters away from the trail,
    // while keeping the route readable and the entrances clean.
    if (biome === "forest" && !nearBack && !nearFwd) {
      const interior = (x > 1 && y > 1 && x < w - 2 && y < h - 2);
      const offTrail = !onTrail;
      if (interior && offTrail) {
        // sparse clusters
        if ((x % 5 === 0 && y % 4 === 0) || ((x + y) % 9 === 0 && x !== midx && y !== midy)) return 1;
      }
    }

    // Light obstruction pockets away from the trail (keeps fights from stacking on the entry tile)
    if ((x === 4 && y >= 4 && y <= 6) || (x === 16 && y >= 10 && y <= 12)) return 1;
    return 0;
  });

  return {
    id,
    label,
    worldNodeId,
    biome,
    width: w,
    height: h,
    spawnX: entry.x,
    spawnY: entry.y,
    tiles,
    npc: [],
    signs: [],
    enemies: [], // driven via SPAWNS_BY_MAP
    exits: [
      { x: backExit.x, y: backExit.y, to: fromId, spawnX: backSpawnX, spawnY: backSpawnY },
      { x: fwdExit.x,  y: fwdExit.y,  to: toId,   spawnX: toSpawnX,  spawnY: toSpawnY },
    ],
    triggers: [],
  };
}

export const routeMaps = {
  "route_fishing_village_to_river_road": routeMap({
    id: "route_fishing_village_to_river_road",
    label: "Route",
    fromId: "fishing_village",
    toId: "river_road",
    worldNodeId: "fishing_village",
    biome: "coast",
    entrySide: "east",
    exitSide: "west",
    toSpawnX: 20,
    toSpawnY: 14,
    backSpawnX: 1,
    backSpawnY: 10,
  }),
  "route_fishing_village_to_ursa_bluffs": routeMap({
    id: "route_fishing_village_to_ursa_bluffs",
    label: "Route",
    fromId: "fishing_village",
    toId: "ursa_bluffs",
    worldNodeId: "fishing_village",
    biome: "coast",
    entrySide: "north",
    exitSide: "south",
    toSpawnX: 20,
    toSpawnY: 8,
    backSpawnX: 20,
    backSpawnY: 19,
  }),
  "route_highlands_to_mach_ranch": routeMap({
    id: "route_highlands_to_mach_ranch",
    label: "Route",
    fromId: "highlands",
    toId: "mach_ranch",
    worldNodeId: "highlands",
    biome: "canyon",
    entrySide: "north",
    exitSide: "south",
    toSpawnX: 11,
    toSpawnY: 1,
    backSpawnX: 11,
    backSpawnY: 16,
  }),
  "route_highlands_to_precipice_pass": routeMap({
    id: "route_highlands_to_precipice_pass",
    label: "Route",
    fromId: "highlands",
    toId: "precipice_pass",
    worldNodeId: "highlands",
    biome: "canyon",
    entrySide: "south",
    exitSide: "north",
    toSpawnX: 11,
    toSpawnY: 16,
    backSpawnX: 11,
    backSpawnY: 1,
  }),
  "route_ironwood_junction_to_lower_forest_camp": routeMap({
    id: "route_ironwood_junction_to_lower_forest_camp",
    label: "Route",
    fromId: "ironwood_junction",
    toId: "lower_forest_camp",
    worldNodeId: "ironwood_junction",
    biome: "forest",
    entrySide: "south",
    exitSide: "north",
    toSpawnX: 9,
    toSpawnY: 14,
    backSpawnX: 9,
    backSpawnY: 2,
  }),
  "route_ironwood_junction_to_mach_ranch": routeMap({
    id: "route_ironwood_junction_to_mach_ranch",
    label: "Route",
    fromId: "ironwood_junction",
    toId: "mach_ranch",
    worldNodeId: "ironwood_junction",
    biome: "forest",
    entrySide: "west",
    exitSide: "east",
    toSpawnX: 1,
    toSpawnY: 8,
    backSpawnX: 20,
    backSpawnY: 8,
  }),
  "route_ironwood_junction_to_river_road": routeMap({
    id: "route_ironwood_junction_to_river_road",
    label: "Route",
    fromId: "ironwood_junction",
    toId: "river_road",
    worldNodeId: "ironwood_junction",
    biome: "forest",
    entrySide: "west",
    exitSide: "east",
    toSpawnX: 1,
    toSpawnY: 12,
    backSpawnX: 20,
    backSpawnY: 14,
  }),
  "route_ironwood_town_to_lower_forest_camp": (() => {
    const m = routeMap({
    id: "route_ironwood_town_to_lower_forest_camp",
    label: "Route",
    fromId: "ironwood_town",
    toId: "lower_forest_camp",
    worldNodeId: "ironwood_town",
    biome: "forest",
    entrySide: "north",
    exitSide: "south",
    toSpawnX: 7,
    toSpawnY: 2,
    backSpawnX: 7,
    backSpawnY: 22,
  });
    m.triggers = [
      { type: "sign", x: m.spawnX, y: m.spawnY, title: "Trail Marker", text: "Back: Ironwood Town" },
      { type: "sign", x: (m.exits && m.exits[1] ? (m.exits[1].x === 0 ? 1 : (m.exits[1].x === m.width - 1 ? m.width - 2 : m.exits[1].x)) : m.spawnX),
         y: (m.exits && m.exits[1] ? (m.exits[1].y === 0 ? 1 : (m.exits[1].y === m.height - 1 ? m.height - 2 : m.exits[1].y)) : m.spawnY),
         title: "Trail Marker", text: "Ahead: Forest Camp (South)" },
    ];
    return m;
  })(),

  "route_ironwood_town_to_upper_forest_camp": (() => {
    const m = routeMap({
    id: "route_ironwood_town_to_upper_forest_camp",
    label: "Route",
    fromId: "ironwood_town",
    toId: "upper_forest_camp",
    worldNodeId: "ironwood_town",
    biome: "forest",
    entrySide: "south",
    exitSide: "north",
    toSpawnX: 9,
    toSpawnY: 12,
    backSpawnX: 15,
    backSpawnY: 2,
  });
    m.triggers = [
      { type: "sign", x: m.spawnX, y: m.spawnY, title: "Trail Marker", text: "Back: Ironwood Town" },
      { type: "sign", x: (m.exits && m.exits[1] ? (m.exits[1].x === 0 ? 1 : (m.exits[1].x === m.width - 1 ? m.width - 2 : m.exits[1].x)) : m.spawnX),
         y: (m.exits && m.exits[1] ? (m.exits[1].y === 0 ? 1 : (m.exits[1].y === m.height - 1 ? m.height - 2 : m.exits[1].y)) : m.spawnY),
         title: "Trail Marker", text: "Ahead: Forest Camp (North)" },
    ];
    return m;
  })(),

  "route_lower_forest_camp_to_ironwood_junction": routeMap({
    id: "route_lower_forest_camp_to_ironwood_junction",
    label: "Route",
    fromId: "lower_forest_camp",
    toId: "ironwood_junction",
    worldNodeId: "lower_forest_camp",
    biome: "forest",
    entrySide: "north",
    exitSide: "south",
    toSpawnX: 9,
    toSpawnY: 2,
    backSpawnX: 9,
    backSpawnY: 14,
  }),
  "route_lower_forest_camp_to_ironwood_town": (() => {
    const m = routeMap({
    id: "route_lower_forest_camp_to_ironwood_town",
    label: "Route",
    fromId: "lower_forest_camp",
    toId: "ironwood_town",
    worldNodeId: "lower_forest_camp",
    biome: "forest",
    entrySide: "south",
    exitSide: "north",
    toSpawnX: 7,
    toSpawnY: 22,
    backSpawnX: 7,
    backSpawnY: 2,
  });
    m.triggers = [
      { type: "sign", x: m.spawnX, y: m.spawnY, title: "Trail Marker", text: "Back: Forest Camp (South)" },
      { type: "sign", x: (m.exits && m.exits[1] ? (m.exits[1].x === 0 ? 1 : (m.exits[1].x === m.width - 1 ? m.width - 2 : m.exits[1].x)) : m.spawnX),
         y: (m.exits && m.exits[1] ? (m.exits[1].y === 0 ? 1 : (m.exits[1].y === m.height - 1 ? m.height - 2 : m.exits[1].y)) : m.spawnY),
         title: "Trail Marker", text: "Ahead: Ironwood Town" },
    ];
    return m;
  })(),

  "route_mach_ranch_to_highlands": routeMap({
    id: "route_mach_ranch_to_highlands",
    label: "Route",
    fromId: "mach_ranch",
    toId: "highlands",
    worldNodeId: "mach_ranch",
    biome: "coast",
    entrySide: "south",
    exitSide: "north",
    toSpawnX: 11,
    toSpawnY: 16,
    backSpawnX: 11,
    backSpawnY: 1,
  }),
  "route_mach_ranch_to_ironwood_junction": routeMap({
    id: "route_mach_ranch_to_ironwood_junction",
    label: "Route",
    fromId: "mach_ranch",
    toId: "ironwood_junction",
    worldNodeId: "mach_ranch",
    biome: "coast",
    entrySide: "east",
    exitSide: "west",
    toSpawnX: 20,
    toSpawnY: 8,
    backSpawnX: 1,
    backSpawnY: 8,
  }),
  "route_precipice_pass_to_highlands": routeMap({
    id: "route_precipice_pass_to_highlands",
    label: "Route",
    fromId: "precipice_pass",
    toId: "highlands",
    worldNodeId: "precipice_pass",
    biome: "canyon",
    entrySide: "north",
    exitSide: "south",
    toSpawnX: 11,
    toSpawnY: 1,
    backSpawnX: 11,
    backSpawnY: 16,
  }),
  "route_quarry_entrance_to_upper_forest_camp": routeMap({
    id: "route_quarry_entrance_to_upper_forest_camp",
    label: "Route",
    fromId: "quarry_entrance",
    toId: "upper_forest_camp",
    worldNodeId: "quarry_entrance",
    biome: "canyon",
    entrySide: "west",
    exitSide: "east",
    toSpawnX: 2,
    toSpawnY: 7,
    backSpawnX: 15,
    backSpawnY: 8,
  }),
  "route_river_road_to_fishing_village": routeMap({
    id: "route_river_road_to_fishing_village",
    label: "Route",
    fromId: "river_road",
    toId: "fishing_village",
    worldNodeId: "river_road",
    biome: "coast",
    entrySide: "west",
    exitSide: "east",
    toSpawnX: 1,
    toSpawnY: 10,
    backSpawnX: 20,
    backSpawnY: 12,
  }),
  "route_river_road_to_ironwood_junction": routeMap({
    id: "route_river_road_to_ironwood_junction",
    label: "Route",
    fromId: "river_road",
    toId: "ironwood_junction",
    worldNodeId: "river_road",
    biome: "coast",
    entrySide: "east",
    exitSide: "west",
    toSpawnX: 20,
    toSpawnY: 14,
    backSpawnX: 1,
    backSpawnY: 12,
  }),
  "route_upper_forest_camp_to_ironwood_town": (() => {
    const m = routeMap({
    id: "route_upper_forest_camp_to_ironwood_town",
    label: "Route",
    fromId: "upper_forest_camp",
    toId: "ironwood_town",
    worldNodeId: "upper_forest_camp",
    biome: "forest",
    entrySide: "north",
    exitSide: "south",
    toSpawnX: 15,
    toSpawnY: 2,
    backSpawnX: 9,
    backSpawnY: 12,
  });
    m.triggers = [
      { type: "sign", x: m.spawnX, y: m.spawnY, title: "Trail Marker", text: "Back: Forest Camp (North)" },
      { type: "sign", x: (m.exits && m.exits[1] ? (m.exits[1].x === 0 ? 1 : (m.exits[1].x === m.width - 1 ? m.width - 2 : m.exits[1].x)) : m.spawnX),
         y: (m.exits && m.exits[1] ? (m.exits[1].y === 0 ? 1 : (m.exits[1].y === m.height - 1 ? m.height - 2 : m.exits[1].y)) : m.spawnY),
         title: "Trail Marker", text: "Ahead: Ironwood Town" },
    ];
    return m;
  })(),

  "route_upper_forest_camp_to_quarry_entrance": routeMap({
    id: "route_upper_forest_camp_to_quarry_entrance",
    label: "Route",
    fromId: "upper_forest_camp",
    toId: "quarry_entrance",
    worldNodeId: "upper_forest_camp",
    biome: "forest",
    entrySide: "east",
    exitSide: "west",
    toSpawnX: 15,
    toSpawnY: 8,
    backSpawnX: 2,
    backSpawnY: 7,
  }),
  "route_ursa_bluffs_to_fishing_village": routeMap({
    id: "route_ursa_bluffs_to_fishing_village",
    label: "Route",
    fromId: "ursa_bluffs",
    toId: "fishing_village",
    worldNodeId: "ursa_bluffs",
    biome: "canyon",
    entrySide: "west",
    exitSide: "east",
    toSpawnX: 20,
    toSpawnY: 19,
    backSpawnX: 20,
    backSpawnY: 8,
  }),
  "route_ursa_bluffs_to_ironwood_junction": routeMap({
    id: "route_ursa_bluffs_to_ironwood_junction",
    label: "Route",
    fromId: "ursa_bluffs",
    toId: "ironwood_junction",
    worldNodeId: "ursa_bluffs",
    biome: "canyon",
    entrySide: "south",
    exitSide: "center",
    toSpawnX: 20,
    toSpawnY: 14,
    backSpawnX: 2,
    backSpawnY: 4,
  }),
};
