export const TILE_SIZE = 16;

let currentMap = null;

/**
 * Load a map JSON file by ID.
 * Expects files at: ./src/data/maps/<mapId>.json
 */
export function loadMap(mapId) {
  const url = `./src/data/maps/${mapId}.json`;

  return fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load map ${mapId}: ${res.status} ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      currentMap = data;
      return currentMap;
    })
    .catch((err) => {
      console.error("Map load error:", err);
      currentMap = null;
    });
}

export function getCurrentMap() {
  return currentMap;
}

export function isBlocked(x, y) {
  if (!currentMap) return true; // block movement until map is ready

  if (y < 0 || x < 0 || y >= currentMap.height || x >= currentMap.width) return true;
  const t = currentMap.tiles[y][x];
  return t === 1;
}

export function drawCurrentMap(ctx) {
  if (!currentMap) return;

  for (let y = 0; y < currentMap.height; y++) {
    for (let x = 0; x < currentMap.width; x++) {
      const t = currentMap.tiles[y][x];
      if (t === 0) ctx.fillStyle = "#3b5d3b";      // ground
      else if (t === 1) ctx.fillStyle = "#444";    // wall
      else if (t === 2) ctx.fillStyle = "#4b8f4b"; // tall grass / outskirts
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Optional: visually mark interactables (for now, as a light-colored tile)
  if (currentMap.interactables) {
    for (const it of currentMap.interactables) {
      ctx.fillStyle = "#6fa96f";
      ctx.fillRect(
        it.x * TILE_SIZE,
        it.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
}
