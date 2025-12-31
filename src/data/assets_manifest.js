// assets_manifest.js
// Central registry for swappable visual packs.
// v1.9.17: Introduced to decouple map semantics from specific atlas PNGs.

export const ASSET_MANIFEST = {
  tilesets: {
    // Base biome tilesets
    forest: "./assets/tilesets/tileset_forest.png",
    canyon: "./assets/tilesets/tileset_canyon.png",
    coast: "./assets/tilesets/tileset_coast.png",
    wood_light: "./assets/tilesets/tileset_wood_light.png",
    wood_dark: "./assets/tilesets/tileset_wood_dark.png",
  },

  // Buildings/props are rendered from a *separate* tileset (per-map override supported).
  // Default behavior is to mirror the biome tileset until a dedicated building pack is introduced.
  buildingTilesets: {
    forest: "./assets/tilesets/tileset_forest.png",
    canyon: "./assets/tilesets/tileset_canyon.png",
    coast: "./assets/tilesets/tileset_coast.png",
    wood_light: "./assets/tilesets/tileset_buildings_wood_light.png",
    wood_dark: "./assets/tilesets/tileset_buildings_wood_dark.png",
  },

  spritesheets: {
    player: "./assets/sprites/player.png",
    npcs: "./assets/sprites/npcs.png",
    enemies: "./assets/sprites/enemies.png",
    items: "./assets/sprites/items.png",
  },
};

export default ASSET_MANIFEST;
