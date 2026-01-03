// core.js
import { maps } from "../data/maps.js";
import { MusicManager } from "./music.js";
import { AmbientManager } from "./ambient.js";
import { SfxManager } from "./sfx.js";
import { RETURN_PRESSURE_CONFIG } from "../data/return_pressure_config.js";
import { applyIronwoodReactivity } from "../data/ironwood_state.js";
import { applyChapter1Reactivity, ensureChapter1Flags } from "../data/chapter1_state.js";
import { DialogueSystem } from "./dialogue.js";
import { validateAllContent } from "./content_validation.js";
import { DIALOGUE_NODES } from "../data/dialogue_nodes.js";
import { worldMap } from "../data/world_map.js";
import { ASSET_MANIFEST } from "../data/assets_manifest.js";
import { QUEST_DEFS, allObjectivesComplete } from "../data/quests.js";
import { ENEMY_ARCHETYPES, SPAWNS_BY_MAP } from "../data/enemies.js";
import {
  ensureReturnPressureState,
  onRegionTraverse,
  applyReturnPressureReactivity,
  getReturnPressureTier,
} from "../systems/return_pressure.js";

// Viewport settings
export const VIEW_TILES_W = 16;
export const VIEW_TILES_H = 12;
export const TILE_SIZE = 32;

export const BUILD_VERSION = "v1.17.10-syntaxfix";


const ITEM_ICON_INDEX = {
  field_tonic: 0,
  quarry_token: 1,
  pickaxe: 10,
  pay_script: 3,
  bluff_waystone: 4,
  rail_pass_stub: 5,
  salted_fish: 6,
  rope_coil: 7,
  mach_ranch_accord: 8,
  knife: 9,
  pistol: 2,
};

function getItemIconIndex(id) {
  const key = (id || "").toLowerCase();
  if (ITEM_ICON_INDEX[key] != null) return ITEM_ICON_INDEX[key];
  // Generic buckets
  if (key.includes("accord") || key.includes("ledger") || key.includes("charter") || key.includes("dossier")) return 8;
  if (key.includes("pass") || key.includes("stub") || key.includes("ticket")) return 5;
  if (key.includes("rope") || key.includes("coil")) return 7;
  if (key.includes("fish") || key.includes("ration") || key.includes("tonic") || key.includes("food")) return 6;
  // Fallback generic icon
  return 10;
}


const SAVE_VERSION = 2;

// Product shell: lightweight, scrollable credits (no gameplay impact)
const CREDITS_LINES = [
  "IRONWOOD CROSSING",
  "",
  `Build ${BUILD_VERSION}`,
  "",
  "Design & Development:",
  "Martin van Drunen",
  "",
  "Narrative Framework:",
  "Grounded frontier odyssey (no magic)",
  "",
  "Tools & Technology:",
  "HTML5 Canvas",
  "JavaScript (ES Modules)",
  "",
  "Special Thanks:",
  "Playtesters + everyone who gave notes",
  "",
  "Report bugs:",
  "Include build version + steps to reproduce",
];
function createInitialState() {
  return {
    currentMapId: "ironwood_town",
    // Combat baseline: start at 12 HP.
    player: { x: 6, y: 8, hp: 12, maxHp: 12, facing: "down", iFramesMs: 0 },
    camera: { x: 0, y: 0, width: VIEW_TILES_W, height: VIEW_TILES_H },
    keys: {},
    dialogue: new DialogueSystem(),
    message: "",
    flags: ensureChapter1Flags({ quarryCleared: false }),

    // Map trigger persistence (used for one-shot environmental cues)
    triggerOnce: {},

    // Persist item pickups so items stay gone after collection
    pickedItemKeys: {},

    // Lightweight toast feedback (no meters, no warnings)
    toast: { text: "", ms: 0 },

    // Hidden Return Pressure system (no UI, no timers)
    returnPressure: ensureReturnPressureState(null),
    hitFlash: 0,

    inventory: [],
    inventoryOpen: false,
    inventoryIndex: 0,

    // Equipped quick-slots (Link's Awakening–style): item ids assigned to Z / X
    equipZ: null,
    equipX: null,

    // World map overlay
    worldMapOpen: false,
    worldMapCursor: 0,
    discoveredNodes: { ironwood_town: true },

    // Quest system (progress only; definitions live in data/quests.js)
    quest: { activeId: null, logOpen: false, index: 0, progress: {} },

    // Lightweight play stats for product shell metadata
    stats: { stepCount: 0, riverRoadSteps: 0 },

    // Last known safe location to respawn after KO (persisted)
    lastSafe: { mapId: "ironwood_town", x: 6, y: 9 },

    // Enemies are stored per-map and persisted.
    // NOTE: Projectiles are runtime-only and intentionally not saved.
    enemiesByMap: {},

    // Runtime-only projectiles (not saved)
    projectiles: [],

    // Product shell UI state
    ui: {
      screen: "title", // title | play | pause | settings | credits | confirm_new
      titleIndex: 0,
      pauseIndex: 0,
      confirmIndex: 0,
      settingsIndex: 0,
      settingsPage: "main", // main | controls
      settingsReturn: "title", // title | pause
      creditsScroll: 0,
    },

    // Product settings (persisted)
    settings: {
      textSpeed: "normal", // slow | normal | fast
      musicVolume: 0.75,
      sfxVolume: 0.85,
    },
  };
}



// ----- Inventory UI helpers (presentation-only; save schema unchanged) -----
const INVENTORY_CATEGORY_ORDER = ["Tools", "Weapons", "Supplies", "Papers"];
const INVENTORY_KIND_TO_CATEGORY = {
  tool: "Tools",
  weapon: "Weapons",
  consumable: "Supplies",
  supply: "Supplies",
  loot: "Supplies",
  token: "Papers",
  key: "Papers",
  paper: "Papers",
  upgrade: "Supplies",
};

const INVENTORY_ID_META = {
  heart_container: {
    category: "Supplies",
    kind: "upgrade",
    name: "Heart",
    description: "Increases maximum health.",
  },
  pistol: {
    category: "Weapons",
    kind: "weapon",
    name: "Pistol",
    description: "A worn sidearm. Press X to shoot (requires bullets).",
  },
  rifle: {
    category: "Weapons",
    kind: "weapon",
    name: "Rifle",
    description: "Long gun with reach. Press X to shoot (requires bullets).",
  },
  saber: {
    category: "Weapons",
    kind: "weapon",
    name: "Saber",
    description: "A cavalry blade. Improves melee damage.",
  },
  knife: {
    category: "Weapons",
    kind: "weapon",
    name: "Knife",
    description: "A simple working knife. Improves melee damage.",
  },
  bullet: {
    category: "Supplies",
    kind: "consumable",
    name: "Bullet",
    description: "Ammo for firearms.",
  },

  pickaxe: {
    category: "Tools",
    description: "Miner’s pick. Breaks rock, pries boards. Heavy enough to end an argument.",
  },
  pay_script: {
    category: "Papers",
    description: "Stamped pay paper the crews accept. Proof you did the work—useful to the right hands.",
  },
  salted_fish: {
    category: "Supplies",
    description: "Salted and wrapped. Keeps for the road. A small comfort that doesn’t solve anything.",
  },
  mach_ranch_accord: {
    category: "Papers",
    description: "A signed line in Mach Ranch’s ledger. Proof you kept to terms—opens mouths, not doors.",
  },

small_coin: {
  category: "Supplies",
  description: "A small coin. Enough to buy a bite, or three rounds if you’re lucky.",
},
coin_bundle: {
  category: "Supplies",
  description: "A tight bundle of coin—saved, not spent lightly.",
},
ammo_scrap: {
  category: "Supplies",
  description: "Misfit cartridges and loose lead. Useful with the right hands.",
},
bullet: {
  category: "Supplies",
  description: "A single round. Kept dry. Counted twice.",
},
};

function _invCat(item) {
  if (!item) return "Supplies";
  const meta = INVENTORY_ID_META[item.id];
  if (meta?.category) return meta.category;
  const k = String(item.kind || "").toLowerCase();
  return INVENTORY_KIND_TO_CATEGORY[k] || "Supplies";
}

function _invCatAbbr(cat) {
  if (cat === "Tools") return "T";
  if (cat === "Weapons") return "W";
  if (cat === "Supplies") return "S";
  if (cat === "Papers") return "P";
  return "?";
}

function _invDesc(item) {
  if (!item) return "";
  const existing = String(item.description || "").trim();
  if (existing) return existing;
  const meta = INVENTORY_ID_META[item.id];
  if (meta?.description) return meta.description;
  // Fallback: short, grounded, functional
  const name = String(item.name || item.id || "Item").trim();
  const cat = _invCat(item);
  if (cat === "Tools") return `${name}. A working tool. It changes what you can do—quietly.`;
  if (cat === "Weapons") return `${name}. Carried for necessity, not pride.`;
  if (cat === "Papers") return `${name}. A paper trail. It opens talk and makes claims harder to deny.`;
  return `${name}. Kept for the road.`;
}

function buildInventoryDisplay(inventory) {
  const inv = Array.isArray(inventory) ? inventory : [];
  const enriched = inv.map((item, invIndex) => {
    const cat = _invCat(item);
    return {
      invIndex,
      item,
      cat,
      abbr: _invCatAbbr(cat),
      name: String(item?.name || item?.id || "Item"),
      desc: _invDesc(item),
    };
  });

  const order = new Map(INVENTORY_CATEGORY_ORDER.map((c, i) => [c, i]));
  enriched.sort((a, b) => {
    const ao = order.has(a.cat) ? order.get(a.cat) : 999;
    const bo = order.has(b.cat) ? order.get(b.cat) : 999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });

  return {
    items: enriched,
    count: enriched.length,
  };
}

// Items that can be assigned to Z/X live on the RIGHT panel of the inventory.
// Rule of thumb: active-use tools/weapons + select consumables. Papers/keys/coins/ammo stay LEFT.
function isQuickAssignableItem(item) {
  if (!item) return false;
  const id = String(item.id || "").toLowerCase();

  // Explicit non-assignables (economy, ammo, tokens, papers)
  const deny = new Set([
    "small_coin","coin_bundle","ammo_scrap","bullet","bullets",
    "quarry_token","pay_script","rail_pass_stub","bluff_waystone","mach_ranch_accord",
    "heart_container",
    "field_tonic",
  ]);
  if (deny.has(id)) return false;

  const kind = String(item.kind || "").toLowerCase();
  if (kind === "weapon" || kind === "tool") return true;

  // Healing / usable supplies (conservative)
  if (kind === "healing" || kind === "consumable") return true;
  if (id.includes("tonic") || id.includes("potion") || id.includes("fish")) return true;

  return false;
}

// Inventory panel model for the Link's Awakening–style split:
// LEFT = non-assignables, RIGHT = quick-assignables.
// Also provides a slot map for the 4x8 grid.
function buildInventoryPanels(inventory) {
  const display = buildInventoryDisplay(inventory);
  const all = display.items || [];

  const right = [];
  const left = [];
  for (const it of all) {
    if (isQuickAssignableItem(it.item)) right.push(it);
    else left.push(it);
  }

  const GRID_ROWS = 4;
  const GRID_COLS = 8;
  const GRID_SLOTS = GRID_ROWS * GRID_COLS;

  // Slot indices by side in row-major grid:
  // left: cols 0..3, right: cols 4..7
  const leftSlots = [];
  const rightSlots = [];
  for (let slot = 0; slot < GRID_SLOTS; slot++) {
    const col = slot % GRID_COLS;
    if (col < 4) leftSlots.push(slot);
    else rightSlots.push(slot);
  }

  const slotMap = Array(GRID_SLOTS).fill(null);
  for (let i = 0; i < leftSlots.length; i++) slotMap[leftSlots[i]] = left[i] || null;
  for (let i = 0; i < rightSlots.length; i++) slotMap[rightSlots[i]] = right[i] || null;

  return {
    display,
    left,
    right,
    slotMap,
    GRID_ROWS,
    GRID_COLS,
    GRID_SLOTS,
    itemAt(slot) {
      const s = slot | 0;
      if (s < 0 || s >= GRID_SLOTS) return null;
      return slotMap[s] || null;
    },
  };
}

function _wrapLines(raw, maxW, ctx) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  const words = text.split(" ");
  const out = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW) {
      if (cur) out.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    // Ensure canvas matches our viewport so it doesn't look zoomed out
    this.canvas.width = VIEW_TILES_W * TILE_SIZE;
    this.canvas.height = VIEW_TILES_H * TILE_SIZE;
    this.state = createInitialState();

    // Persistence + runtime safety
    this._runtime = {
      buildVersion: BUILD_VERSION,
      saveKey: "ironwood_save_slot_1",
      selectedSlot: 1,
      selectedSlotKey: "ironwood_selected_slot_v1",
      legacySaveKey: "ironwood_save_v1",
      settingsKey: "ironwood_settings_v1",

      // Developer-only runtime flags (not persisted)
      debugEnabled: false,
      debugOverlay: false,

      // Content validation (run once at boot)
      contentValidated: false,
      contentValidationErrors: null,

      lastValidatedMapId: null,
      mapError: null,
      fatalError: null,
      autosaveMs: 0,
      lastSaveHash: "",
      // Performance: prerendered tile layers per map to reduce stutter.
      tileLayerCache: {},
      tileLayerCacheReady: {},
    };

    // Load and apply persisted settings before the first render.
    this._loadSettings();

    // Product shell: slot selection + legacy save migration
    this.setActiveSlot(this._getSelectedSlotFromStorage());
    this._migrateLegacySaveToSlot1IfNeeded();
// Assets (all visual; no gameplay impact)
    this.assets = {
      worldMapImage: new Image(),

      // Tilesets by biome
      tilesets: {
        forest: new Image(),
        canyon: new Image(),
        coast: new Image(),
      },

      // Building/prop tilesets (swappable packs). Default mirrors biome tilesets.
      buildingTilesets: {
        forest: new Image(),
        canyon: new Image(),
        coast: new Image(),
      },

      // Sprites
      sprites: {
        player: new Image(),
        npcs: new Image(),
        items: new Image(),
        enemies: new Image(),
      },

      // UI
      uiPanel: new Image(),
      placeholder: new Image(),
    };

    // Robust loading + fallbacks (prevents blank screens on missing assets)
    const safeLoad = (img, src, fallbackSrc) => {
      img.onerror = () => {
        // Avoid infinite onerror loops
        img.onerror = null;
        img.src = fallbackSrc;
      };
      img.src = src;
    };

    safeLoad(this.assets.placeholder, "./assets/ui/placeholder_32.png", "./assets/world_map_placeholder.png");
    safeLoad(this.assets.uiPanel, "./assets/ui/panel_32.png", this.assets.placeholder.src);
    safeLoad(this.assets.worldMapImage, "./assets/world_map_ironwood.png", "./assets/world_map_placeholder.png");

        // Tilesets (base + buildings)
    for (const [id, src] of Object.entries(ASSET_MANIFEST.tilesets)) {
      if (!this.assets.tilesets[id]) this.assets.tilesets[id] = new Image();
      safeLoad(this.assets.tilesets[id], src, this.assets.placeholder.src);
    }
    for (const [id, src] of Object.entries(ASSET_MANIFEST.buildingTilesets)) {
      if (!this.assets.buildingTilesets[id]) this.assets.buildingTilesets[id] = new Image();
      safeLoad(this.assets.buildingTilesets[id], src, this.assets.placeholder.src);
    }

        // Spritesheets
    for (const [id, src] of Object.entries(ASSET_MANIFEST.spritesheets)) {
      if (!this.assets.sprites[id]) this.assets.sprites[id] = new Image();
      safeLoad(this.assets.sprites[id], src, this.assets.placeholder.src);
    }

    // Provide UI skin to dialogue system
    this.state.dialogue.setSkin({ panel: this.assets.uiPanel, placeholder: this.assets.placeholder });

    // Apply text speed to dialogue typewriter (no UI meters; purely readability/feel)
    this.state.dialogue.setTextSpeed(this.state.settings?.textSpeed || "normal");

    this.lastTime = 0;
    this._moveCooldown = 0;

    // Minimal SFX (WebAudio beeps; no asset dependency)
    this._audio = {
      ctx: null,
      unlocked: false,
    };

    // Music (HTMLAudio loops; crossfades; routed by map + UI screen)
    this._music = new MusicManager({
      basePath: "assets/music/",
      initialVolume: this.state.settings?.musicVolume ?? 0.75,
    });

    
    // Audio Identity Pass: remove background music entirely (keep SFX/ambience).
    this._music.setEnabled(false);
// Ambient beds (HTMLAudio loops; crossfades; routed by map)
    this._ambient = new AmbientManager({
      basePath: "assets/ambience/",
      initialVolume: (this.state.settings?.sfxVolume ?? 0.85) * 0.7,
    });

    // Asset SFX (UI/steps/weapons)
    this._sfxAssets = new SfxManager({
      basePath: "assets/sfx/",
      initialVolume: this.state.settings?.sfxVolume ?? 0.85,
    });

    // Track UI state changes for subtle UI SFX
    this._lastUIScreen = this.state.ui?.screen || "title";
    this._lastInventoryIndex = this.state.inventoryIndex || 0;


    // Product shell: do not auto-enter gameplay on boot.
    // Continue/New Game will load or initialize state explicitly.
    // Post-load hygiene (handles content edits between builds)
    this._ensureMapValidated(true);
    this._validateContentOnce();
    this._resolvePlayerPosition();
    this._recordSafeIfApplicable(this.state.currentMapId);
    this.syncWorldMapCursorToCurrent();

    // Seed enemies for the loaded/initial map (Quarry-only spawns).
    this.ensureEnemiesForMap(this.state.currentMapId);

    // Ensure quest state exists even on fresh saves
    if (!this.state.quest) {
      this.state.quest = { activeId: null, logOpen: false, index: 0, progress: {} };
    }


    // Surface registry-level errors (e.g., duplicate ids) immediately.
    if (maps && maps.__registryErrors?.duplicates?.length) {
      const list = maps.__registryErrors.duplicates
        .map(d => `${d.id} (${(d.sources || []).join(" vs ")})`)
        .join("\n");
      console.error(
        "[MapRegistry] Duplicate map ids detected at startup. Fix these ids to prevent silent overwrites:\n" +
          list
      );
      // Non-fatal: allow the game to run while you fix content.
      this.state.message = "Map registry has duplicate ids (see console).";
    }

    // Validate current map immediately
    this._ensureMapValidated(true);
  }

  
// ----- Product shell helpers -----
_getSlotKey(slot) {
  return `ironwood_save_slot_${slot}`;
}

_getSelectedSlotFromStorage() {
  try {
    const raw = localStorage.getItem(this._runtime.selectedSlotKey);
    const n = parseInt(raw, 10);
    if (n === 1 || n === 2 || n === 3) return n;
  } catch {}
  return 1;
}

_setSelectedSlotToStorage(slot) {
  try { localStorage.setItem(this._runtime.selectedSlotKey, String(slot)); } catch {}
}

// ----- Settings persistence -----
_defaultSettings() {
  return {
    textSpeed: "normal", // slow | normal | fast
    musicVolume: 0.75, // 0.0–1.0
    sfxVolume: 0.85,   // 0.0–1.0
  };
}

_loadSettings() {
  const defaults = this._defaultSettings();
  let loaded = null;
  try {
    const raw = localStorage.getItem(this._runtime.settingsKey);
    if (raw) loaded = JSON.parse(raw);
  } catch {}
  const merged = { ...defaults, ...(loaded && typeof loaded === "object" ? loaded : {}) };
  this.state.settings = { ...defaults, ...merged };
  this._applySettings();
}

_saveSettings() {
  try {
    localStorage.setItem(this._runtime.settingsKey, JSON.stringify(this.state.settings || this._defaultSettings()));
  } catch {}
}

_applySettings() {
  // Dialogue text speed is the only currently active consumer.
  const spd = this.state.settings?.textSpeed || "normal";
  if (this.state.dialogue?.setTextSpeed) this.state.dialogue.setTextSpeed(spd);
  // Apply persisted audio settings.
  if (this._music) this._music.setVolume(this.state?.settings?.musicVolume ?? 0.75);
  if (this._sfxAssets) this._sfxAssets.setVolume(this.state?.settings?.sfxVolume ?? 0.85);
  if (this._ambient) this._ambient.setVolume((this.state?.settings?.sfxVolume ?? 0.85) * 0.7);
}

setActiveSlot(slot) {
  const s = slot === 2 ? 2 : slot === 3 ? 3 : 1;
  this._runtime.selectedSlot = s;
  this._runtime.saveKey = this._getSlotKey(s);
  this._setSelectedSlotToStorage(s);
}

_migrateLegacySaveToSlot1IfNeeded() {
  try {
    const slot1Key = this._getSlotKey(1);
    const slot1 = localStorage.getItem(slot1Key);
    const legacy = localStorage.getItem(this._runtime.legacySaveKey);
    if (!slot1 && legacy) {
      // Copy legacy single-slot save into Slot 1 without destroying the original.
      localStorage.setItem(slot1Key, legacy);
    }
  } catch {}
}

_readSlotRaw(slot) {
  try {
    const key = this._getSlotKey(slot);
    const raw = localStorage.getItem(key);
    if (raw) return raw;
    // Legacy fallback: slot 1 reads old key if present.
    if (slot === 1) {
      const legacy = localStorage.getItem(this._runtime.legacySaveKey);
      if (legacy) return legacy;
    }
  } catch {}
  return null;
}

_readSlotMeta(slot) {
  const raw = this._readSlotRaw(slot);
  if (!raw) return { exists: false };
  try {
    const data = JSON.parse(raw);
    const migrated = this.migrateSave(data);
    if (!migrated) return { exists: true, corrupted: true };

    const mapId = migrated.currentMapId || "unknown";
    const questId = migrated.meta?.questId ?? migrated.quest?.activeId ?? null;
    const stepCount = migrated.meta?.stepCount ?? null;
    const lastPlayed = migrated.meta?.lastPlayed ?? null;
    return { exists: true, mapId, questId, stepCount, lastPlayed };
  } catch {
    return { exists: true, corrupted: true };
  }
}

_formatSlotLine(meta) {
  if (!meta.exists) return "Empty";
  if (meta.corrupted) return "Corrupted";
  const mapLabel = maps?.[meta.mapId]?.label || meta.mapId || "Unknown";
  const questLabel = meta.questId && QUEST_DEFS?.[meta.questId]?.title ? QUEST_DEFS[meta.questId].title : "—";
  let last = "—";
  if (typeof meta.lastPlayed === "number") {
    try { last = new Date(meta.lastPlayed).toLocaleString(); } catch {}
  }
  const steps = (typeof meta.stepCount === "number") ? `Steps: ${meta.stepCount}` : "Steps: —";
  return `${mapLabel} | ${steps} | ${last} | ${questLabel}`;
}

hasSave(slot = null) {
  try {
    const s = slot ? slot : this._runtime.selectedSlot;
    const m = this._readSlotMeta(s);
    return !!m.exists && !m.corrupted;
  } catch {
    return false;
  }
}

// A save is only "continuable" once the player has taken at least one step.
// This prevents showing Continue immediately after starting a new game.
hasContinuableSave(slot = null) {
  try {
    const s = slot ? slot : this._runtime.selectedSlot;
    const m = this._readSlotMeta(s);
    return !!m.exists && !m.corrupted && (typeof m.stepCount === "number") && m.stepCount > 0;
  } catch {
    return false;
  }
}

_enterTitle() {
  // Stop movement and close overlays.
  this.state.keys = {};
  this.state.worldMapOpen = false;
  this.state.inventoryOpen = false;
  if (this.state.quest) this.state.quest.logOpen = false;
  this.state.ui = this.state.ui || {};
  this.state.ui.screen = "title";
  this.state.ui.titleIndex = 0;
  this.state.ui.pauseIndex = 0;
  this.state.ui.confirmIndex = 0;
}

_enterPlayFromLoaded() {
  this.state.ui = this.state.ui || {};
  this.state.ui.screen = "play";
  this._ensureMapValidated(true);
  this._resolvePlayerPosition();
  this._recordSafeIfApplicable(this.state.currentMapId);
  this.syncWorldMapCursorToCurrent();
  this.ensureEnemiesForMap(this.state.currentMapId);
}

_startNewGame(overwriteExisting) {
  if (overwriteExisting) {
    try { localStorage.removeItem(this._runtime.saveKey); } catch {}
  }
  const preservedSettings = { ...(this.state.settings || this._defaultSettings()) };
  // Reset state to factory defaults, preserving assets/runtime.
  this.state = createInitialState();
  this.state.settings = preservedSettings;
  // Re-apply dialogue skin (reset created a new DialogueSystem)
  this.state.dialogue.setSkin({ panel: this.assets.uiPanel, placeholder: this.assets.placeholder });
  this._applySettings();
  this._runtime.lastValidatedMapId = null;
  this._runtime.mapError = null;
  this._runtime.fatalError = null;
  this._runtime.lastSaveHash = "";
  this._enterPlayFromLoaded();

  // Auto-drop into Elder introduction on first boot of a new game.
  // (Diegetic tutorial + first tonic.)
  try {
    const s = this.state;
    if (!s.flags) s.flags = {};
    if (!s.flags.introElderAutoStarted) {
      s.flags.introElderAutoStarted = true;

      // Ensure Chapter 1 quest thread begins.
      if (!s.quest?.progress?.q1_quarry_rescue?.started) {
        this.startQuest("q1_quarry_rescue");
      }
      this.setObjectiveDone("q1_quarry_rescue", "talk_caretaker");
      s.flags.chapter1_introStarted = true;

      // Grant the first tonic once.
      if (!s.flags.introFirstTonicGiven) {
        s.flags.introFirstTonicGiven = true;
        if (!Array.isArray(s.inventory)) s.inventory = [];
        s.inventory.push({
          id: "field_tonic",
          name: "Field Tonic",
          description: "Restores a bit of strength after a bad scrape.",
          kind: "healing",
          amount: 10,
        });
        try { this._playPickupSfx({ id: "field_tonic", name: "Field Tonic", kind: "consumable" }); } catch (_) {}
        try { this._showToast("Received: Field Tonic"); } catch (_) {}
      }

      // Start the dialogue immediately.
      if (!s.dialogue.isActive()) {
        s.dialogue.startDialogue([
          "Hi stranger — we found you in pretty bad shape out in the woods, so we brought you back to our town.",
          "Ever since the Quarry Overseer to the north kept dropping pay, there’s hardly anyone who can afford to stay in Ironwood.",
          "Maybe if someone were to deal with him, folks would start returning.",
          "It looks like you’re in good shape now — but just in case, take this tonic with you.",
          "Press I to open your inventory. Use the tonic when your health runs low.",
          "If you’re heading north, talk with the watchman beforehand — press E next to him."
        ]);
      }
    }
  } catch (e) {
    console.warn("[Intro] Failed to start Elder intro:", e);
  }

  // Persist first state (Continue is gated by step-count).
  this.saveGame();
}

handleKeyDown(e) {
  const key = e.key;
  const s = this.state;

  // Unlock audio on first user gesture (required by most browsers).
  this._unlockAudio();
  if (this._music) this._music.unlock();
  if (this._ambient) this._ambient.unlock();
  if (this._sfxAssets) this._sfxAssets.unlock();

  // Dev-only toggle: Ctrl+Shift+D toggles debug enablement.
  if (e.ctrlKey && e.shiftKey && String(key).toLowerCase() === "d") {
    this._runtime.debugEnabled = !this._runtime.debugEnabled;
    if (!this._runtime.debugEnabled) this._runtime.debugOverlay = false;
    return true;
  }

  // Dev overlay: F1 toggles overlay when debug is enabled.
  if (this._runtime.debugEnabled && key === "F1") {
    this._runtime.debugOverlay = !this._runtime.debugOverlay;
    return true;
  }

  // Smoke-test warp: Ctrl+Shift+W (debug only).
  if (this._runtime.debugEnabled && e.ctrlKey && e.shiftKey && String(key).toLowerCase() === "w") {
    this._debugWarpPrompt();
    return true;
  }

  // ----- Title / non-gameplay screens -----
  if (s.ui?.screen && s.ui.screen !== "play") {
    const onTitle = s.ui.screen === "title";
    const onPause = s.ui.screen === "pause";
    const onConfirm = s.ui.screen === "confirm_new";
    const onIntroCard = s.ui.screen === "intro_card";
    const onControlsCard = s.ui.screen === "controls_card";
    const onKOCard = s.ui.screen === "ko_card";
    const onEndingCard = s.ui.screen === "ending_card";
    const onCredits = s.ui.screen === "credits";
    const onSettings = s.ui.screen === "settings";

    // Credits: scroll + back
    if (onCredits) {
      if (key === "ArrowUp") {
        e.preventDefault();
        s.ui.creditsScroll = Math.max(0, (s.ui.creditsScroll || 0) - 16);
        return true;
      }
      if (key === "ArrowDown") {
        e.preventDefault();
        s.ui.creditsScroll = (s.ui.creditsScroll || 0) + 16;
        return true;
      }
      if (key === "Escape" || key === "Enter" || key === "Backspace") {
        e.preventDefault();
        s.ui.creditsScroll = 0;
        this._enterTitle();
        return true;
      }
    }

    // Intro Card: shown before Controls when starting a new game
    if (onIntroCard) {
      if (key === "Escape" || key === "Backspace") {
        e.preventDefault();
        this._enterTitle();
        return true;
      }
      if (key === "Enter" || key === "e" || key === "E") {
        e.preventDefault();
        // Advance to controls, preserving the pending start action.
        s.ui.screen = "controls_card";
        s.ui.controlsAction = s.ui.introAction || "new";
        s.ui.introAction = "";
        return true;
      }
      return true;
    }

    // Ending Card: final summary after the last boss + Elder wrap-up
    if (onEndingCard) {
      if (key === "Enter" || key === "e" || key === "E" || key === "Escape" || key === "Backspace") {
        e.preventDefault();
        this._enterTitle();
        return true;
      }
      return true;
    }

    // Controls Card: shown after Start/Continue before entering gameplay
    if (onControlsCard) {
      if (key === "Escape" || key === "Backspace") {
        e.preventDefault();
        // Back to title without changing save state.
        this._enterTitle();
        return true;
      }
      if (key === "Enter" || key === "e" || key === "E") {
        e.preventDefault();
        const action = s.ui.controlsAction || "";
        s.ui.controlsAction = "";
        if (action === "continue") {
          this.loadGame();
          this._enterPlayFromLoaded();
          return true;
        }
        if (action === "new_overwrite") {
          this._startNewGame(true);
          return true;
        }
        // default: new game (no overwrite)
        this._startNewGame(false);
        return true;
      }
      return true;
    }

    // Intro Card: shown before Controls when starting a NEW game.
    if (onIntroCard) {
      if (key === "Escape" || key === "Backspace") {
        e.preventDefault();
        this._enterTitle();
        return true;
      }
      if (key === "Enter" || key === "e" || key === "E") {
        e.preventDefault();
        // Chain into controls, preserving the pending action.
        const action = s.ui.introAction || "new";
        s.ui.introAction = "";
        s.ui.screen = "controls_card";
        s.ui.controlsAction = action;
        return true;
      }
      return true;
    }

    // Ending card: shown after the final boss is defeated and the player reports back to the Elder.
    if (onEndingCard) {
      if (key === "Enter" || key === "e" || key === "E" || key === "Escape" || key === "Backspace") {
        e.preventDefault();
        // Return to title (keeps save intact; player can continue exploring if they wish).
        this._enterTitle();
        return true;
      }
      return true;
    }

    // KO Card: shown when the player faints, before returning to safety.
    if (onKOCard) {
      if (key === "Enter" || key === "e" || key === "E") {
        e.preventDefault();
        this._applyPendingKORespawn();
        s.ui.screen = "play";
        return true;
      }
      // Allow Esc/Backspace to also acknowledge (no way to get stuck here).
      if (key === "Escape" || key === "Backspace") {
        e.preventDefault();
        this._applyPendingKORespawn();
        s.ui.screen = "play";
        return true;
      }
      return true;
    }

    // Global back for Settings (return to the screen that opened it)
    if (onSettings && (key === "Escape" || key === "Backspace")) {
      e.preventDefault();
      // If on Controls subpage, go back to main settings first.
      if ((s.ui.settingsPage || "main") === "controls") {
        s.ui.settingsPage = "main";
        return true;
      }
      const ret = s.ui.settingsReturn || "title";
      if (ret === "pause") {
        s.ui.screen = "pause";
      } else {
        this._enterTitle();
      }
      return true;
    }

    // Navigate menus
    const moveUp = key === "ArrowUp";
    const moveDown = key === "ArrowDown";
    const slotLeft = key === "ArrowLeft";
    const slotRight = key === "ArrowRight";

    if (onTitle) {
      // Dynamic items: Continue only if a save exists.
      const items = this._getTitleMenuItems();
      if (slotLeft || slotRight) {
        e.preventDefault();
        const cur = this._runtime.selectedSlot || 1;
        let next = cur + (slotRight ? 1 : -1);
        if (next < 1) next = 3;
        if (next > 3) next = 1;
        this.setActiveSlot(next);
        // Keep selection valid as menu length changes when Continue appears/disappears.
        const items2 = this._getTitleMenuItems();
        s.ui.titleIndex = Math.min(s.ui.titleIndex || 0, items2.length - 1);
        return true;
      }
      if (moveUp) { e.preventDefault(); s.ui.titleIndex = (s.ui.titleIndex - 1 + items.length) % items.length; return true; }
      if (moveDown) { e.preventDefault(); s.ui.titleIndex = (s.ui.titleIndex + 1) % items.length; return true; }
      if (key === "Enter") {
        e.preventDefault();
        const choice = items[s.ui.titleIndex]?.id;
        if (choice === "continue") {
          s.ui.screen = "controls_card";
          s.ui.controlsAction = "continue";
          return true;
        }
        if (choice === "new") {
          if (this.hasSave()) {
            s.ui.screen = "confirm_new";
            s.ui.confirmIndex = 1; // default to "No"
          } else {
            s.ui.screen = "intro_card";
            s.ui.introAction = "new";
          }
          return true;
        }
        if (choice === "settings") {
          s.ui.screen = "settings";
          s.ui.settingsReturn = "title";
          s.ui.settingsPage = "main";
          s.ui.settingsIndex = 0;
          return true;
        }
        if (choice === "credits") { s.ui.screen = "credits"; return true; }
      }
      return false;
    }

    if (onPause) {
      const items = this._getPauseMenuItems();
      if (moveUp) { e.preventDefault(); s.ui.pauseIndex = (s.ui.pauseIndex - 1 + items.length) % items.length; return true; }
      if (moveDown) { e.preventDefault(); s.ui.pauseIndex = (s.ui.pauseIndex + 1) % items.length; return true; }
      if (key === "Escape") { e.preventDefault(); s.ui.screen = "play"; return true; }
      if (key === "Enter") {
        e.preventDefault();
        const choice = items[s.ui.pauseIndex]?.id;
        if (choice === "resume") { s.ui.screen = "play"; return true; }
        if (choice === "settings") {
          s.ui.screen = "settings";
          s.ui.settingsReturn = "pause";
          s.ui.settingsPage = "main";
          s.ui.settingsIndex = 0;
          return true;
        }
        if (choice === "title") { this._enterTitle(); return true; }
      }
      return true;
    }

    if (onConfirm) {
      const items = [{ id: "yes", label: "Yes, overwrite" }, { id: "no", label: "No" }];
      if (moveUp || moveDown) { e.preventDefault(); s.ui.confirmIndex = 1 - (s.ui.confirmIndex || 0); return true; }
      if (key === "Escape") { e.preventDefault(); this._enterTitle(); return true; }
      if (key === "Enter") {
        e.preventDefault();
        const choice = items[s.ui.confirmIndex]?.id;
        if (choice === "yes") {
          s.ui.screen = "intro_card";
          s.ui.introAction = "new_overwrite";
        } else {
          this._enterTitle();
        }
        return true;
      }
      return true;
    }

    if (onSettings) {
      const page = s.ui.settingsPage || "main";
      if (page === "controls") {
        // Controls page is read-only. Esc handled above.
        return true;
      }

      const items = [
        { id: "textSpeed", label: "Text Speed" },
        { id: "musicVolume", label: "Music Volume" },
        { id: "sfxVolume", label: "SFX Volume" },
        { id: "controls", label: "Controls" },
        { id: "back", label: "Back" },
      ];

      if (moveUp) { e.preventDefault(); s.ui.settingsIndex = (s.ui.settingsIndex - 1 + items.length) % items.length; return true; }
      if (moveDown) { e.preventDefault(); s.ui.settingsIndex = (s.ui.settingsIndex + 1) % items.length; return true; }

      const idx = s.ui.settingsIndex || 0;
      const cur = items[idx]?.id;

      const bumpVol = (field, dir) => {
        const curV = typeof s.settings?.[field] === "number" ? s.settings[field] : 0;
        const step = 0.1;
        const next = Math.max(0, Math.min(1, curV + dir * step));
        s.settings = s.settings || this._defaultSettings();
        s.settings[field] = Math.round(next * 100) / 100;
        this._applySettings();
        this._saveSettings();
      };

      if (slotLeft || slotRight) {
        e.preventDefault();
        const dir = slotRight ? 1 : -1;
        if (cur === "musicVolume") { bumpVol("musicVolume", dir); return true; }
        if (cur === "sfxVolume") { bumpVol("sfxVolume", dir); return true; }
        if (cur === "textSpeed") {
          const order = ["slow", "normal", "fast"];
          const now = (s.settings?.textSpeed || "normal").toLowerCase();
          const at = Math.max(0, order.indexOf(now));
          const next = order[(at + dir + order.length) % order.length];
          s.settings = s.settings || this._defaultSettings();
          s.settings.textSpeed = next;
          this._applySettings();
          this._saveSettings();
          return true;
        }
      }

      if (key === "Enter") {
        e.preventDefault();
        if (cur === "controls") {
          s.ui.settingsPage = "controls";
          return true;
        }
        if (cur === "back") {
          const ret = s.ui.settingsReturn || "title";
          if (ret === "pause") s.ui.screen = "pause";
          else this._enterTitle();
          return true;
        }
      }
      return true;
    }

    return true;
  }

  // ----- Gameplay -----
  // Escape closes overlays first; otherwise toggles pause
  if (key === "Escape") {
    e.preventDefault();
    if (s.worldMapOpen) { s.worldMapOpen = false; return true; }
    if (s.inventoryOpen) { s.inventoryOpen = false; return true; }
    if (s.quest?.logOpen) { s.quest.logOpen = false; return true; }
    s.ui = s.ui || {};
    s.ui.screen = "pause";
    s.ui.pauseIndex = 0;
    return true;
  }

  // Dialogue choice navigation (within the dialogue box)
  if (s.dialogue.isActive() && s.dialogue.isChoiceActive()) {
    if (key === "ArrowUp") { e.preventDefault(); s.dialogue.moveChoice(-1); return true; }
    if (key === "ArrowDown") { e.preventDefault(); s.dialogue.moveChoice(1); return true; }
    if (key === "Enter") { e.preventDefault(); this.interact(); return true; }
  }

  // Movement keys
  if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
    e.preventDefault();
    this.setKey(key, true);
    return true;
  }

  // Interact / dialogue
  if (key === "e" || key === "E") { e.preventDefault(); this.interact(); return true; }

  // Attack
  // Z / X: quick-slot use (default: Z=attack, X=shoot). While in Inventory, pressing Z/X assigns the selected item to that slot.
  
if (s.inventoryOpen && (key === "z" || key === "Z" || key === "x" || key === "X")) {
  e.preventDefault();
  const panels = buildInventoryPanels(s.inventory);
  const slot = (s.inventoryIndex | 0);
  const selected = panels.itemAt(slot);
  const invItem = selected ? s.inventory[selected.invIndex] : null;

  // Only RIGHT-panel items are assignable.
  if (invItem && !isQuickAssignableItem(invItem)) {
    this._showToast("That item cannot be equipped.");
    return true;
  }

  const assignKey = (key === "z" || key === "Z") ? "Z" : "X";
  if (assignKey === "Z") s.equipZ = invItem ? (invItem.id || null) : null;
  else s.equipX = invItem ? (invItem.id || null) : null;

  this._showToast(invItem ? `Assigned ${invItem.name || invItem.id} to ${assignKey}` : `Cleared ${assignKey}`);
  return true;
}

  if (key === "z" || key === "Z") {
    e.preventDefault();
    if (s.equipZ) { this.useEquipped("Z"); return true; }
    this.attack();
    return true;
  }

  if (key === "x" || key === "X") {
    e.preventDefault();
    if (s.equipX) { this.useEquipped("X"); return true; }
    this.shoot();
    return true;
  }

  // Shoot (requires pistol + bullets)

  // Inventory toggle
  if (key === "i" || key === "I") {
    e.preventDefault();
    if (!s.inventoryOpen) { s.inventoryOpen = true; s.inventoryIndex = 0; }
    else s.inventoryOpen = false;
    return true;
  }

  // World map toggle
  if (key === "m" || key === "M") {
    e.preventDefault();
    // Gate world map behind receiving the Town Map (earned trust / knowledge).
    // Unlock is granted by the Town Elder after the Quarry is cleared.
    const hasTownMap = !!(s.flags && s.flags.hasTownMap);
    if (!hasTownMap) {
      this._showToast("You don't have a map.");
      return true;
    }
    s.worldMapOpen = !s.worldMapOpen;
    if (s.worldMapOpen) this.syncWorldMapCursorToCurrent();
    return true;
  }

  // Quest log toggle
  if (key === "q" || key === "Q") {
    e.preventDefault();
    s.quest = s.quest || { activeId: null, logOpen: false, index: 0, progress: {} };
    s.quest.logOpen = !s.quest.logOpen;
    return true;
  }

  // Use selected item
  if (s.inventoryOpen && key === "Enter") { e.preventDefault(); this.useSelectedItem(); return true; }

  return false;
}

  // ----- Minimal audio + toast (feel polish; no UI meters) -----
  _ensureAudioCtx() {
    if (this._audio?.ctx) return this._audio.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this._audio.ctx = new AC();
      return this._audio.ctx;
    } catch (_) {
      return null;
    }
  }

  _unlockAudio() {
    if (!this._audio) return;
    if (this._audio.unlocked) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;
    // Resume if suspended; ignore errors.
    try { if (ctx.state === "suspended") ctx.resume(); } catch (_) {}
    this._audio.unlocked = true;
  }

  _playBeep(freq, durMs, type = "square", gain = 0.08, whenSec = 0) {
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;
    const vol = Math.max(0, Math.min(1, this.state?.settings?.sfxVolume ?? 0.85));
    const g = ctx.createGain();
    g.gain.value = gain * vol;

    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = Math.max(40, freq);

    const t0 = ctx.currentTime + whenSec;
    const t1 = t0 + Math.max(0.01, durMs / 1000);

    o.connect(g);
    g.connect(ctx.destination);

    // Quick attack/release envelope to avoid clicks.
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t1);

    try {
      o.start(t0);
      o.stop(t1 + 0.02);
    } catch (_) {
      // If start/stop throws due to timing, ignore.
    }
  }

  _playPickupSfx(item) {
    const kind = String(item?.kind || "").toLowerCase();
    const id = String(item?.id || "").toLowerCase();

    // Pokémon-like: two short beeps, pitch depends on item "importance".
    let base = 520;
    if (kind === "tool" || kind === "weapon") base = 460;
    if (kind === "paper" || kind === "key" || id.includes("accord") || id.includes("charter")) base = 640;
    if (kind === "consumable" || kind === "supply" || id.includes("tonic") || id.includes("ration") || id.includes("fish")) base = 560;

    this._playBeep(base, 70, "square", 0.07, 0);
    this._playBeep(base * 1.25, 70, "square", 0.07, 0.09);
  }

  _showToast(text, ms = 1400) {
    if (!this.state.toast) this.state.toast = { text: "", ms: 0 };
    this.state.toast.text = String(text || "").slice(0, 64);
    this.state.toast.ms = Math.max(0, ms | 0);
  }

handleKeyUp(e) {
  const key = e.key;
  // Only clear movement in gameplay.
  if (this.state.ui?.screen !== "play") return false;
  if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
    e.preventDefault();
    this.setKey(key, false);
    return true;
  }
  return false;
}

_getTitleMenuItems() {
  const items = [];
  // New Game first. Continue only if at least one step has been recorded.
  items.push({ id: "new", label: "New Game" });
  if (this.hasContinuableSave()) items.push({ id: "continue", label: "Continue" });
  items.push({ id: "settings", label: "Settings" });
  items.push({ id: "credits", label: "Credits" });
  return items;
}

_getPauseMenuItems() {
  return [
    { id: "resume", label: "Resume" },
    { id: "settings", label: "Settings" },
    { id: "title", label: "Return to Title" },
  ];
}

// ----- Enemy spawning (Quarry-only for now) -----
  ensureEnemiesForMap(mapId) {
    const s = this.state;
    if (!s.enemiesByMap || typeof s.enemiesByMap !== "object") s.enemiesByMap = {};
    if (s.enemiesByMap[mapId]) return;

    const spawns = SPAWNS_BY_MAP?.[mapId];
    if (!Array.isArray(spawns) || spawns.length === 0) {
      s.enemiesByMap[mapId] = [];
      return;
    }

    const map = maps[mapId];
    const placed = [];
    const occupied = new Set();
    // Avoid player tile at load time.
    occupied.add(`${s.player.x},${s.player.y}`);

    for (const spawn of spawns) {
      const arch = ENEMY_ARCHETYPES?.[spawn.archetypeId];
      if (!arch) continue;

      const desired = { x: spawn.x, y: spawn.y };
      const pos = this._findNearestEnemySpawnTile(map, desired.x, desired.y, occupied);
      if (!pos) continue;

      occupied.add(`${pos.x},${pos.y}`);
      placed.push({
        id: spawn.id,
        archetypeId: spawn.archetypeId,
        x: pos.x,
        y: pos.y,
        hp: arch.hpMax,
        state: "idle",
        t: 0,
      });
    }

    s.enemiesByMap[mapId] = placed;
  }

  _findNearestEnemySpawnTile(map, x, y, occupied) {
    if (!map) return null;
    const inBounds = (tx, ty) => tx >= 0 && ty >= 0 && tx < map.width && ty < map.height;
    const isOpen = (tx, ty) => {
      if (!inBounds(tx, ty)) return false;
      const tile = map.tiles?.[ty]?.[tx];
      if (tile === 1) return false; // wall
      if (tile === 2) return false; // avoid exits to reduce softlock risk
      if (occupied?.has?.(`${tx},${ty}`)) return false;
      return true;
    };

    if (isOpen(x, y)) return { x, y };

    // Spiral search up to radius 4.
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // ring only
          const tx = x + dx;
          const ty = y + dy;
          if (isOpen(tx, ty)) return { x: tx, y: ty };
        }
      }
    }
    return null;
  }

  get currentMap() {
    const base = maps ? maps[this.state.currentMapId] : null;
    const ironwoodPatched = applyIronwoodReactivity(base, this.state);
    const chapter1Patched = applyChapter1Reactivity(ironwoodPatched, this.state);
    const pressurePatched = applyReturnPressureReactivity(chapter1Patched, this.state);
    // Normalized, engine-friendly shape: treat `triggers` as a canonical data source.
    // - `sign` triggers become `map.signs` for interaction.
    // - other trigger types are processed in the update loop.
    if (!pressurePatched) return pressurePatched;
    const signs = Array.isArray(pressurePatched.triggers)
      ? pressurePatched.triggers.filter(t => t?.type === "sign")
      : [];
    const __mid = pressurePatched.id || this.state.currentMapId;
    const __picked = this.state.pickedItemKeys || {};
    const __items = Array.isArray(pressurePatched.items)
      ? pressurePatched.items.filter(it => !__picked[`${__mid}:${it.id}:${it.x},${it.y}`]).map(it => ({...it}))
      : pressurePatched.items;
    const __spawnedRaw = (this.state.spawnedItemsByMap && this.state.spawnedItemsByMap[__mid]) ? this.state.spawnedItemsByMap[__mid] : [];
    const __spawned = Array.isArray(__spawnedRaw)
      ? __spawnedRaw.filter(it => !__picked[`${__mid}:${it.id}:${it.x},${it.y}`]).map(it => ({...it}))
      : [];
    const __allItems = Array.isArray(__items) ? [...__items, ...__spawned] : [...__spawned];

    return {
      ...pressurePatched,
      items: __allItems,
      signs: signs.map(t => ({ x: t.x, y: t.y, lines: t.lines || [] })),
    };
  }

  setKey(key, value) {
    this.state.keys[key] = value;
  }

  
  // ----- Quest system (MVP) -----
  _ensureQuestProgress(qid) {
    const s = this.state;
    if (!s.quest) {
      s.quest = { activeId: null, logOpen: false, index: 0, progress: {} };
    }
    if (!s.quest.progress) s.quest.progress = {};
    if (!s.quest.progress[qid]) {
      s.quest.progress[qid] = { started: false, completed: false, objectivesDone: {} };
    }
    return s.quest.progress[qid];
  }

  startQuest(qid) {
    const def = QUEST_DEFS[qid];
    if (!def) return;
    const p = this._ensureQuestProgress(qid);
    if (!p.started) p.started = true;
    if (!this.state.quest.activeId) this.state.quest.activeId = qid;
  }

  setObjectiveDone(qid, objId) {
    const def = QUEST_DEFS[qid];
    if (!def) return;
    const p = this._ensureQuestProgress(qid);
    p.started = true;
    p.objectivesDone[objId] = true;

    // Auto-complete if all objectives are done
    if (!p.completed && allObjectivesComplete(def, p)) {
      this.completeQuest(qid);
    }
  }

  completeQuest(qid) {
    const def = QUEST_DEFS[qid];
    if (!def) return;
    const p = this._ensureQuestProgress(qid);
    p.started = true;
    p.completed = true;

    // Apply rewards (idempotent)
    const rewards = def.rewards || {};
    if (rewards.flags) {
      this.state.flags = this.state.flags || {};
      for (const k of Object.keys(rewards.flags)) {
        this.state.flags[k] = rewards.flags[k];
      }
    }
    if (Array.isArray(rewards.items)) {
      for (const item of rewards.items) {
        this._grantItemOnce(item);
      }
    }

    // If this was active, clear it (or chain to next quest)
    if (this.state.quest.activeId === qid) {
      this.state.quest.activeId = null;
    }
  }

  _grantItemOnce(item) {
    const s = this.state;
    if (!item || !item.id) return;
    if (!Array.isArray(s.inventory)) s.inventory = [];
    const exists = s.inventory.some(it => it.id === item.id);
    if (exists) return;
    s.inventory.push({
      id: item.id,
      name: item.name,
      description: item.description,
      kind: item.kind,
      amount: item.amount ?? 1,
    });
  }

// ----- World map helpers -----
  getWorldNodeIdForMap(mapId) {
    const map = maps[mapId];
    return map?.worldNodeId || null;
  }

  _isGateSatisfied(gate) {
    if (!gate || !Array.isArray(gate.requires) || gate.requires.length === 0) return true;
    const s = this.state;
    for (const req of gate.requires) {
      if (!req || typeof req !== "object") return false;
      if (req.type === "flag") {
        const id = req.id;
        if (!id || typeof id !== "string") return false;
        if (!s.flags || !s.flags[id]) return false;
        continue;
      }
      if (req.type === "item") {
        const id = req.id;
        if (!id || typeof id !== "string") return false;
        const inv = Array.isArray(s.inventory) ? s.inventory : [];
        const has = inv.some(it => it && it.id === id && (it.amount ?? 1) > 0);
        if (!has) return false;
        continue;
      }
      if (req.type === "questObjective") {
        const qid = req.questId;
        const oid = req.objectiveId;
        const p = s.quest?.progress?.[qid];
        if (!qid || !oid || !p || !p.objectivesDone || !p.objectivesDone[oid]) return false;
        continue;
      }
      // Unknown requirement type -> treat as unsatisfied to fail-safe in dev.
      return false;
    }
    return true;
  }

  _blockGateMessage(gate) {
    const msg = (gate && typeof gate.blockedMessage === "string") ? gate.blockedMessage : "The way is closed.";
    this.state.message = msg;
  }

  markDiscovered(nodeId) {
    if (!nodeId) return;
    this.state.discoveredNodes[nodeId] = true;
  }

  syncWorldMapCursorToCurrent() {
    const nodeId = this.getWorldNodeIdForMap(this.state.currentMapId);
    const idx = worldMap.nodes.findIndex(n => n.id === nodeId);
    if (idx >= 0) this.state.worldMapCursor = idx;
  }

  
  // ----- Safety anchors / spawn hygiene -----
  _isSafeMapId(mapId) {
    // Minimal, explicit list of narrative-safe hubs where waking up makes sense.
    return (
      mapId === "ironwood_town" ||
      mapId === "lower_forest_camp" ||
      mapId === "upper_forest_camp" ||
      mapId === "ironwood_junction"
    );
  }

  _recordSafeIfApplicable(mapIdOverride) {
    const mid = mapIdOverride || this.state.currentMapId;
    if (!this._isSafeMapId(mid)) return;
    const map = maps[mid];
    if (!map) return;
    // Anchor on the map spawn to avoid persisting a “bad” tile after content edits.
    this.state.lastSafe = { mapId: mid, x: map.spawnX, y: map.spawnY };
  }

  _isWalkableForPlayer(map, x, y) {
    if (!map || !Array.isArray(map.tiles)) return false;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;

    const t = map.tiles?.[y]?.[x];

    // If the target tile is an exit pad, allow stepping onto it even if an NPC is standing there
    // (prevents accidental softlocks when an NPC is placed on a warp/exit tile).
    const isExitPad = Array.isArray(map.exits) && map.exits.some(e => (e.x|0) === (x|0) && (e.y|0) === (y|0));

    // NPCs are solid so interactions are reliable.
    if (Array.isArray(map.npcs)) {
      const occ = map.npcs.find(n => n.x === x && n.y === y);
      // Only block "real" NPCs. Allow stepping onto exit/warp markers (they often use npc-like objects with `to`).
      if (occ && !occ.to && !isExitPad) return false;
    }

    // Tile semantics:
    // 0=ground, 1=wall (solid), 2=path (walkable), 3=decor (walkable)
    // 4+ are direct atlas indices in the building tileset (solid by default), with doorframe(6) as walkable
    // 1000+ are direct biome indices (solid by default, used for rails/water/etc.)
    // 2000+ are direct building indices (walkable by default, used for docks/platforms)
    if (typeof t === "number") {
      if (t >= 2000) return true; // docks/platforms should be walkable
      if (t >= 1000) return false; // rails/water/etc. are solid
      if (t >= 4) return (t === 6); // buildings solid; doorframe is walkable
    }
    return t !== 1;
  }

  _findNearestOpenTile(map, x, y) {
    if (this._isWalkableForPlayer(map, x, y)) return { x, y };
    // Spiral search up to radius 6.
    for (let r = 1; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (this._isWalkableForPlayer(map, tx, ty)) return { x: tx, y: ty };
        }
      }
    }
    return { x: map.spawnX, y: map.spawnY };
  }

  _resolvePlayerPosition() {
    const map = this.currentMap;
    if (!map) return;
    const s = this.state;
    const fixed = this._findNearestOpenTile(map, s.player.x, s.player.y);
    s.player.x = fixed.x;
    s.player.y = fixed.y;
  }

// ----- KO / respawn -----
  handleKO() {
    const s = this.state;

    // Avoid repeated KO triggers while we display the KO card.
    s.player.hp = Math.max(1, s.player.hp || 0);

    // Prefer a narrative-safe hub (camp/town/junction) to avoid KO loops in hostile maps.
    const anchor = (s.lastSafe && maps[s.lastSafe.mapId]) ? s.lastSafe : null;
    const fallback = this.currentMap;

    const mapId = anchor?.mapId || fallback?.id || s.currentMapId;
    const x = anchor?.x ?? fallback?.spawnX ?? 1;
    const y = anchor?.y ?? fallback?.spawnY ?? 1;

    s.ui = s.ui || {};
    s.ui.screen = "ko_card";
    s.ui.koReturn = { mapId, x, y };
    s.ui.koMsg = "You fainted.";
    // Clear any in-world toast so the card reads clean.
    s.message = "";
  }

  _applyPendingKORespawn() {
    const s = this.state;
    const ret = s.ui?.koReturn;
    const mapId = ret?.mapId;
    const dest = (mapId && maps[mapId]) ? maps[mapId] : this.currentMap;
    if (!dest) return;

    s.currentMapId = dest.id;
    const fixed = this._findNearestOpenTile(dest, ret?.x ?? dest.spawnX, ret?.y ?? dest.spawnY);
    s.player.x = fixed.x;
    s.player.y = fixed.y;
    // Respawn rule: return to 8 HP regardless of max HP (capped if max is below 8).
    s.player.hp = Math.min((s.player.maxHp || 8), 8);

    // Brief feedback after KO (kept subtle; the card already did the heavy lifting).
    s.message = "You come to, shaken but alive.";

    if (s.ui) {
      delete s.ui.koReturn;
      delete s.ui.koMsg;
    }

    this._ensureMapValidated(true);
    this.syncWorldMapCursorToCurrent();
  }

  // ----- Inventory pickup -----
  pickupItemAt(map, x, y) {
    if (!map) return;

    const s = this.state;
    const mid = map.id || s.currentMapId;

    // Normal authored items live on the map; runtime drops (e.g., boss drops) live in spawnedItemsByMap.
    const spawned = (s.spawnedItemsByMap && Array.isArray(s.spawnedItemsByMap[mid])) ? s.spawnedItemsByMap[mid] : [];

    const findIn = (arr) => {
      if (!Array.isArray(arr) || !arr.length) return -1;
      return arr.findIndex(it => it && it.x === x && it.y === y);
    };

    let src = "map";
    let idx = findIn(map.items);
    if (idx === -1) {
      idx = findIn(spawned);
      src = "spawned";
    }
    if (idx === -1) return;

    const item = (src === "map") ? map.items[idx] : spawned[idx];

    // Persist pickup so the item stays gone across reloads.
    if (!s.pickedItemKeys || typeof s.pickedItemKeys !== "object") s.pickedItemKeys = {};
    s.pickedItemKeys[`${mid}:${item.id}:${item.x},${item.y}`] = true;

    const removePicked = () => {
      if (src === "map") map.items.splice(idx, 1);
      else spawned.splice(idx, 1);
    };

    // Special: Heart Container is applied immediately (max HP increase) and does not occupy inventory.
    if (item.id === "heart_container") {
      removePicked();
      this._showToast(`Got ${item.name || "Heart Piece"}.`, 1600);
      if (this._sfxAssets) this._sfxAssets.playUI("pickup");
      this._playPickupSfx(item);
      this._grantDropItem("heart_container");
      return;
    }

    // Standard inventory add (merge if stackable id already exists and has amount field).
    if (!Array.isArray(s.inventory)) s.inventory = [];
    const existing = s.inventory.find(it => it && it.id === item.id && typeof it.amount === "number");
    if (existing && typeof item.amount === "number") {
      existing.amount += item.amount;
    } else {
      s.inventory.push({
        id: item.id,
        name: item.name,
        description: item.description,
        kind: item.kind,
        amount: item.amount,
      });
    }

    removePicked();

    const qty = (item.amount && item.amount > 1) ? ` x${item.amount}` : "";
    this._showToast(`Got ${item.name}${qty}.`, 1400);
    if (this._sfxAssets) this._sfxAssets.playUI("pickup");
    this._playPickupSfx(item);
  }

  // ----- Map triggers (data-driven) -----
  _triggerKey(mapId, t) {
    const base = `${mapId || "<unknown>"}:${t?.type || "?"}`;
    const xy = `${t?.x ?? "?"},${t?.y ?? "?"}`;
    const wh = `${t?.w ?? 1}x${t?.h ?? 1}`;
    return `${base}@${xy}@${wh}`;
  }

  _processMapTriggers(map) {
    const s = this.state;
    if (!map || !Array.isArray(map.triggers) || !map.triggers.length) return;
    if (!s.triggerOnce || typeof s.triggerOnce !== "object") s.triggerOnce = {};

    for (const t of map.triggers) {
      if (!t || t.type === "sign") continue; // signs are handled via interact()

      if (t.type === "area") {
        const w = t.w ?? 1;
        const h = t.h ?? 1;
        const inArea =
          s.player.x >= t.x &&
          s.player.y >= t.y &&
          s.player.x < (t.x + w) &&
          s.player.y < (t.y + h);
        if (!inArea) continue;

        const key = this._triggerKey(s.currentMapId, t);
        if (t.once && s.triggerOnce[key]) continue;

        try {
          if (typeof t.run === "function") t.run(s, this);
        } catch (e) {
          console.error(e);
        }

        if (t.once) s.triggerOnce[key] = true;
      }
    }
  }

  // ----- Interaction -----
  interact() {
    const s = this.state;
    const map = this.currentMap;

    if (s.dialogue.isActive()) {
      // If the current dialogue line is a choice, confirm it; otherwise advance.
      const confirmed = s.dialogue.confirmChoice(s, this);
      if (!confirmed) s.dialogue.advance();
      if (this._sfxAssets) this._sfxAssets.playUI("tap");
      return;
    }

    const offsets = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };

    const [ox, oy] = offsets[s.player.facing] || [0, 1];
    const tx = s.player.x + ox;
    const ty = s.player.y + oy;

    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return;

    // NPCs
    if (map.npcs) {
      // Primary: the tile the player is facing
      let npc = map.npcs.find(n => n.x === tx && n.y === ty);

      // Safety: if the player is on the same tile as an NPC (possible from older saves), allow interaction.
      if (!npc) {
        npc = map.npcs.find(n => n.x === s.player.x && n.y === s.player.y);
      }

      // QoL: if not facing perfectly, allow any adjacent NPC to be interacted with
      if (!npc) {
        const ax = s.player.x, ay = s.player.y;
        npc = map.npcs.find(n =>
          (Math.abs(n.x - ax) + Math.abs(n.y - ay)) === 1
        );
      }

      if (npc && npc.dialogue) {
        if (typeof npc.onInteract === "function") {
          try { npc.onInteract(s, this); } catch (e) { console.error(e); }
        }
        s.dialogue.startDialogue(npc.dialogue(s, this));
        return;
      }
    }

    // Signs / inspectables
    if (map.signs) {
      let sign = map.signs.find(sg => sg.x === tx && sg.y === ty);

      // QoL: allow adjacent sign read even if not facing perfectly
      if (!sign) {
        const ax = s.player.x, ay = s.player.y;
        sign = map.signs.find(sg =>
          (Math.abs(sg.x - ax) + Math.abs(sg.y - ay)) === 1
        );
      }

      if (sign) {
        s.dialogue.startDialogue(sign.lines);
        return;
      }
    }

    // Items
    this.pickupItemAt(map, tx, ty);
  }

  // ----- Attack -----
attack() {
  const s = this.state;
  if (s.dialogue.isActive()) return;
  // Attack animation window (sprite swap)
  s.player.attackAnimMs = 180;
  if (this._sfxAssets) this._sfxAssets.playWeapon("blade");

  const map = this.currentMap;
  if (!map) return;

  const offsets = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };

  const [ox, oy] = offsets[s.player.facing] || [0, 1];
  const tx = s.player.x + ox;
  const ty = s.player.y + oy;

  const enemies = (s.enemiesByMap?.[s.currentMapId] || []);
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.x === tx && e.y === ty) {
      const arch = ENEMY_ARCHETYPES?.[e.archetypeId];
      const inv = (Array.isArray(s.inventory) ? s.inventory : []);
      const hasKnife = inv.some(it => it && it.id === "knife");
      const hasSaber = inv.some(it => it && it.id === "saber");
      // Weapon ladder:
      // - base: 1
      // - knife: +1
      // - saber: +2 (stacks above knife)
      let dmg = 1;
      if (hasKnife) dmg += 1;
      if (hasSaber) dmg += 2;
      e.hp = Math.max(0, (e.hp ?? (arch?.hpMax ?? 1)) - dmg);
      e.hitFlash = 6;
      e.state = e.state === "dead" ? "dead" : "hitstun";
      e.hitstunMs = 140;

      if (e.hp <= 0) {
        this._handleEnemyDeath(e, arch);
        s.message = arch?.displayName ? `Defeated ${arch.displayName}!` : "Enemy down!";
      } else {
        s.message = "Hit!";
      }
      return;
    }
  }
}


shoot() {
  const s = this.state;
  const inv = Array.isArray(s.inventory) ? s.inventory : [];
  const hasRifle = inv.some(it => it && it.id === "rifle");
  const hasPistol = inv.some(it => it && it.id === "pistol");
  if (!hasRifle && !hasPistol) { s.message = "No ranged weapon."; return; }

  const bulletIdx = inv.findIndex(it => it && it.id === "bullet");
  if (bulletIdx < 0) { s.message = "Out of bullets."; this._showToast("No ammo"); return; }

  // Consume 1 bullet
  inv.splice(bulletIdx, 1);

  const dir = s.player.facing || "down";
  const dmap = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const [dx, dy] = dmap[dir] || [0, 1];

  // Rifle overrides pistol (more range / damage)
  const projSpec = hasRifle
    ? { speedTilesPerSec: 10, maxRangeTiles: 9, damage: 3, owner: "player" }
    : { speedTilesPerSec: 9, maxRangeTiles: 7, damage: 2, owner: "player" };

  this._spawnProjectile(s.player.x, s.player.y, dx, dy, projSpec);

  if (this._sfxAssets) this._sfxAssets.playWeapon(hasRifle ? "rifle" : "pistol");
  s.message = "Bang!";
  // Simple gunshot-like beep (no asset dependency)
  this._playBeep(180, 40, "square", 0.12, 0);
  this._playBeep(120, 30, "square", 0.10, 0.05);
}




// ----- Inventory use -----
  
useSelectedItem() {
  const s = this.state;
  const panels = buildInventoryPanels(s.inventory);
  if (!(panels.display && panels.display.count)) return;

  // Cursor is over fixed slot grid (0..GRID_SLOTS-1). Empty slots do nothing.
  const slot = (s.inventoryIndex | 0);
  const selected = panels.itemAt(slot);
  if (!selected) return;

  const invIdx = selected?.invIndex ?? -1;
  const item = (invIdx >= 0) ? s.inventory[invIdx] : null;
  if (!item) return;

  if (item.kind === "healing") {
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + item.amount);
    s.message = `Used ${item.name}.`;
    s.inventory.splice(invIdx, 1);

    // Keep cursor stable; clamp into grid slots.
    s.inventoryIndex = Math.max(0, Math.min(panels.GRID_SLOTS - 1, s.inventoryIndex | 0));
  }
}

  // Use an equipped quick-slot item (Z/X). If the equipped item is a healing consumable, consume it.
  // If it is a ranged weapon, fire; otherwise fall back to melee attack.
  useEquipped(slotKey) {
    const s = this.state;
    const id = (slotKey === "Z") ? s.equipZ : s.equipX;
    if (!id) {
      if (slotKey === "X") this.shoot();
      else this.attack();
      return;
    }

    const inv = Array.isArray(s.inventory) ? s.inventory : [];
    const lower = String(id).toLowerCase();

    // Weapons: preserve current combat semantics.
    if (lower === "pistol" || lower === "rifle") { this.shoot(); return; }
    if (lower === "saber" || lower === "scaber" || lower === "knife" || lower === "pickaxe") { this.attack(); return; }

    // Consumables (currently: healing items use kind==="healing").
    const idx = inv.findIndex(it => it && String(it.id).toLowerCase() === lower);
    if (idx < 0) {
      this._showToast("Not in inventory");
      return;
    }
    const item = inv[idx];
    if (item && item.kind === "healing") {
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + item.amount);
      s.message = `Used ${item.name || item.id}.`;
      inv.splice(idx, 1);
      this._showToast(`Used ${item.name || item.id}`);
      return;
    }

    this._showToast("Can't use");
  }

  // ----- Movement -----
  tryMove(dx, dy) {
    const s = this.state;
    const map = this.currentMap;

    if (this._runtime.fatalError || this._runtime.mapError || !map) return;

    const nx = s.player.x + dx;
    const ny = s.player.y + dy;

    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return;

    // Allow stepping onto exits even if the tile is treated as non-walkable (e.g., border walls with embedded exits).
    // This prevents softlocks when an exit is defined in `map.exits` but collision rules reject the underlying tile.
    if (map.exits) {
      // If a solid NPC occupies this tile, do not auto-traverse exits. This enables diegetic NPC blockers on exits.
      if (Array.isArray(map.npcs)) {
        const occ = map.npcs.find(n => n.x === nx && n.y === ny);
        if (occ && !occ.to) return;
      }

      const stepExit = map.exits.find(e => e.x === nx && e.y === ny);
      if (stepExit) {
        const prev = this.state.currentMapId;
        const dest = maps[stepExit.to];
        if (!dest) {
          console.error(`Exit target map not found: ${stepExit.to} from ${map.id}`);
          return;
        }
        if (typeof stepExit.onTraverse === "function") {
          try { stepExit.onTraverse(this.state, this); } catch (e) { console.error(e); }
        }
        this.state.currentMapId = stepExit.to;
        // spawn
        const sx = (typeof stepExit.spawnX === "number") ? stepExit.spawnX : dest.spawnX;
        const sy = (typeof stepExit.spawnY === "number") ? stepExit.spawnY : dest.spawnY;
        const fixed = this._findNearestOpenTile(dest, sx, sy);
        this.state.player.x = fixed.x;
        this.state.player.y = fixed.y;
        this.ensureEnemiesForMap(this.state.currentMapId);
        this._ensureMapValidated(true);
        const nodeId = this.getWorldNodeIdForMap(this.state.currentMapId);
        this.markDiscovered(nodeId);
        return;
      }
    }


    if (!this._isWalkableForPlayer(map, nx, ny)) return;

    s.player.x = nx;
    s.player.y = ny;

    // Auto-pickup: stepping onto an item collects it immediately.
    // This keeps the moment-to-moment flow tight and removes the need to "face" the item.
    this.pickupItemAt(map, nx, ny);

    if (this._sfxAssets) this._sfxAssets.playStep(this._surfaceForStep(map));

    // Product shell metadata: count player steps (no UI)
    if (s.stats && typeof s.stats.stepCount === "number") s.stats.stepCount += 1;

    // River Road "delay funnel" tracking (deterministic, no UI)
    const isRiverRoad = map && (map.worldNodeId === "river_road" || map.id === "river_road" || map.id === "river_road_north");
    if (isRiverRoad) {
      if (!s.stats) s.stats = { stepCount: 0, riverRoadSteps: 0 };
      if (typeof s.stats.riverRoadSteps !== "number") s.stats.riverRoadSteps = 0;
      s.stats.riverRoadSteps += 1;

      // "Time away" flag: player has visibly lingered on the easy road.
      if (s.stats.riverRoadSteps >= 120) s.flags.rr_lingered = true;

      // Subtle cost of delay: one persistent Ironwood regression cue.
      if (s.stats.riverRoadSteps >= 160) s.flags.ironwood_delayStagnation = true;
    }

    // Fishing Village "temptation loop" (deterministic, no UI)
    // After the player experiences the first village "belonging/work" beat,
    // every N steps in-village quietly increases Return Pressure.
    const isFishingVillage = map && (map.id === "fishing_village" || map.worldNodeId === "fishing_village");
    if (isFishingVillage) {
      if (!s.stats) s.stats = { stepCount: 0, riverRoadSteps: 0, fishingVillageSteps: 0, fishingVillageTicks: 0 };
      if (typeof s.stats.fishingVillageSteps !== "number") s.stats.fishingVillageSteps = 0;
      if (typeof s.stats.fishingVillageTicks !== "number") s.stats.fishingVillageTicks = 0;
      s.stats.fishingVillageSteps += 1;

      const temptationBeat = !!s.flags.fv_temptationBeat;
      if (temptationBeat && (s.stats.fishingVillageSteps % (RETURN_PRESSURE_CONFIG.stayTickSteps || 12) === 0)) {
        const beforeTier = getReturnPressureTier(s);

        // Only accrue if something at home is unresolved (tier !== "none")
        if (beforeTier !== "none") {
          const rp = ensureReturnPressureState(s.returnPressure);
          rp.comfortDecay += (RETURN_PRESSURE_CONFIG.stayComfortGain || 0.6);
          rp.trustErosion += (RETURN_PRESSURE_CONFIG.stayTrustGain || 0.6);
          rp.stepsAwayFromIronwood += 1;
          s.returnPressure = rp;

          s.stats.fishingVillageTicks += 1;

          const afterTier = getReturnPressureTier(s);
          // One additional, concrete Ironwood consequence (visible, non-critical)
          if ((afterTier === "mid" || afterTier === "high") && !s.flags.ironwood_villageComplacency) {
            s.flags.ironwood_villageComplacency = true;
          }
        }
      }
    }


    // Some maps represent traversals as an NPC-like marker (npcs[] with a `to` field)
    // instead of a tile-based exit (exits[]). Treat those as step-on portals.
    const portalNpc = map.npcs && map.npcs.find(n => n.x === nx && n.y === ny && n.to);
    if (portalNpc) {
      const prev = this.state.currentMapId;
      const dest = maps[portalNpc.to];
      if (!dest) {
        console.error(
          `[MapValidation] Invalid portal target: from=${map.id || prev} at (${nx},${ny}) -> to=${portalNpc.to}`
        );
        this._setFatalError(
          `Invalid portal target.\n\nFrom: ${map.id || prev}\nAt: (${nx}, ${ny})\nTo: ${portalNpc.to}\n\nFix the portal target map id.`
        );
        return;
      }

      // Route gates (data-driven). Never show UI; only a brief diegetic message.
      if (portalNpc.gate && !this._isGateSatisfied(portalNpc.gate)) {
        this._blockGateMessage(portalNpc.gate);
        return;
      }

      if (typeof portalNpc.onTraverse === "function") {
        try { portalNpc.onTraverse(this.state, this); } catch (e) { console.error(e); }
      }

      this.state.currentMapId = portalNpc.to;
      this.state.player.x = portalNpc.spawnX ?? dest.spawnX;
      this.state.player.y = portalNpc.spawnY ?? dest.spawnY;
      this.state.message = portalNpc.message || "";

      // Return Pressure: update hidden state on region traversal
      try {
        this.state.returnPressure = onRegionTraverse(
          prev,
          this.state.currentMapId,
          this.state,
          worldMap,
          maps
        );
      } catch (e) {
        console.warn("[ReturnPressure] Traverse update failed:", e);
      }

      this._resolvePlayerPosition();
      this._recordSafeIfApplicable(this.state.currentMapId);
      this.syncWorldMapCursorToCurrent();
      this.ensureEnemiesForMap(this.state.currentMapId);
      this._ensureMapValidated(true);

      const nodeId = this.getWorldNodeIdForMap(this.state.currentMapId);
      this.markDiscovered(nodeId);
      return;
    }

    const t = map.tiles?.[ny]?.[nx];
    if (t === 2 && map.exits) {
      const exit = map.exits.find(e => e.x === nx && e.y === ny);
      if (exit) {
        const prev = this.state.currentMapId;
        const dest = maps[exit.to];
        if (!dest) {
          console.error(
            `[MapValidation] Invalid exit target: from=${map.id || prev} at (${nx},${ny}) -> to=${exit.to}`
          );
          this._setFatalError(
            `Invalid exit target.\n\nFrom: ${map.id || prev}\nAt: (${nx}, ${ny})\nTo: ${exit.to}\n\nFix the exit target map id.`
          );
          return;
        }

        // Route gates (data-driven). Never show UI; only a brief diegetic message.
        if (exit.gate && !this._isGateSatisfied(exit.gate)) {
          this._blockGateMessage(exit.gate);
          return;
        }

        if (typeof exit.onTraverse === "function") {
          try { exit.onTraverse(this.state, this); } catch (e) { console.error(e); }
        }

        this.state.currentMapId = exit.to;
        this.state.player.x = exit.spawnX ?? dest.spawnX;
        this.state.player.y = exit.spawnY ?? dest.spawnY;
        this.state.message = exit.message || "";

        // Return Pressure: update hidden state on region traversal
        try {
          this.state.returnPressure = onRegionTraverse(
            prev,
            this.state.currentMapId,
            this.state,
            worldMap,
            maps
          );
        } catch (e) {
          console.warn("[ReturnPressure] Traverse update failed:", e);
        }
        // Spawn hygiene: never place the player into a wall after content edits.
        this._resolvePlayerPosition();
        // Update safe anchor when entering hubs.
        this._recordSafeIfApplicable(this.state.currentMapId);
        // Keep world map cursor consistent with actual location.
        this.syncWorldMapCursorToCurrent();

        // Quarry-only enemy seeding on entering a map.
        this.ensureEnemiesForMap(this.state.currentMapId);

        // Validate destination map on transition
        this._ensureMapValidated(true);

        // Discover world nodes as you enter them
        const nodeId = this.getWorldNodeIdForMap(this.state.currentMapId);
        this.markDiscovered(nodeId);

        // If the map wasn't discovered before, also snap cursor when opening later
        if (prev !== this.state.currentMapId) {
          // no-op placeholder for future hooks
        }
        return;
      }
    }

    if (map.stepTriggers) {
      const trigger = map.stepTriggers.find(t => t.x === nx && t.y === ny);
      if (trigger) {
        trigger.run(this.state, this);
      }
    }
  }

  damagePlayer(amount) {
  const s = this.state;
  // Simple i-frames so enemies can't "machine-gun" the player on contact.
  if (s.player.iFramesMs > 0) return;

  const prevHp = s.player.hp;
  s.player.hp = Math.max(0, s.player.hp - amount);
  s.hitFlash = 6;
  s.player.iFramesMs = 550;

  // SFX: player hit feedback (no music; preserve world pressure through sound).
  if (this._sfxAssets && s.player.hp < prevHp) {
    try { this._sfxAssets.playPlayer("hit"); } catch(_) {}
  }

  if (s.player.hp === 0) {
    this.handleKO();
  }
}

  // ----- Enemies (Phase B1-B3: data + persistence + spawning only) -----
  _isWalkableSpawnTile(map, x, y) {
    if (!map || !Array.isArray(map.tiles)) return false;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
    const t = map.tiles[y][x];
    // Avoid walls and exit tiles to reduce softlock risk.
    return t !== 1 && t !== 2;
  }

  _findNearestSpawn(map, x, y, blocked) {
    // Spiral search within small radius.
    const maxR = 4;
    for (let r = 0; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const key = `${nx},${ny}`;
          if (blocked.has(key)) continue;
          if (this._isWalkableSpawnTile(map, nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  ensureEnemiesForMap(mapId) {
    const s = this.state;
    if (!s.enemiesByMap || typeof s.enemiesByMap !== "object") s.enemiesByMap = {};
    const map = maps[mapId];
    const spawns = SPAWNS_BY_MAP?.[mapId];
    if (!map || !Array.isArray(spawns) || spawns.length === 0) {
      if (!s.enemiesByMap[mapId]) s.enemiesByMap[mapId] = [];
      return;
    }

    // If the map already has enemies seeded (e.g., player visited earlier), we still want
    // to allow *newly-unlocked* conditional spawns (checkpoint-gated bosses) to appear.
    // We only add missing spawn ids; we do not resurrect defeated enemies.
    if (Array.isArray(s.enemiesByMap[mapId]) && s.enemiesByMap[mapId].length) {
      const existing = s.enemiesByMap[mapId];
      const have = new Set(existing.map(e => e?.id).filter(Boolean));
      const blocked = new Set();
      blocked.add(`${s.player.x},${s.player.y}`);
      for (const e of existing) {
        if (!e || e.dead || e.state === "dead" || e.hp <= 0) continue;
        blocked.add(`${e.x},${e.y}`);
      }

      const flags = s.flags || {};
      for (const spawn of spawns) {
        // Only consider conditional spawns on already-initialized maps.
        const isConditional = Array.isArray(spawn?.requiresFlags) || Array.isArray(spawn?.requiresNotFlags);
        if (!isConditional) continue;
        if (have.has(spawn.id)) continue;
        if (Array.isArray(spawn?.requiresFlags) && spawn.requiresFlags.length) {
          const ok = spawn.requiresFlags.every(fid => !!flags[fid]);
          if (!ok) continue;
        }
        if (Array.isArray(spawn?.requiresNotFlags) && spawn.requiresNotFlags.length) {
          const blockedBy = spawn.requiresNotFlags.some(fid => !!flags[fid]);
          if (blockedBy) continue;
        }

        const arch = ENEMY_ARCHETYPES?.[spawn.archetypeId];
        if (!arch) continue;

        let pos = null;
        const desired = { x: spawn.x, y: spawn.y };
        const key = `${desired.x},${desired.y}`;
        if (!blocked.has(key) && this._isWalkableSpawnTile(map, desired.x, desired.y)) {
          pos = desired;
        } else {
          pos = this._findNearestSpawn(map, desired.x, desired.y, blocked);
        }
        if (!pos) continue;
        blocked.add(`${pos.x},${pos.y}`);
        existing.push({
          id: spawn.id,
          archetypeId: spawn.archetypeId,
          x: pos.x,
          y: pos.y,
          hp: arch.hpMax,
          state: "idle",
          t: 0,
        });
        have.add(spawn.id);
      }
      return;
    }

    const blocked = new Set();
    // Block current player tile (spawn safety). We also block existing enemies as we place them.
    blocked.add(`${s.player.x},${s.player.y}`);

    const seeded = [];
    for (const spawn of spawns) {
      // Optional conditional spawns (used for checkpoint-gated bosses).
      // - requiresFlags: all must be true
      // - requiresNotFlags: none may be true
      const flags = s.flags || {};
      if (Array.isArray(spawn?.requiresFlags) && spawn.requiresFlags.length) {
        const ok = spawn.requiresFlags.every(fid => !!flags[fid]);
        if (!ok) continue;
      }
      if (Array.isArray(spawn?.requiresNotFlags) && spawn.requiresNotFlags.length) {
        const blockedBy = spawn.requiresNotFlags.some(fid => !!flags[fid]);
        if (blockedBy) continue;
      }

      const arch = ENEMY_ARCHETYPES?.[spawn.archetypeId];
      if (!arch) continue;
      const desired = { x: spawn.x, y: spawn.y };
      const key = `${desired.x},${desired.y}`;
      let pos = null;
      if (!blocked.has(key) && this._isWalkableSpawnTile(map, desired.x, desired.y)) {
        pos = desired;
      } else {
        pos = this._findNearestSpawn(map, desired.x, desired.y, blocked);
      }
      if (!pos) continue;
      blocked.add(`${pos.x},${pos.y}`);
      seeded.push({
        id: spawn.id,
        archetypeId: spawn.archetypeId,
        x: pos.x,
        y: pos.y,
        hp: arch.hpMax,
        state: "idle",
        t: 0,
      });
    }
    s.enemiesByMap[mapId] = seeded;
  }
_getEnemiesForCurrentMap() {
  return this.state.enemiesByMap?.[this.state.currentMapId] || [];
}

_isWalkableForEnemy(map, x, y) {
  if (!map || !Array.isArray(map.tiles)) return false;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  const t = map.tiles[y][x];
  return !(t === 1 || (typeof t === 'number' && t >= 4)); // walls + buildings are solid
}


_grantDropItem(itemId) {
  const s = this.state;
  const id = String(itemId || "").trim();
  if (!id) return;

  // Heart Container: immediate max HP increase (does not clutter inventory).
  if (id === "heart_container") {
    const prev = s.player.maxHp || 5;
    // Boss progression: +4 max health per boss.
    s.player.maxHp = prev + 4;
    // Heal a bit on upgrade, but do not force-full-heal.
    s.player.hp = Math.min(s.player.maxHp, (s.player.hp || s.player.maxHp) + 4);
    s.message = "Found a Heart. Max health increased!";
    this._showToast("Max HP +4");
    return;
  }

  // Default inventory add (name/kind can be enriched by INVENTORY_ID_META).
  const meta = INVENTORY_ID_META?.[id];
  const kind = meta?.kind || (meta?.category === "Weapons" ? "weapon" : "loot");
  const name = meta?.name || id.replace(/_/g, " ");
  s.inventory.push({ id, name, kind, description: meta?.description || "" });
}

_handleEnemyDeath(e, arch) {
  const s = this.state;
  e.dead = true;
  e.state = "dead";

  // Drops: bosses can optionally spawn physical drops on the ground.
  const archId = String(e.archetypeId || "");
  const mapIdForDrop = this.state.currentMapId;

  // Special: Quarry Overseer drops a Heart Piece + Pistol on the ground (pickup by walking over).
  if (archId === "quarry_overseer") {
    if (!this.state.spawnedItemsByMap || typeof this.state.spawnedItemsByMap !== "object") this.state.spawnedItemsByMap = {};
    if (!Array.isArray(this.state.spawnedItemsByMap[mapIdForDrop])) this.state.spawnedItemsByMap[mapIdForDrop] = [];
    const spawned = this.state.spawnedItemsByMap[mapIdForDrop];

    const mapForDrop = this.currentMap;
    const isOpen = (x, y) => {
      if (!mapForDrop) return false;
      if (!this._isWalkableForEnemy(mapForDrop, x, y)) return false;
      // Avoid stacking on existing spawned drops at same tile
      if (spawned.some(it => it.x === x && it.y === y)) return false;
      return true;
    };

    const candidates = [
      { x: e.x, y: e.y },
      { x: e.x + 1, y: e.y },
      { x: e.x - 1, y: e.y },
      { x: e.x, y: e.y + 1 },
      { x: e.x, y: e.y - 1 },
      { x: e.x + 1, y: e.y + 1 },
      { x: e.x - 1, y: e.y + 1 },
      { x: e.x + 1, y: e.y - 1 },
      { x: e.x - 1, y: e.y - 1 },
    ];

    const placeNext = () => {
      for (const c of candidates) if (isOpen(c.x, c.y)) return { x: c.x, y: c.y };
      return { x: e.x, y: e.y };
    };

    const p1 = placeNext();
    spawned.push({
      id: "heart_container",
      name: "Heart Piece",
      description: "A warm pulse in your palm. Increases your maximum health.",
      kind: "relic",
      amount: 1,
      x: p1.x,
      y: p1.y,
    });

    const p2 = placeNext();
    // Ensure pistol doesn't overlap the heart piece.
    if (p2.x === p1.x && p2.y === p1.y) {
      const alt = candidates.find(c => (c.x !== p1.x || c.y !== p1.y) && isOpen(c.x, c.y));
      if (alt) { p2.x = alt.x; p2.y = alt.y; }
    }
    spawned.push({
      id: "pistol",
      name: "Pistol",
      description: "A compact sidearm. Assign to X for quick shots.",
      kind: "weapon",
      amount: 1,
      x: p2.x,
      y: p2.y,
    });


    // Grant any OTHER drops immediately (coins/scripts), but keep Heart Piece + Pistol as physical pickups.
    const drops = arch?.drops || [];
    for (const d of drops) {
      const did = String(d.id || "");
      if (did === "heart_container" || did === "pistol") continue;
      const roll = Math.random();
      if (roll <= (d.chance ?? 0)) {
        const qtyMin = d.min ?? 1;
        const qtyMax = d.max ?? qtyMin;
        const qty = qtyMin + Math.floor(Math.random() * (qtyMax - qtyMin + 1));
        for (let i = 0; i < qty; i++) this._grantDropItem(did);
      }
    }

    try { this._showToast("Drops fell to the ground.", 1200); } catch (_) {}
  } else {
// Drops: simple percent rolls into inventory.
  const drops = arch?.drops || [];
  for (const d of drops) {
    const roll = Math.random();
    if (roll <= (d.chance ?? 0)) {
      const qtyMin = d.min ?? 1;
      const qtyMax = d.max ?? qtyMin;
      const qty = qtyMin + Math.floor(Math.random() * (qtyMax - qtyMin + 1));
      for (let i = 0; i < qty; i++) {
        this._grantDropItem(d.id);
      }
    }
  }

  }

  // Optional onDeath hooks for bosses/quests.
  const onDeath = arch?.onDeath;
  if (onDeath?.setFlag) {
    s.flags[onDeath.setFlag] = true;
  }
  if (onDeath?.completeQuest) {
    const qid = onDeath.completeQuest;
    const def = QUEST_DEFS[qid];
    if (def?.objectives?.length) {
      for (const obj of def.objectives) this.setObjectiveDone(qid, obj.id);
    }
  }

  // Optional: complete a specific objective id.
  // If completeQuest is also provided, we assume the objective belongs to that quest.
  if (onDeath?.completeObjective) {
    const objId = onDeath.completeObjective;
    if (onDeath?.completeQuest) {
      this.setObjectiveDone(onDeath.completeQuest, objId);
    } else {
      // Best-effort: find the quest containing this objective id.
      for (const [qid, def] of Object.entries(QUEST_DEFS || {})) {
        if (def?.objectives?.some?.(o => o.id === objId)) {
          this.setObjectiveDone(qid, objId);
          break;
        }
      }
    }
  }
}

_spawnProjectile(fromX, fromY, dirX, dirY, spec) {
  const s = this.state;
  if (!s.projectiles) s.projectiles = [];
  s.projectiles.push({
    x: fromX + 0.5,
    y: fromY + 0.5,
    dx: dirX,
    dy: dirY,
    speed: spec?.speedTilesPerSec ?? 6,
    remaining: spec?.maxRangeTiles ?? 6,
    damage: spec?.damage ?? 3,
    hitStunMs: spec?.hitStunMs ?? 120,
    owner: spec?.owner ?? "enemy",
    alive: true,
  });
}

_updateProjectiles(dt) {
  const s = this.state;
  const map = this.currentMap;
  if (!s.projectiles || !s.projectiles.length || !map) return;

  for (const p of s.projectiles) {
    if (!p.alive) continue;

    const dist = (p.speed * dt) / 1000;
    const nx = p.x + p.dx * dist;
    const ny = p.y + p.dy * dist;

    const tx = Math.floor(nx);
    const ty = Math.floor(ny);
    if (!this._isWalkableForEnemy(map, tx, ty)) {
      p.alive = false;
      continue;
    }

    p.x = nx;
    p.y = ny;

    p.remaining -= dist;
    if (p.remaining <= 0) {
      p.alive = false;
      continue;
    }

    if ((p.owner || "enemy") === "enemy") {
      if (tx === s.player.x && ty === s.player.y) {
        this.damagePlayer(p.damage);
        p.alive = false;
      }
    } else {
      // Player-owned projectile: hit first enemy on tile
      const enemies = this._getEnemiesForCurrentMap();
      for (const e of enemies) {
        if (e.dead) continue;
        if (e.x === tx && e.y === ty) {
          const arch = ENEMY_ARCHETYPES?.[e.archetypeId];
          const dmg = p.damage ?? 1;
          e.hp = Math.max(0, (e.hp ?? (arch?.hpMax ?? 1)) - dmg);
          e.hitFlash = 6;
          e.state = e.state === "dead" ? "dead" : "hitstun";
          e.hitstunMs = 160;
          if (e.hp <= 0) this._handleEnemyDeath(e, arch);
          p.alive = false;
          break;
        }
      }
    }
  }

  s.projectiles = s.projectiles.filter(p => p.alive);
}

_updateEnemies(dt) {
  const s = this.state;
  const map = this.currentMap;
  if (!map) return;

  const enemies = this._getEnemiesForCurrentMap();
  if (!enemies.length) return;

  const player = s.player;

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (const e of enemies) {
    if (e.dead) continue;

    const arch = ENEMY_ARCHETYPES?.[e.archetypeId];
    if (!arch) continue;

    // Boss phase tuning (simple difficulty curve inside Quarry boss room).
    let effMoveMs = arch.moveSpeedMs ?? 360;           // smaller = faster
    let effTelegraphMs = arch.telegraphMs ?? 240;
    let effCooldownMs = arch.attackCooldownMs ?? 1100;
    if (arch.kind === "boss" && arch.phase2AtHp != null) {
      const hpNow = e.hp ?? arch.hpMax ?? 1;
      if (hpNow <= arch.phase2AtHp) {
        e.phase = 2;
        effMoveMs = Math.max(140, Math.floor(effMoveMs * 0.85));
        effTelegraphMs = Math.max(180, Math.floor(effTelegraphMs * 0.85));
        effCooldownMs = Math.max(650, Math.floor(effCooldownMs * 0.85));
      } else {
        e.phase = 1;
      }
    }

    e.cooldownMs = (e.cooldownMs || 0) - dt;
    e.telegraphMs = (e.telegraphMs || 0) - dt;
    e.moveMs = (e.moveMs || 0) - dt;
    if (e.hitFlash > 0) e.hitFlash -= 1;

    if (e.hitstunMs && e.hitstunMs > 0) {
      e.hitstunMs = Math.max(0, e.hitstunMs - dt);
      continue;
    }

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    const aggro = arch.aggroRangeTiles ?? 6;
    const atkRange = arch.attackRangeTiles ?? 1;
    const mode = arch.ai?.mode || "melee";
    const keepDist = arch.ai?.keepDistanceTiles ?? 0;

    if (!e.state || e.state === "idle") e.state = "patrol";

    const canSeePlayer = dist <= aggro;

    if (canSeePlayer && !["telegraph", "attack", "cooldown"].includes(e.state)) {
      e.state = "chase";
    } else if (!canSeePlayer && e.state === "chase") {
      e.state = "patrol";
    }

    if (e.state === "patrol") {
      if (e.moveMs <= 0) {
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = e.x + d.dx;
        const ny = e.y + d.dy;
        if ((nx !== player.x || ny !== player.y) && this._isWalkableForEnemy(map, nx, ny)) {
          e.x = nx; e.y = ny;
        }
        e.moveMs = effMoveMs;
      }
      continue;
    }

    if (e.state === "chase") {
      if (e.cooldownMs <= 0) {
        if (mode === "ranged") {
          if (dist <= atkRange && dist >= keepDist) {
            e.state = "telegraph";
            e.telegraphMs = effTelegraphMs;
            if (Math.abs(dx) >= Math.abs(dy)) { e.aimDx = dx > 0 ? 1 : -1; e.aimDy = 0; }
            else { e.aimDx = 0; e.aimDy = dy > 0 ? 1 : -1; }
          }
        } else {
          if (dist === 1) {
            e.state = "telegraph";
            e.telegraphMs = effTelegraphMs;
            e.atkTx = player.x;
            e.atkTy = player.y;
          }
        }
      }

      if (e.state === "chase" && e.moveMs <= 0) {
        let stepDx = 0, stepDy = 0;
        if (mode === "ranged" && dist < keepDist) {
          if (Math.abs(dx) >= Math.abs(dy)) stepDx = dx > 0 ? -1 : 1;
          else stepDy = dy > 0 ? -1 : 1;
        } else {
          if (Math.abs(dx) >= Math.abs(dy)) stepDx = dx > 0 ? 1 : -1;
          else stepDy = dy > 0 ? 1 : -1;
        }

        const nx = e.x + stepDx;
        const ny = e.y + stepDy;
        if ((nx !== player.x || ny !== player.y) && this._isWalkableForEnemy(map, nx, ny)) {
          e.x = nx; e.y = ny;
        }
        e.moveMs = effMoveMs;
      }
      continue;
    }

    if (e.state === "telegraph") {
      if (e.telegraphMs <= 0) {
        e.state = "attack";
      }
      continue;
    }

    if (e.state === "attack") {
      if (mode === "ranged") {
        const projSpec = arch.projectile || { speedTilesPerSec: 6, maxRangeTiles: 7, damage: 3 };
        this._spawnProjectile(e.x, e.y, e.aimDx || 0, e.aimDy || 1, projSpec);
      } else {
        if (player.x === e.atkTx && player.y === e.atkTy) {
          this.damagePlayer(arch.contactDamage ?? 3);
        }
      }
      e.cooldownMs = effCooldownMs;
      e.state = "cooldown";
      continue;
    }

    if (e.state === "cooldown") {
      if (e.cooldownMs <= 0) {
        e.state = canSeePlayer ? "chase" : "patrol";
      }
    }
  }
}


  // ----- Update loop -----
  update(dt) {
    const s = this.state;
    const map = this.currentMap;

    // Keep location music in sync with current screen/map.
    this._syncMusic();
    this._syncAmbient();
    this._syncUIScreenSfx();

    // Toast timer should tick even when menus are open.
    if (s.toast && s.toast.ms > 0) {
      // Do not let toasts expire while dialogue/menu overlays are active;
      // otherwise pickup toasts triggered during dialogue would never be seen.
      const hold = s.dialogue?.isActive?.() || s.inventoryOpen || s.worldMapOpen || s.quest?.logOpen;
      if (!hold) {
        s.toast.ms = Math.max(0, s.toast.ms - dt);
        if (s.toast.ms === 0) s.toast.text = "";
      }
    }

    // Keep validations current and prevent hard crashes on bad content.
    this._ensureMapValidated(false);
    if (this._runtime.fatalError || this._runtime.mapError || !map) {
      // Still tick dialogue so text can advance if needed.
      s.dialogue.update(dt);

      this._autosave(dt);
      return;
    }

    // Dialogue update
    s.dialogue.update(dt);

    // Endgame: after the final boss is defeated, the ending card is shown
    // once the player speaks with the Elder and the dialogue concludes.
    if (
      !s.dialogue.isActive() &&
      s.flags?.finalBossDefeated &&
      s.flags?.endingEligible &&
      !s.flags?.endingShown
    ) {
      s.flags.endingShown = true;
      if (!s.ui) s.ui = {};
      s.ui.screen = "ending_card";
      // keep the player in the world; no forced reset.
    }

    // Movement cooldown (avoids “sliding” too fast)
    const STEP_DELAY = 220;
    this._moveCooldown -= dt;

    
// Product shell screens: do not simulate gameplay.
if (s.ui?.screen && s.ui.screen !== "play") {
  // Allow dialogue to tick (harmless) so text speed changes in later steps are safe.
  this._autosave(dt);
  return;
}

// Pause: freeze gameplay simulation except for autosave safety.
if (s.ui?.screen === "pause") {
  this._autosave(dt);
  return;
}

// World map open: use arrows to move selection
if (s.worldMapOpen) {
  if (s.keys["ArrowUp"] || s.keys["ArrowLeft"]) {
    s.keys["ArrowUp"] = false;
    s.keys["ArrowLeft"] = false;
    s.worldMapCursor = (s.worldMapCursor - 1 + worldMap.nodes.length) % worldMap.nodes.length;
  } else if (s.keys["ArrowDown"] || s.keys["ArrowRight"]) {
    s.keys["ArrowDown"] = false;
    s.keys["ArrowRight"] = false;
    s.worldMapCursor = (s.worldMapCursor + 1) % worldMap.nodes.length;
  }
  this._autosave(dt);
  return;
}

// Inventory open: grid navigation (Link's Awakening–style layout)
// Arrows move a cursor across a fixed grid of slots; empty slots are selectable but do nothing.
if (s.inventoryOpen) {
  const panels = buildInventoryPanels(s.inventory);

  const GRID_ROWS = panels.GRID_ROWS;
  const GRID_COLS = panels.GRID_COLS; // 4 left + 4 right
  const GRID_SLOTS = panels.GRID_SLOTS;

  // Cursor lives in slot-space (0..GRID_SLOTS-1), not item-count space.
  if (!Number.isFinite(s.inventoryIndex)) s.inventoryIndex = 0;
  s.inventoryIndex = Math.max(0, Math.min(GRID_SLOTS - 1, s.inventoryIndex | 0));

  const move = (d) => {
    const next = (s.inventoryIndex + d + GRID_SLOTS) % GRID_SLOTS;
    s.inventoryIndex = next;
  };

  if (s.keys["ArrowUp"]) {
    s.keys["ArrowUp"] = false;
    move(-GRID_COLS);
  } else if (s.keys["ArrowDown"]) {
    s.keys["ArrowDown"] = false;
    move(GRID_COLS);
  } else if (s.keys["ArrowLeft"]) {
    s.keys["ArrowLeft"] = false;
    move(-1);
  } else if (s.keys["ArrowRight"]) {
    s.keys["ArrowRight"] = false;
    move(1);
  }

  this._autosave(dt);
  return;
}


// Quest log open: up/down move selection
if (s.quest?.logOpen) {
  const qids = Object.keys(QUEST_DEFS);
  if (s.keys["ArrowUp"]) {
    s.keys["ArrowUp"] = false;
    s.quest.index = (s.quest.index - 1 + Math.max(1, qids.length)) % Math.max(1, qids.length);
  } else if (s.keys["ArrowDown"]) {
    s.keys["ArrowDown"] = false;
    s.quest.index = (s.quest.index + 1) % Math.max(1, qids.length);
  }
  this._autosave(dt);
  return;
}

if (this._moveCooldown <= 0 && !s.dialogue.isActive()) {
      let moved = false;

      if (s.keys["ArrowUp"]) {
        s.player.facing = "up";
        this.tryMove(0, -1);
        moved = true;
      } else if (s.keys["ArrowDown"]) {
        s.player.facing = "down";
        this.tryMove(0, 1);
        moved = true;
      } else if (s.keys["ArrowLeft"]) {
        s.player.facing = "left";
        this.tryMove(-1, 0);
        moved = true;
      } else if (s.keys["ArrowRight"]) {
        s.player.facing = "right";
        this.tryMove(1, 0);
        moved = true;
      }

      if (moved) {
        this._moveCooldown = STEP_DELAY;
      }
    }

    if (s.hitFlash > 0) s.hitFlash -= 1;

    // decrement player i-frames even when no enemies are present
    if (s.player.iFramesMs > 0) s.player.iFramesMs = Math.max(0, s.player.iFramesMs - dt);

    // decrement attack animation timer
    if (s.player.attackAnimMs > 0) s.player.attackAnimMs = Math.max(0, s.player.attackAnimMs - dt);

// Environmental triggers (data-driven reactivity; no UI)
// Run these before combat so authored encounters (boss conversations) can safely fire.
this._processMapTriggers(map);

// When dialogue is active, freeze gameplay simulation.
// This prevents bosses/enemies from attacking during authored conversations.
if (s.dialogue.isActive()) {
  this._autosave(dt);
  return;
}

// Combat systems (Quarry-only enemies)
this._updateProjectiles(dt);
this._updateEnemies(dt);


// Camera follow, clamped to map
    const cam = s.camera;
    cam.x = Math.max(
      0,
      Math.min(s.player.x - Math.floor(cam.width / 2), map.width - cam.width)
    );
    cam.y = Math.max(
      0,
      Math.min(s.player.y - Math.floor(cam.height / 2), map.height - cam.height)
    );

    this._autosave(dt);
  }

  // ----- Render -----

  // ----- Performance: cached tile layer rendering -----
  _getTileLayerKey(map) {
    const biome = (map && map.biome) ? map.biome : "forest";
        const bld = (map && map.buildingTileset) ? map.buildingTileset : biome;
    return `${map.id || "unknown"}::${biome}::bld:${bld}`;
  }

  _ensureTileLayerCache(map) {
    if (!map) return null;

    const biome = (map && map.biome) ? map.biome : "forest";
        const tileset = this.assets.tilesets?.[biome] || this.assets.tilesets.forest;
    const buildingId = (map && map.buildingTileset) ? map.buildingTileset : biome;
    const buildingTileset = this.assets.buildingTilesets?.[buildingId] || tileset;
    const ready = !!(tileset && tileset.complete && tileset.naturalWidth);
    const buildingReady = !!(buildingTileset && buildingTileset.complete && buildingTileset.naturalWidth);
    const allReady = ready && buildingReady;

    const key = this._getTileLayerKey(map);
    const prevReady = this._runtime.tileLayerCacheReady[key];

    // If tileset isn't ready yet, defer; if it just became ready, rebuild.
        if (!allReady) {
      this._runtime.tileLayerCacheReady[key] = false;
      return null;
    }

    if (this._runtime.tileLayerCache[key] && prevReady) return this._runtime.tileLayerCache[key];

    // Build prerendered full-map tile layer.
    const srcTile = 16;

    // Default 4-tile mapping (legacy)
    const tileSrc = {
      ground: { sx: 0, sy: 0 },
      wall: { sx: 16, sy: 0 },
      path: { sx: 32, sy: 0 },
      decor: { sx: 48, sy: 0 },
    };

    // v1.9.3: Forest biome expanded tiles (Pokémon-style autotile + ground variety)
    // NOTE: Map data remains the same: 0=ground, 1=wall, 2=path-marker, 3=decor
    // Rendering derives variants from context (no collision changes).
    const forestSrc = {
      grassA:   { sx: 0,   sy: 0 },
      wall:     { sx: 16,  sy: 0 },
      pathC:    { sx: 32,  sy: 0 },
      stump:    { sx: 48,  sy: 0 },
      grassB:   { sx: 64,  sy: 0 },
      grassC:   { sx: 80,  sy: 0 },
      flower:   { sx: 96,  sy: 0 },

      pathH:    { sx: 32,  sy: 0 },
      pathV:    { sx: 32,  sy: 0 },
      cornerNW: { sx: 32,  sy: 0 },
      cornerNE: { sx: 32,  sy: 0 },
      cornerSW: { sx: 32,  sy: 0 },
      cornerSE: { sx: 32,  sy: 0 },
      endCap:   { sx: 32,  sy: 0 },
      teeS:     { sx: 32,  sy: 0 },
    };

    const _strHash = (s) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const _hash2 = (x, y, seed) => {
      // deterministic 32-bit mix
      let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ seed) >>> 0;
      h ^= h >>> 16;
      h = Math.imul(h, 2246822507) >>> 0;
      h ^= h >>> 13;
      h = Math.imul(h, 3266489909) >>> 0;
      h ^= h >>> 16;
      return h >>> 0;
    };

    // Some maps want perfectly uniform grass (no noise/flowers) for a cleaner Pokémon-town read.
    // These maps are already designed to communicate walkability via layout + building footprints.
    const FOREST_PLAIN_GROUND_MAP_IDS = new Set([
      "upper_forest_camp",
      "lower_forest_camp",
      "ironwood_town",
      "ironwood_junction",
    ]);

    const forestGroundSrc = (x, y, mapId) => {
      if (FOREST_PLAIN_GROUND_MAP_IDS.has(String(mapId || ""))) {
        return forestSrc.grassA;
      }

      const seed = _strHash(String(mapId || "forest"));
      const r = _hash2(x, y, seed) % 64;

      // ~3% flowers, otherwise subtle grass variance
      if (r === 0 || r === 1) return forestSrc.flower;
      if (r % 3 === 0) return forestSrc.grassB;
      if (r % 5 === 0) return forestSrc.grassC;
      return forestSrc.grassA;
    };

    const forestPathSrc = (map, x, y) => {
      const isPath = (xx, yy) => {
        if (yy < 0 || yy >= map.height || xx < 0 || xx >= map.width) return false;
        return (Array.isArray(map.tiles?.[yy]) ? (map.tiles[yy][xx] || 0) : 0) === 2;
      };

      const u = isPath(x, y - 1);
      const d = isPath(x, y + 1);
      const l = isPath(x - 1, y);
      const r = isPath(x + 1, y);

      // Straight segments
      if ((l || r) && !(u || d)) return forestSrc.pathH;
      if ((u || d) && !(l || r)) return forestSrc.pathV;

      // Corners
      if (d && r && !u && !l) return forestSrc.cornerNW; // opening down+right => NW corner of grass
      if (d && l && !u && !r) return forestSrc.cornerNE;
      if (u && r && !d && !l) return forestSrc.cornerSW;
      if (u && l && !d && !r) return forestSrc.cornerSE;

      // Dead end
      if ((u && !d && !l && !r) || (d && !u && !l && !r) || (l && !u && !d && !r) || (r && !u && !d && !l)) {
        return forestSrc.endCap;
      }

      // 3-way (basic)
      if (u && l && r && !d) return forestSrc.teeS;
      if (d && l && r && !u) return forestSrc.teeS; // reuse, acceptable in GB scale

      // 4-way / fallback
      return forestSrc.pathC;
    };


    const off = document.createElement("canvas");
    off.width = map.width * TILE_SIZE;
    off.height = map.height * TILE_SIZE;
    const octx = off.getContext("2d");
    octx.imageSmoothingEnabled = false;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = (map.tiles && map.tiles[y]) ? (map.tiles[y][x] || 0) : 0;

        // v1.9.10: Support richer tile indices (4+) for buildings/props while keeping legacy map semantics.
        // 0=ground, 1=wall, 2=path-marker, 3=decor. Tiles 4+ are treated as direct atlas indices.
                const drawAtlasIndex = (img, idx) => {
          const cols = Math.max(1, Math.floor(((img && img.naturalWidth) ? img.naturalWidth : (8 * srcTile)) / srcTile));
          const i = Math.max(0, idx | 0);
          const sx = (i % cols) * srcTile;
          const sy = Math.floor(i / cols) * srcTile;
          octx.drawImage(
            img,
            sx, sy, srcTile, srcTile,
            x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE
          );
        };

        const isExitPad = (() => {
          const exits = map.exits || [];
          for (let i = 0; i < exits.length; i++) {
            const e = exits[i];
            if (!e) continue;
            if ((e.x | 0) === x && (e.y | 0) === y) return true;
          }
          return false;
        })();

        // Forest: Pokémon-ish ground variety + path autotile. Others: legacy mapping.
        if (biome === "forest") {
          // Special encoding:
          //  - tile indices >=2000 draw directly from the building tileset (used for docks/wood platforms, etc.)
          //  - tile indices >=1000 draw directly from the biome tileset (used for rails/water/props, etc.)
          if (t >= 2000) {
            drawAtlasIndex(buildingTileset, t - 2000);
          } else if (t >= 1000) {
            drawAtlasIndex(tileset, t - 1000);
          } else if (t >= 4) {
            drawAtlasIndex(buildingTileset, t);
          } else if (t === 1) {
            const src = forestSrc.wall;
            octx.drawImage(tileset, src.sx, src.sy, srcTile, srcTile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          } else if (t === 2) {
            const src = forestPathSrc(map, x, y);
            octx.drawImage(tileset, src.sx, src.sy, srcTile, srcTile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          } else if (t === 3) {
            // base grass + stump overlay
            const g = forestGroundSrc(x, y, map.id);
            octx.drawImage(tileset, g.sx, g.sy, srcTile, srcTile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            const d = forestSrc.stump;
            octx.drawImage(tileset, d.sx, d.sy, srcTile, srcTile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          } else {
            const g = forestGroundSrc(x, y, map.id);
            octx.drawImage(tileset, g.sx, g.sy, srcTile, srcTile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        } else {
          // Non-forest: legacy 0-3 mapping, but allow richer encodings:
          //  - >=2000: direct building tileset index
          //  - >=1000: direct biome tileset index
          //  - >=4:    legacy building/prop direct index
          if (t >= 2000) {
            drawAtlasIndex(buildingTileset, t - 2000);
          } else if (t >= 1000) {
            drawAtlasIndex(tileset, t - 1000);
          } else if (t >= 4) {
            drawAtlasIndex(buildingTileset, t);
          } else {
            const base = (t === 1) ? tileSrc.wall : (t === 2) ? tileSrc.path : tileSrc.ground;
            octx.drawImage(
              tileset,
              base.sx, base.sy, srcTile, srcTile,
              x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE
            );
            if (t === 3) {
              octx.drawImage(
                tileset,
                tileSrc.decor.sx, tileSrc.decor.sy, srcTile, srcTile,
                x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE
              );
            }
          }
        }

        // v1.9.10: Exit/entry pads always render as a consistent “door-mat” tile.
        // We draw this on top so it reads even on busy ground.
        if (isExitPad) {
          // Use a high-contrast “threshold” tile so exits read at a glance.
// Forest exits were blending into grass; use a dirt/brown patch tile from the forest atlas.
// Other biomes continue to use their path tile (index 2).
          if (biome === "forest") {
            // Forest atlas index 41 = dirt patch with brown tones
            drawAtlasIndex(tileset, 41);
          } else {
            drawAtlasIndex(tileset, 2);
          }
        }
      }
    }

    this._runtime.tileLayerCache[key] = { canvas: off };
    this._runtime.tileLayerCacheReady[key] = true;
    return this._runtime.tileLayerCache[key];
  }

  // ----- Music routing (map + screen + nearby enemies) -----
  _isCombatHot() {
    const s = this.state;
    const mapId = s.currentMapId;
    const list = s.enemiesByMap?.[mapId];
    if (!Array.isArray(list) || list.length === 0) return false;

    const px = s.player?.x ?? 0;
    const py = s.player?.y ?? 0;

    // Consider "hot" if an alive enemy is within a small Manhattan radius.
    const R = 4;
    for (const e of list) {
      if (!e || e.state === "dead" || e.hp <= 0) continue;
      const dx = Math.abs((e.x ?? 999) - px);
      const dy = Math.abs((e.y ?? 999) - py);
      if (dx + dy <= R) return true;
    }
    return false;
  }

  _syncMusic() {
    if (!this._music) return;
    const s = this.state;

    const desired = this._music.desiredTrackForState({
      mode: s.ui?.screen,
      mapId: s.currentMapId,
      combatActive: this._isCombatHot(),
    });

    if (!desired) return;

    // Crossfade gently between region themes; faster fade for combat.
    const fadeMs = desired === "combat" ? 250 : 650;
    this._music.play(desired, { fadeMs });
  }
  _syncAmbient() {
    if (!this._ambient) return;
    const s = this.state;
    const desired = this._ambient.desiredAmbientForState({
      mode: s.ui?.screen,
      mapId: s.currentMapId,
    });
    if (!desired) return;
    this._ambient.play(desired, { fadeMs: 650 });
  }

  _syncUIScreenSfx() {
    if (!this._sfxAssets) return;
    const s = this.state;
    const now = s.ui?.screen || "title";
    if (!this._lastUIScreen) this._lastUIScreen = now;

    if (now !== this._lastUIScreen) {
      // Open when entering non-play screens; close when returning to play.
      const prev = this._lastUIScreen;
      this._lastUIScreen = now;

      const enteringMenu = (now !== "play" && now !== "title");
      const leavingMenu = (prev !== "play" && prev !== "title") && (now === "play" || now === "title");

      if (enteringMenu) this._sfxAssets.playUI("open");
      else if (leavingMenu) this._sfxAssets.playUI("close");
    }

    // Inventory navigation cue (lightweight; no new UI)
    const invIdx = s.inventoryIndex || 0;
    if (invIdx !== this._lastInventoryIndex) {
      this._lastInventoryIndex = invIdx;
      // Only when inventory panel is visible (pause menu inventory section)
      if (s.ui?.screen === "pause") this._sfxAssets.playUI("scroll");
    }
  }

  _surfaceForStep(map) {
    // Heuristic: grounded, deterministic, no new tile semantics.
    // Interiors use wood; quarry/canyon uses stone; coast uses dirt; forest uses grass.
    const bld = (map && map.buildingTileset) ? String(map.buildingTileset) : "";
    if (bld.startsWith("wood")) return "wood";
    const biome = (map && map.biome) ? String(map.biome) : "forest";
    if (biome === "canyon") return "stone";
    if (biome === "coast") return "dirt";
    return "grass";
  }




  render() {
    const ctx = this.ctx;
    const s = this.state;
    const map = this.currentMap;
    const cam = s.camera;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

// Product shell screens (title/settings/credits/pause/confirm)
if (s.ui?.screen && s.ui.screen !== "play") {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

  const centerX = Math.floor(this.canvas.width / 2);
  const drawCentered = (text, y, color = "#ffffff") => {
    ctx.fillStyle = color;
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(text, centerX, y);
  };

  // Title screen
  if (s.ui.screen === "title") {
    drawCentered("Ironwood Crossing", 28, "#ffffff");
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(BUILD_VERSION, centerX, 52);
    // Save slots (1–3) + metadata
    ctx.textAlign = "left";
    ctx.font = "10px monospace";
    const slotX = 24;
    let slotY = 68;
    const selected = this._runtime.selectedSlot || 1;
    for (let slot = 1; slot <= 3; slot++) {
      const meta = this._readSlotMeta(slot);
      const line = this._formatSlotLine(meta);
      const prefix = (slot === selected) ? "> " : "  ";
      ctx.fillStyle = (slot === selected) ? "#ffffff" : "rgba(255,255,255,0.7)";
      ctx.fillText(`${prefix}Slot ${slot}: ${line}`, slotX, slotY);
      slotY += 14;
    }
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("Left/Right: change slot", slotX, slotY + 6);
    ctx.textAlign = "center";


    const items = this._getTitleMenuItems();
    ctx.textAlign = "left";
    ctx.font = "12px monospace";
    const startY = 150;
    const startX = 44;
    for (let i = 0; i < items.length; i++) {
      const y = startY + i * 18;
      const selected = i === (s.ui.titleIndex || 0);
      ctx.fillStyle = selected ? "#ffdd55" : "#ffffff";
      ctx.fillText((selected ? "> " : "  ") + items[i].label, startX, y);
    }

    ctx.textAlign = "left";
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Enter: Select   ↑/↓: Navigate", 16, this.canvas.height - 24);
    ctx.textAlign = "left";
    return;
  }

  // Controls card (shown before entering gameplay from Title)
  if (s.ui.screen === "controls_card") {
    drawCentered("Controls", 30, "#ffffff");
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    const startX = 36;
    let y = 64;
    const lines = [
      "Move: Arrow Keys",
      "Interact / Advance Dialogue: E",
      "Attack: Z",
      "Inventory: I",
      "World Map: M",
      "Pause Menu: Esc",
      "",
      "Tip: enemies telegraph attacks — backstep when they flash."
    ];
    for (const line of lines) {
      ctx.fillText(line, startX, y);
      y += 16;
    }
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "left";
    ctx.fillText("Enter/E: Continue   Esc: Back", 16, this.canvas.height - 24);
    return;
  }

  // Intro card (shown before Controls when starting a new game)
  if (s.ui.screen === "intro_card") {
    drawCentered("Prologue", 30, "#ffffff");
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    const startX = 28;
    let y = 62;
        const lines = [
      "During the war of 1846, many left Ironwood to protect it.",
      "When they returned, they found their homes claimed by those who stayed.",
      "",
      "You come back to a town that no longer knows your name \u2014",
      "and a road that will test whether you still deserve it.",
      "",
      "Walk. Listen. Do the work in front of you.",
      "Return is a choice.",
    ];
    for (const line of lines) {
      ctx.fillText(line, startX, y);
      y += 16;
    }
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "left";
    ctx.fillText("Enter/E: Continue   Esc: Back", 16, this.canvas.height - 24);
    return;
  }

  // Ending card (shown after final boss + report to Elder)
  if (s.ui.screen === "ending_card") {
    drawCentered("Epilogue", 30, "#ffffff");
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    const startX = 28;
    let y = 62;
    const lines = [
      "Deacon Vale is gone.",
      "",
      "Ironwood gets to breathe — not because it was saved by fate,",
      "but because someone chose to return and finish the job.",
      "",
      "Thanks for playing."
    ];
    for (const line of lines) {
      ctx.fillText(line, startX, y);
      y += 16;
    }
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "left";
    ctx.fillText("Enter/E: Return to Title", 16, this.canvas.height - 24);
    return;
  }

  // KO card (shown immediately after the player faints)
  if (s.ui.screen === "ko_card") {
    drawCentered("You fainted", 34, "#ffffff");
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    const startX = 36;
    let y = 72;
    const lines = [
      "Your legs give out. The world narrows.",
      "",
      "You wake somewhere safer."
    ];
    for (const line of lines) {
      ctx.fillText(line, startX, y);
      y += 16;
    }
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "left";
    ctx.fillText("Enter/E: Continue", 16, this.canvas.height - 24);
    return;
  }

  // Pause menu (rendered as a full-screen shell for simplicity)
  if (s.ui.screen === "pause") {
    drawCentered("Paused", 36, "#ffffff");
    const items = this._getPauseMenuItems();
    ctx.textAlign = "left";
    ctx.font = "12px monospace";
    const startY = 92;
    const startX = 44;
    for (let i = 0; i < items.length; i++) {
      const y = startY + i * 18;
      const selected = i === (s.ui.pauseIndex || 0);
      ctx.fillStyle = selected ? "#ffdd55" : "#ffffff";
      ctx.fillText((selected ? "> " : "  ") + items[i].label, startX, y);
    }
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Enter: Select   Esc: Resume", 16, this.canvas.height - 24);
    return;
  }

  // Confirm overwrite
  if (s.ui.screen === "confirm_new") {
    drawCentered("Start New Game?", 36, "#ffffff");
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("This will overwrite your current save.", centerX, 58);

    const items = ["Yes, overwrite", "No"];
    ctx.textAlign = "left";
    ctx.font = "12px monospace";
    const startY = 100;
    const startX = 44;
    for (let i = 0; i < items.length; i++) {
      const y = startY + i * 18;
      const selected = i === (s.ui.confirmIndex || 0);
      ctx.fillStyle = selected ? "#ffdd55" : "#ffffff";
      ctx.fillText((selected ? "> " : "  ") + items[i], startX, y);
    }
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Enter: Confirm   Esc: Cancel", 16, this.canvas.height - 24);
    return;
  }

  // Settings stub
  if (s.ui.screen === "settings") {
    drawCentered("Settings", 36, "#ffffff");

    const page = s.ui.settingsPage || "main";
    const startX = 24;
    let y = 78;

    if (page === "controls") {
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const lines = [
        "Controls",
        "",
        "Move: Arrow Keys",
        "Interact / Advance Dialogue: E",
        "Attack: Z",
        "Inventory: I",
        "World Map: M",
        "Quest Log: Q",
        "Pause / Back: Esc",
      ];
      for (const line of lines) {
        ctx.fillText(line, startX, y);
        y += 16;
      }
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("Esc: Back", 16, this.canvas.height - 24);
      return;
    }

    // Main settings page
    const items = [
      { id: "textSpeed", label: "Text Speed" },
      { id: "musicVolume", label: "Music Volume" },
      { id: "sfxVolume", label: "SFX Volume" },
      { id: "controls", label: "Controls" },
      { id: "back", label: "Back" },
    ];

    const fmtPct = (v) => {
      const n = Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 100);
      return `${n}%`;
    };

    ctx.textAlign = "left";
    ctx.font = "12px monospace";
    const idx = s.ui.settingsIndex || 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const selected = i === idx;
      ctx.fillStyle = selected ? "#ffdd55" : "#ffffff";

      let value = "";
      if (it.id === "textSpeed") value = (s.settings?.textSpeed || "normal").toUpperCase();
      if (it.id === "musicVolume") value = fmtPct(s.settings?.musicVolume);
      if (it.id === "sfxVolume") value = fmtPct(s.settings?.sfxVolume);
      if (it.id === "controls") value = ">";
      if (it.id === "back") value = "";

      const line = value ? `${it.label}: ${value}` : it.label;
      ctx.fillText((selected ? "> " : "  ") + line, startX, y);
      y += 18;
    }

    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("↑/↓: Navigate   ←/→: Adjust   Enter: Select   Esc: Back", 16, this.canvas.height - 24);
    return;
  }

  // Credits (scrollable)
  if (s.ui.screen === "credits") {
    drawCentered("Credits", 36, "#ffffff");
    ctx.textAlign = "left";
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.88)";

    const lineH = 16;
    const left = 24;
    const top = 64;
    const bottom = this.canvas.height - 52;
    const viewH = Math.max(0, bottom - top);
    const totalH = CREDITS_LINES.length * lineH;
    const maxScroll = Math.max(0, totalH - viewH);
    const scroll = Math.max(0, Math.min(maxScroll, s.ui.creditsScroll || 0));
    s.ui.creditsScroll = scroll;

    for (let i = 0; i < CREDITS_LINES.length; i++) {
      const y = top + i * lineH - scroll;
      if (y < top - lineH || y > bottom + lineH) continue;
      ctx.fillText(CREDITS_LINES[i], left, y);
    }

    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("↑/↓: Scroll   Enter/Esc: Back", 16, this.canvas.height - 24);
    return;
  }

  return;
}


    // UI helper: tile a 32x32 panel sprite as a lightweight skin.
    const drawPanel = (x, y, w, h) => {
      const panel = this.assets.uiPanel;
      const has = !!(panel && panel.complete && panel.naturalWidth);
      if (!has) {
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "rgba(240,236,220,0.95)";
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        return;
      }
      const tile = 32;
      for (let py = y; py < y + h; py += tile) {
        for (let px = x; px < x + w; px += tile) {
          const dw = Math.min(tile, x + w - px);
          const dh = Math.min(tile, y + h - py);
          ctx.drawImage(panel, 0, 0, dw, dh, px, py, dw, dh);
        }
      }
      ctx.strokeStyle = "rgba(240,236,220,0.95)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    };

    if (this._runtime.fatalError) {
      this._renderErrorOverlay(this._runtime.fatalError);
      return;
    }

    if (this._runtime.mapError || !map) {
      this._renderErrorOverlay(
        this._runtime.mapError || `Missing map: ${this.state.currentMapId}`
      );
      return;
    }

    // World map overlay
    if (s.worldMapOpen) {
      this.renderWorldMap();
      return;
    }

    // tiles (image-based tilesets)
    const cachedLayer = this._ensureTileLayerCache(map);
    if (cachedLayer && cachedLayer.canvas) {
      const sx = cam.x * TILE_SIZE;
      const sy = cam.y * TILE_SIZE;
      const sw = cam.width * TILE_SIZE;
      const sh = cam.height * TILE_SIZE;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cachedLayer.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    } else {
        const biome = (map && map.biome) ? map.biome : "forest";
            const tileset = this.assets.tilesets?.[biome] || this.assets.tilesets.forest;
    const buildingId = (map && map.buildingTileset) ? map.buildingTileset : biome;
    const buildingTileset = this.assets.buildingTilesets?.[buildingId] || tileset;
        const hasTileset = !!(tileset && tileset.complete && tileset.naturalWidth);
        const srcTile = 16;
    
        // tile index -> source coords within tileset (top row)
        const tileSrc = {
          ground: { sx: 0, sy: 0 },
          wall: { sx: 16, sy: 0 },
          path: { sx: 32, sy: 0 },
          decor: { sx: 48, sy: 0 },
        };
    
        for (let ty = 0; ty < cam.height; ty++) {
          for (let tx = 0; tx < cam.width; tx++) {
            const mx = cam.x + tx;
            const my = cam.y + ty;
    
            if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) continue;
    
            const tile = map.tiles[my][mx];
            const px = tx * TILE_SIZE;
            const py = ty * TILE_SIZE;
    
            if (hasTileset) {
              // Base
              const base = (tile === 1) ? tileSrc.wall : (tile === 2) ? tileSrc.path : tileSrc.ground;
              ctx.drawImage(tileset, base.sx, base.sy, srcTile, srcTile, px, py, TILE_SIZE, TILE_SIZE);
    
              // Decorative overlay for tile 3 (keeps legacy semantics)
              if (tile === 3) {
                const dec = tileSrc.decor;
                ctx.drawImage(tileset, dec.sx, dec.sy, srcTile, srcTile, px, py, TILE_SIZE, TILE_SIZE);
              }
            } else {
              // Fallback: legacy blockout colors
              if (tile === 1) ctx.fillStyle = "#0f3823";
              else if (tile === 2) ctx.fillStyle = "#c2aa40";
              else ctx.fillStyle = "#d9f5c6";
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              if (tile === 3) {
                ctx.fillStyle = "#446b3c";
                ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
              }
            }
          }
        }
    
    }

    // --- draw NPCs -------------------------------------------------
    if (map.npcs && map.npcs.length) {
      for (const npc of map.npcs) {
        const sx = npc.x - cam.x;
        const sy = npc.y - cam.y;

        if (sx < 0 || sy < 0 || sx >= cam.width || sy >= cam.height) continue;

        const px = sx * TILE_SIZE;
        const py = sy * TILE_SIZE;

        const sheet = this.assets.sprites.npcs;
        const has = !!(sheet && sheet.complete && sheet.naturalWidth);
        if (has) {
          // NPC sprite sheet is 16x16 cells laid out horizontally.
          // Indexing is stable: add new sprites by appending cells to the right.
          const cols = Math.max(1, Math.floor((sheet.naturalWidth || sheet.width) / 16));
          const id = (npc.id || "").toLowerCase();
          const inferred = (id.includes("elder") || id.includes("caretaker")) ? 0
            : (id.includes("worker") || id.includes("labor") || id.includes("foreman")) ? 1
            : (id.includes("merchant") || id.includes("trader") || id.includes("broker") || id.includes("shop")) ? 2
            : (id.includes("enforcer") || id.includes("guard") || id.includes("bandit")) ? 3
            : (id.includes("miner") || id.includes("quarry")) ? 4
            : (id.includes("scout") || id.includes("trap") || id.includes("ranger")) ? 5
            : 1;
          const idx = (npc.spriteIndex != null) ? npc.spriteIndex : inferred;
          const sx = (idx % cols) * 16;
          const sy = Math.floor(idx / cols) * 16;
          ctx.drawImage(sheet, sx, sy, 16, 16, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = "#112211";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = "#66aa44";
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        }
      }
    }

    // Items (authored + runtime spawned drops)
    const mapIdForItems = map.id || s.currentMapId;
    const spawnedItems = (s.spawnedItemsByMap && Array.isArray(s.spawnedItemsByMap[mapIdForItems])) ? s.spawnedItemsByMap[mapIdForItems] : [];
    const allItems = [...(map.items || []), ...spawnedItems];

    allItems.forEach(it => {
      if (
        it.x < cam.x ||
        it.y < cam.y ||
        it.x >= cam.x + cam.width ||
        it.y >= cam.y + cam.height
      )
        return;
      const px = (it.x - cam.x) * TILE_SIZE;
      const py = (it.y - cam.y) * TILE_SIZE;
      const iconSheet = this.assets.sprites.items;
      const hasIcons = !!(iconSheet && iconSheet.complete && iconSheet.naturalWidth);
      if (hasIcons) {
        const cols = Math.max(1, Math.floor((iconSheet.naturalWidth || iconSheet.width) / 16));
        const id = (it.id || "").toLowerCase();
        const idx = getItemIconIndex(id);
        const sx = (idx % cols) * 16;
        const sy = Math.floor(idx / cols) * 16;
        ctx.drawImage(iconSheet, sx, sy, 16, 16, px, py, TILE_SIZE, TILE_SIZE);
      } else {
        // Fallback: legacy marker
        ctx.fillStyle = "#ffd54f";
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      }
    });


// Projectiles (runtime-only)
(s.projectiles || []).forEach(p => {
  const tx = Math.floor(p.x);
  const ty = Math.floor(p.y);
  if (
    tx < cam.x || ty < cam.y ||
    tx >= cam.x + cam.width || ty >= cam.y + cam.height
  ) return;
  const px = (tx - cam.x) * TILE_SIZE;
  const py = (ty - cam.y) * TILE_SIZE;
  ctx.fillStyle = "#222222";
  ctx.fillRect(px + 12, py + 12, TILE_SIZE - 24, TILE_SIZE - 24);
});

// Enemies (data-driven, per-map)
(s.enemiesByMap?.[s.currentMapId] || []).forEach(e => {
  if (e.dead) return;
  if (
    e.x < cam.x ||
    e.y < cam.y ||
    e.x >= cam.x + cam.width ||
    e.y >= cam.y + cam.height
  ) return;

  const arch = ENEMY_ARCHETYPES?.[e.archetypeId];
  const px = (e.x - cam.x) * TILE_SIZE;
  const py = (e.y - cam.y) * TILE_SIZE;

  // Telegraph indicator (in-world, no new UI)
  if (e.state === "telegraph") {
    const isBoss = arch?.kind === "boss";
    const base = isBoss ? "#ffdddd" : "#ffeeaa";

    // Always highlight the enemy tile lightly.
    ctx.fillStyle = base;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    if (arch?.ai?.mode === "ranged") {
      // Marksman aim line (simple cardinal ray)
      const dx = e.aimDx || 0;
      const dy = e.aimDy || 1;
      const max = arch?.projectile?.maxRangeTiles ?? 6;
      for (let i = 1; i <= max; i++) {
        const lx = e.x + dx * i;
        const ly = e.y + dy * i;
        if (!this._isWalkableForEnemy(map, lx, ly)) break;
        if (
          lx < cam.x || ly < cam.y ||
          lx >= cam.x + cam.width || ly >= cam.y + cam.height
        ) continue;
        const lpx = (lx - cam.x) * TILE_SIZE;
        const lpy = (ly - cam.y) * TILE_SIZE;
        ctx.fillStyle = isBoss ? "rgba(255,120,120,0.30)" : "rgba(255,238,170,0.35)";
        ctx.fillRect(lpx + 8, lpy + 8, TILE_SIZE - 16, TILE_SIZE - 16);
      }
    } else {
      // Melee: highlight the intended strike tile, if known.
      const tx = e.atkTx;
      const ty = e.atkTy;
      if (Number.isFinite(tx) && Number.isFinite(ty)) {
        if (
          tx >= cam.x && ty >= cam.y &&
          tx < cam.x + cam.width && ty < cam.y + cam.height
        ) {
          const tpx = (tx - cam.x) * TILE_SIZE;
          const tpy = (ty - cam.y) * TILE_SIZE;
          ctx.fillStyle = isBoss ? "rgba(255,120,120,0.35)" : "rgba(255,238,170,0.40)";
          ctx.fillRect(tpx + 6, tpy + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        }
      }
    }
  }

  const sheet = this.assets.sprites.enemies;
  const hasEnemySprites = !!(sheet && sheet.complete && sheet.naturalWidth);
  if (hasEnemySprites) {
    // enemies.png: index 0 = bandit (incl. marksman/overseer), index 1 = coyote
    const idx = (e.spriteIndex != null)
      ? e.spriteIndex
      : (e.archetypeId && e.archetypeId.includes("wolf"))
        ? 1
        : 0;
    const sx = (idx % 2) * 16;
    ctx.drawImage(sheet, sx, 0, 16, 16, px, py, TILE_SIZE, TILE_SIZE);

    if (arch?.kind === "boss") {
      ctx.strokeStyle = "rgba(240,180,140,0.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    if (e.hitFlash > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    }
  } else {
    // Fallback: legacy colored blocks
    if (e.hitFlash > 0) {
      ctx.fillStyle = "#ffffff";
    } else {
      ctx.fillStyle = "#aa3333";
      if (arch?.kind === "animal") ctx.fillStyle = "#7a4a2e";
      if (arch?.kind === "boss") ctx.fillStyle = "#6b1f1f";
    }
    ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }
});

    // Player (sprite sheet: 3 cols [idle, walk1, walk2] x 8 rows [move: down,right,left,up | attack: down,right,left,up], 16x24 frames)
    const px = (s.player.x - cam.x) * TILE_SIZE;
    const py = (s.player.y - cam.y) * TILE_SIZE;
    const ps = this.assets.sprites.player;
    const hasPlayer = !!(ps && ps.complete && ps.naturalWidth);

    if (hasPlayer) {
      // Sheet rows: move = down(0), right(1), left(2), up(3); attack = down(4), right(5), left(6), up(7)
      const baseRow = ({ down: 0, right: 1, left: 2, up: 3 })[s.player.facing] ?? 0;
      const isAttacking = (s.player.attackAnimMs || 0) > 0;
      const dirRow = isAttacking ? (baseRow + 4) : baseRow;
      const moving = !!(s.keys["ArrowUp"] || s.keys["ArrowDown"] || s.keys["ArrowLeft"] || s.keys["ArrowRight"]);
      const t = Math.floor((this.lastTime || 0) / 180) % 2;
      const col = isAttacking ? 0 : (moving ? (t ? 1 : 2) : 0);
      const srcW = 16;
      const srcH = 24;
      const dstW = TILE_SIZE;
      const dstH = Math.floor(TILE_SIZE * (srcH / srcW));
      const drawY = py + TILE_SIZE - dstH;
      ctx.drawImage(ps, col * srcW, dirRow * srcH, srcW, srcH, px, drawY, dstW, dstH);
      if (s.hitFlash > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }

    // Bottom Status Bar (Link's Awakening–style)
    const HUD_H = 44;
    const hudY = this.canvas.height - HUD_H;

    // Coin total is derived from inventory coin items (small_coin=1, coin_bundle=5).
    const coinTotal = (inv) => {
      const arr = Array.isArray(inv) ? inv : [];
      let sum = 0;
      for (const it of arr) {
        const id = String(it?.id || "").toLowerCase();
        if (id === "small_coin") sum += 1;
        else if (id === "coin_bundle") sum += 5;
      }
      return sum;
    };

    const drawHeart = (x, y, q) => {
      // q: 0..4 quarters
      const s2 = 2; // pixel scale for heart
      const px = (ix, iy) => ctx.fillRect(x + ix * s2, y + iy * s2, s2, s2);

      // Heart shape mask (7x6)
      const mask = [
        "0110110",
        "1111111",
        "1111111",
        "0111110",
        "0011100",
        "0001000",
      ];

      // Outline
      ctx.fillStyle = "rgb(20, 32, 20)";
      for (let iy = 0; iy < mask.length; iy++) {
        for (let ix = 0; ix < mask[iy].length; ix++) {
          if (mask[iy][ix] === "1") px(ix, iy);
        }
      }

      // Inner fill: draw full heart as "empty" grey, then overlay "health" red by quarter.
      // This makes damage state visually unambiguous.
      const inner = [
        "0010100",
        "0111110",
        "0111110",
        "0011100",
        "0001000",
        "0000000",
      ];

      // Empty (grey)
      ctx.fillStyle = "rgb(150, 150, 150)";
      for (let iy = 0; iy < inner.length; iy++) {
        for (let ix = 0; ix < inner[iy].length; ix++) {
          if (inner[iy][ix] === "1") px(ix, iy);
        }
      }

      // Health (red), left-to-right proportional by quarter
      if (q > 0) {
        ctx.fillStyle = "rgb(200, 40, 40)";
        const fillCols = Math.min(7, Math.max(0, Math.round((q / 4) * 7)));
        for (let iy = 0; iy < inner.length; iy++) {
          for (let ix = 0; ix < inner[iy].length; ix++) {
            if (ix < fillCols && inner[iy][ix] === "1") px(ix, iy);
          }
        }
      }
    };

    // Panel
    ctx.save();
    ctx.fillStyle = "rgb(202, 214, 170)";
    ctx.fillRect(0, hudY, this.canvas.width, HUD_H);
    ctx.strokeStyle = "rgb(26, 44, 26)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hudY + 1);
    ctx.lineTo(this.canvas.width, hudY + 1);
    ctx.stroke();

    // Item slots (Z / X)
    const slotSize = 30;
    const slotPad = 8;
    const slotY = hudY + 7;
    const zX = slotPad;
    const xX = slotPad + slotSize + 10;

    const drawSlot = (sx, label, itemId) => {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(sx, slotY, slotSize, slotSize);
      ctx.strokeStyle = "rgb(26, 44, 26)";
      ctx.strokeRect(sx + 0.5, slotY + 0.5, slotSize - 1, slotSize - 1);

      // Label
      ctx.fillStyle = "rgb(20, 32, 20)";
      ctx.font = "bold 10px monospace";
      ctx.textBaseline = "top";
      ctx.fillText(label, sx + 3, slotY + slotSize - 12);

      // Icon
      const iconSheet = this.assets.sprites.items;
      const hasIcons = !!(iconSheet && iconSheet.complete && iconSheet.naturalWidth);
      if (hasIcons) {
        const cols = Math.max(1, Math.floor((iconSheet.naturalWidth || iconSheet.width) / 16));
        const iidx = getItemIconIndex(itemId);
        const isx = (iidx % cols) * 16;
        const isy = Math.floor(iidx / cols) * 16;
        const dx = sx + Math.floor((slotSize - 16) / 2);
        const dy = slotY + 4;
        ctx.drawImage(iconSheet, isx, isy, 16, 16, dx, dy, 16, 16);
      }
    };

    const zId = s.equipZ || "saber";
    const xId = s.equipX || "pistol";
    drawSlot(zX, "Z", zId);
    drawSlot(xX, "X", xId);

    // Coins (center)
    const coins = coinTotal(s.inventory);
    ctx.font = "bold 14px monospace";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgb(20, 32, 20)";
    const coinText = String(coins);
    const tw = ctx.measureText(coinText).width;
    const coinIconW = 16;
    const centerX = Math.floor(this.canvas.width / 2);
    const coinY = hudY + Math.floor(HUD_H / 2);

    // Coin icon
    {
      const iconSheet = this.assets.sprites.items;
      const hasIcons = !!(iconSheet && iconSheet.complete && iconSheet.naturalWidth);
      if (hasIcons) {
        const cols = Math.max(1, Math.floor((iconSheet.naturalWidth || iconSheet.width) / 16));
        const iidx = getItemIconIndex("small_coin");
        const isx = (iidx % cols) * 16;
        const isy = Math.floor(iidx / cols) * 16;
        ctx.drawImage(iconSheet, isx, isy, 16, 16, centerX - Math.floor((coinIconW + 6 + tw) / 2), coinY - 8, 16, 16);
      }
    }
    ctx.fillText(coinText, centerX - Math.floor(tw / 2) + 10, coinY + 1);

    // Hearts (right)
    const maxHearts = Math.max(1, Math.ceil((s.player.maxHp || 0) / 4));
    const hp = Math.max(0, Math.min(s.player.maxHp || 0, s.player.hp || 0));
    const heartW = 14;
    const heartStartX = this.canvas.width - 10 - (maxHearts * heartW);
    const heartY = hudY + 12;
    for (let i = 0; i < maxHearts; i++) {
      const q = Math.max(0, Math.min(4, hp - i * 4));
      drawHeart(heartStartX + i * heartW, heartY, q);
    }

    ctx.restore();

    // Message line (small, above HUD) — preserved for now
    if (s.message) {
      ctx.save();
      ctx.font = "12px monospace";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      const pad = 6;
      const msg = String(s.message);
      const mw = Math.min(this.canvas.width - 12, Math.floor(ctx.measureText(msg).width) + pad * 2);
      const mx = 6;
      const my = hudY - 6;
      ctx.fillRect(mx, my - 18, mw, 18);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(msg, mx + pad, my - 4);
      ctx.restore();
    }

    // Toast: short pickup feedback (only during play, and never over dialogue)
    if (
      s.ui?.screen === "play" &&
      s.toast?.ms > 0 &&
      s.toast?.text &&
      !s.dialogue.isActive() &&
      !s.inventoryOpen &&
      !s.worldMapOpen &&
      !(s.quest?.logOpen)
    ) {
      const text = s.toast.text;
      ctx.save();
      ctx.font = "12px monospace";
      ctx.textBaseline = "middle";
      const pad = 10;
      const w = Math.min(420, Math.max(120, ctx.measureText(text).width + pad * 2));
      const h = 22;
      const x = Math.floor((this.canvas.width - w) / 2);
      const y = (this.canvas.height - HUD_H) - h - 6;
      ctx.fillStyle = "rgba(12,12,12,0.88)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(240,236,220,0.9)";
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, x + pad, y + Math.floor(h / 2));
      ctx.restore();
    }


    // Inventory UI (full-screen, Link's Awakening–inspired)
    if (s.inventoryOpen) {
      const ctx = this.ctx;
      const panels = buildInventoryPanels(s.inventory);

      const W = this.canvas.width;
      // Leave the bottom HUD visible while the inventory is open.
      const H = this.canvas.height - HUD_H;

      // Panel frame
      const margin = 6;
      const x = margin;
      const y = margin;
      const w = W - margin * 2;
      const h = H - margin * 2;

      ctx.save();

      // Opaque Game Boy–style fill (keeps world calm and unreadable behind UI)
      ctx.fillStyle = "rgb(202, 214, 170)";
      ctx.fillRect(x, y, w, h);

      // Outer border
      ctx.strokeStyle = "rgba(15, 30, 15, 0.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      // Inner border
      ctx.strokeStyle = "rgba(15, 30, 15, 0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

      // Header
      ctx.fillStyle = "rgba(15, 30, 15, 0.95)";
      ctx.font = "bold 12px monospace";
      ctx.textBaseline = "top";
      const title = "INVENTORY";
      const tw = ctx.measureText(title).width;
      ctx.fillText(title, x + Math.floor((w - tw) / 2), y + 8);

      // Divider (dotted)
const divX = x + Math.floor(w / 2);
ctx.fillStyle = "rgba(15, 30, 15, 0.55)";
for (let yy = y + 24; yy < y + h - 56; yy += 6) {
  ctx.fillRect(divX, yy, 1, 3);
}

// Panel labels
ctx.font = "11px monospace";
ctx.fillStyle = "rgba(15, 30, 15, 0.80)";
ctx.fillText("PACK", x + 18, y + 22);
const equipLabel = "EQUIP (Z/X)";
const elw = ctx.measureText(equipLabel).width;
ctx.fillText(equipLabel, divX + 18, y + 22);


      // Grid
      const GRID_ROWS = 4;
      const GRID_COLS = 8; // 4 left + 4 right
      const GRID_SLOTS = GRID_ROWS * GRID_COLS;

      const cell = 28; // larger slots for clearer icons
      const gridTop = y + 28;
      const leftX = x + 16;
      const rightX = divX + 16;

      // Slot base styling
      const slotFill = "rgba(255,255,255,0.10)";
      const slotStroke = "rgba(15, 30, 15, 0.22)";
      const slotStrokeStrong = "rgba(15, 30, 15, 0.70)";
      const slotSelFill = "rgba(255,255,255,0.22)";

      // Clamp cursor to grid
      if (!Number.isFinite(s.inventoryIndex)) s.inventoryIndex = 0;
      s.inventoryIndex = Math.max(0, Math.min(GRID_SLOTS - 1, s.inventoryIndex | 0));

      const iconSheet = this.assets.sprites.items;
      const hasIcons = !!(iconSheet && iconSheet.complete && iconSheet.naturalWidth);
      const cols = hasIcons ? Math.max(1, Math.floor((iconSheet.naturalWidth || iconSheet.width) / 16)) : 1;

      for (let slot = 0; slot < GRID_SLOTS; slot++) {
        const row = Math.floor(slot / GRID_COLS);
        let col = slot % GRID_COLS;

        const isRight = col >= 4;
        const baseX = isRight ? rightX : leftX;
        col = isRight ? (col - 4) : col;

        const sx = baseX + col * cell;
        const sy = gridTop + row * cell;

        const selected = (slot === (s.inventoryIndex | 0));

        // Slot background
        ctx.fillStyle = selected ? slotSelFill : slotFill;
        ctx.fillRect(sx, sy, cell - 2, cell - 2);

        // Slot border
        ctx.strokeStyle = selected ? slotStrokeStrong : slotStroke;
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeRect(sx, sy, cell - 2, cell - 2);

        // Item icon (if any)
        const rowItem = panels.itemAt(slot);
        if (rowItem) {
          
          const iid = (rowItem.item?.id || "").toLowerCase();

          if (hasIcons) {
            const iidx = getItemIconIndex(iid);
            const isx = (iidx % cols) * 16;
            const isy = Math.floor(iidx / cols) * 16;
            const iconSize = Math.max(16, cell - 8);
            const dx = sx + Math.floor((cell - 2 - iconSize) / 2);
            const dy = sy + Math.floor((cell - 2 - iconSize) / 2);
            ctx.drawImage(iconSheet, isx, isy, 16, 16, dx, dy, iconSize, iconSize);
          } else {
            // Fallback marker
            ctx.fillStyle = "rgba(15, 30, 15, 0.65)";
            ctx.fillRect(sx + 6, sy + 6, 8, 8);
          }

          // Qty (small, top-right)
          const qty = String(rowItem.item?.amount ?? 1);
          if (qty !== "1") {
            ctx.font = "10px monospace";
            ctx.textBaseline = "top";
            ctx.fillStyle = "rgba(15, 30, 15, 0.90)";
            const qW = ctx.measureText(qty).width;
            ctx.fillText(qty, sx + (cell - 4) - qW, sy + 2);
          }

          // Category / quick-assign hint
          ctx.font = "10px monospace";
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = "rgba(15, 30, 15, 0.70)";
          const tag = ((slot % 8) >= 4) ? "EQ" : rowItem.abbr;
          ctx.fillText(tag, sx + 3, sy + (cell - 6));
        }
      }

      // Bottom info strip
      const infoH = 46;
      const infoY = y + h - infoH - 6;
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(x + 10, infoY, w - 20, infoH);

      ctx.strokeStyle = "rgba(15, 30, 15, 0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 10, infoY, w - 20, infoH);

      const slot = (s.inventoryIndex | 0);
      const cur = panels.itemAt(slot);

      ctx.fillStyle = "rgba(15, 30, 15, 0.95)";
      ctx.textBaseline = "top";
      if (cur) {
        ctx.font = "bold 12px monospace";
        ctx.fillText(cur.name.toUpperCase(), x + 16, infoY + 6);

        ctx.font = "11px monospace";
        const descLines = _wrapLines(cur.desc, w - 40, ctx).slice(0, 2);
        let dy = infoY + 22;
        for (const dl of descLines) {
          ctx.fillText(dl, x + 16, dy);
          dy += 12;
        }
      } else {
        ctx.font = "11px monospace";
        ctx.fillText("(empty)", x + 16, infoY + 12);
      }

      // Controls hint
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(15, 30, 15, 0.70)";
      const hint = "ESC: CLOSE   ARROWS: MOVE   ENTER: USE   Z/X: ASSIGN (RIGHT)";
      ctx.fillText(hint, x + 16, y + h - 18);

      ctx.restore();
    }

    // Dialogue UI
    s.dialogue.render(ctx, this.canvas.width, this.canvas.height - HUD_H);

    // Developer overlay (off by default)
    if (this._runtime.debugEnabled && this._runtime.debugOverlay) {
      this._renderDebugOverlay();
    }
  }


  // ----- Developer tooling (debug-only; never required) -----
  _renderDebugOverlay() {
    const ctx = this.ctx;
    const s = this.state;
    const lines = [];

    lines.push("DEBUG");
    lines.push(`map: ${s.currentMapId}`);
    lines.push(`pos: (${s.player?.x ?? "?"},${s.player?.y ?? "?"})`);

    const activeQ = s.quest?.activeId || "-";
    let stage = "-";
    try {
      const def = activeQ && QUEST_DEFS[activeQ];
      const prog = activeQ && s.quest?.progress?.[activeQ];
      if (def && prog) {
        const done = prog.done || {};
        const nextObj = def.objectives.find(o => !done[o.id]);
        stage = nextObj ? nextObj.id : (prog.completed ? "completed" : "in_progress");
      }
    } catch (e) {}

    lines.push(`quest: ${activeQ} | stage: ${stage}`);

    const tier = getReturnPressureTier(s);
    lines.push(`returnPressure: ${tier}`);

    const flags = s.flags || {};
    const trueFlags = Object.keys(flags).filter(k => !!flags[k]).slice(0, 8);
    lines.push(`flags: ${trueFlags.length ? trueFlags.join(", ") : "-"}`);

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#000000";
    const pad = 6;
    ctx.font = "11px monospace";
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const lineH = 13;
    const boxW = Math.ceil(maxW) + pad * 2;
    const boxH = lines.length * lineH + pad * 2;
    ctx.fillRect(6, 6, boxW, boxH);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    let y = 6 + pad;
    for (const l of lines) {
      ctx.fillText(l, 6 + pad, y);
      y += lineH;
    }
    ctx.restore();
  }

  _debugWarpPrompt() {
    const s = this.state;
    const cur = `${s.currentMapId},${s.player.x},${s.player.y}`;
    const res = window.prompt(
      "DEBUG WARP (mapId,x,y). Example: quarry_entrance,8,8",
      cur
    );
    if (!res) return;
    const parts = res.split(",").map(p => p.trim());
    const mapId = parts[0];
    const x = Number(parts[1]);
    const y = Number(parts[2]);
    if (!maps[mapId]) {
      console.error(`[DebugWarp] Unknown map id: ${mapId}`);
      return;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      console.error(`[DebugWarp] Invalid coords: ${parts[1]},${parts[2]}`);
      return;
    }

    // Warp without modifying quest/flags. This is a smoke-test helper only.
    s.currentMapId = mapId;
    s.player.x = Math.max(0, Math.min(maps[mapId].width - 1, Math.floor(x)));
    s.player.y = Math.max(0, Math.min(maps[mapId].height - 1, Math.floor(y)));
    this._ensureMapValidated(true);
    this._recordSafeIfApplicable(s.currentMapId);
    this.syncWorldMapCursorToCurrent();
    this.ensureEnemiesForMap(s.currentMapId);
  }

  // ----- Persistence -----
  _getSavePayload() {
    const s = this.state;
    return {
      saveVersion: SAVE_VERSION,
      v: 1,
      meta: {
        lastPlayed: Date.now(),
        stepCount: (s.stats && typeof s.stats.stepCount === "number") ? s.stats.stepCount : 0,
        questId: s.quest?.activeId || null,
        build: BUILD_VERSION,
      },
      currentMapId: s.currentMapId,
      player: {
        x: s.player.x,
        y: s.player.y,
        hp: s.player.hp,
        maxHp: s.player.maxHp,
        facing: s.player.facing,
      },
      inventory: Array.isArray(s.inventory) ? s.inventory : [],
      flags: s.flags || {},
      discoveredNodes: s.discoveredNodes || {},
      quest: s.quest || { activeId: null, logOpen: false, index: 0, progress: {} },
      lastSafe: s.lastSafe || null,
      enemiesByMap: (s.enemiesByMap && typeof s.enemiesByMap === "object") ? s.enemiesByMap : {},
      returnPressure: ensureReturnPressureState(s.returnPressure),
    };
  }

  migrateSave(data) {
    try {
      if (!data || typeof data !== "object") return null;

      // Accept legacy formats that nested the actual state under `state`
      const src = (data.state && typeof data.state === "object") ? data.state : data;

      const incomingVersion = (typeof data.saveVersion === "number")
        ? data.saveVersion
        : (typeof data.v === "number") ? data.v : 1;

      const migrated = {
        saveVersion: incomingVersion,
        meta: (data.meta && typeof data.meta === "object") ? { ...data.meta } : {},
        currentMapId: (typeof src.currentMapId === "string") ? src.currentMapId : "ironwood_town",
        player: (src.player && typeof src.player === "object") ? { ...src.player } : {},
        inventory: Array.isArray(src.inventory) ? src.inventory : [],
        flags: ensureChapter1Flags((src.flags && typeof src.flags === "object") ? { ...src.flags } : {}),
        triggerOnce: (src.triggerOnce && typeof src.triggerOnce === "object") ? { ...src.triggerOnce } : {},
        discoveredNodes: (src.discoveredNodes && typeof src.discoveredNodes === "object") ? { ...src.discoveredNodes } : {},
        quest: (src.quest && typeof src.quest === "object") ? { ...src.quest } : { activeId: null, logOpen: false, index: 0, progress: {} },
        lastSafe: (src.lastSafe && typeof src.lastSafe === "object") ? { ...src.lastSafe } : null,
        returnPressure: (src.returnPressure && typeof src.returnPressure === "object") ? { ...src.returnPressure } : null,
        enemies: (src.enemies && typeof src.enemies === "object") ? { ...src.enemies } : null,
        stats: (src.stats && typeof src.stats === "object") ? { ...src.stats } : {},
      };

      // Validate map id; fall back safely.
      if (!migrated.currentMapId || !maps?.[migrated.currentMapId]) {
        migrated.currentMapId = "ironwood_town";
      }

      // Player defaults
      migrated.player.x = (typeof migrated.player.x === "number") ? migrated.player.x : 8;
      migrated.player.y = (typeof migrated.player.y === "number") ? migrated.player.y : 8;
      migrated.player.hp = (typeof migrated.player.hp === "number") ? migrated.player.hp : 6;
      migrated.player.maxHp = (typeof migrated.player.maxHp === "number") ? migrated.player.maxHp : migrated.player.hp;
      migrated.player.facing = migrated.player.facing || "down";

      // Meta defaults
      if (typeof migrated.meta.lastPlayed !== "number") migrated.meta.lastPlayed = Date.now();
      if (typeof migrated.meta.stepCount !== "number") migrated.meta.stepCount = migrated.stats?.stepCount ?? 0;
      if (!("questId" in migrated.meta)) migrated.meta.questId = migrated.quest?.activeId ?? null;
      migrated.meta.build = BUILD_VERSION;

      // Finalize to current save version
      migrated.saveVersion = SAVE_VERSION;

      return migrated;
    } catch {
      return null;
    }
  }

  saveGame() {
    try {
      const payload = this._getSavePayload();
      const json = JSON.stringify(payload);
      localStorage.setItem(this._runtime.saveKey, json);
      this._runtime.lastSaveHash = json;
    } catch (e) {
      console.warn("[Save] Failed to save game:", e);
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem(this._runtime.saveKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;

      const migrated = this.migrateSave(data);
      if (!migrated) return;

      // If we upgraded/normalized the save, persist it back immediately.
      try { localStorage.setItem(this._runtime.saveKey, JSON.stringify(migrated)); } catch {}


      // Validate map id
      if (typeof migrated.currentMapId === "string" && maps[migrated.currentMapId]) {
        this.state.currentMapId = migrated.currentMapId;
      }

      // Player position
      if (migrated.player && typeof migrated.player === "object") {
        const px = Number.isFinite(migrated.player.x) ? migrated.player.x : this.state.player.x;
        const py = Number.isFinite(migrated.player.y) ? migrated.player.y : this.state.player.y;
        this.state.player.x = px;
        this.state.player.y = py;
        if (Number.isFinite(migrated.player.hp)) this.state.player.hp = migrated.player.hp;
        if (Number.isFinite(migrated.player.maxHp)) this.state.player.maxHp = migrated.player.maxHp;
        if (typeof migrated.player.facing === "string") this.state.player.facing = migrated.player.facing;
      }

      // Inventory, flags, visited nodes
      if (Array.isArray(migrated.inventory)) this.state.inventory = migrated.inventory;
      if (migrated.flags && typeof migrated.flags === "object") this.state.flags = migrated.flags;
      if (migrated.discoveredNodes && typeof migrated.discoveredNodes === "object") {
        this.state.discoveredNodes = migrated.discoveredNodes;
      }
      // Quest progress
      if (migrated.quest && typeof migrated.quest === "object") {
        this.state.quest = migrated.quest;
        if (!this.state.quest.progress) this.state.quest.progress = {};
      }

      // Last safe respawn anchor
      if (migrated.lastSafe && typeof migrated.lastSafe === "object") {
        const mid = (typeof migrated.lastSafe.mapId === "string") ? migrated.lastSafe.mapId : null;
        const mx = Number.isFinite(migrated.lastSafe.x) ? migrated.lastSafe.x : null;
        const my = Number.isFinite(migrated.lastSafe.y) ? migrated.lastSafe.y : null;
        if (mid && maps[mid] && Number.isFinite(mx) && Number.isFinite(my)) {
          this.state.lastSafe = { mapId: mid, x: mx, y: my };
        }
      }

      // Enemies (persisted). Projectiles are runtime-only.
      if (migrated.enemiesByMap && typeof migrated.enemiesByMap === "object") {
        this.state.enemiesByMap = migrated.enemiesByMap;
      } else if (!this.state.enemiesByMap) {
        this.state.enemiesByMap = {};
      }

      // Hidden Return Pressure (persisted)
      this.state.returnPressure = ensureReturnPressureState(migrated.returnPressure);

      // Keep cursor aligned to loaded location
      this.syncWorldMapCursorToCurrent();

      // Ensure current map has seeded enemies if not present in save.
      this.ensureEnemiesForMap(this.state.currentMapId);

      this._runtime.lastSaveHash = raw;
    } catch (e) {
      console.warn("[Save] Failed to load game:", e);
    }
  }

  _autosave(dt) {
    this._runtime.autosaveMs += dt;
    if (this._runtime.autosaveMs < 400) return;
    this._runtime.autosaveMs = 0;

    const json = JSON.stringify(this._getSavePayload());
    if (json !== this._runtime.lastSaveHash) {
      this.saveGame();
    }
  }

  // ----- Map validation + error UI -----
  _setFatalError(message) {
    this._runtime.fatalError = String(message || "Unknown error");
  }

  _clearFatalError() {
    this._runtime.fatalError = null;
  }

  _validateContentOnce() {
    // Run expensive validators once per boot. Keeps runtime overhead negligible.
    if (this._runtime.contentValidated) return;
    this._runtime.contentValidated = true;

    const errs = validateAllContent({ maps, questDefs: QUEST_DEFS, dialogueNodes: DIALOGUE_NODES });
    if (errs && errs.length) {
      this._runtime.contentValidationErrors = errs;
      const preview = errs.slice(0, 25).join("\n");
      const more = errs.length > 25 ? `\n\n(+${errs.length - 25} more...)` : "";
      this._setFatalError(
        "Content validation failed. Fix the following:\n\n" + preview + more
      );
      if (this._runtime.debugEnabled) console.error("[ContentValidation] Failed:", errs);
    }
  }

  _ensureMapValidated(force) {
    const id = this.state.currentMapId;
    if (!force && this._runtime.lastValidatedMapId === id) return;

    this._runtime.lastValidatedMapId = id;
    this._runtime.mapError = null;

    const map = maps[id];
    if (!map) {
      this._runtime.mapError = `Missing map: ${id}`;
      if (this._runtime.debugEnabled) console.error("[MapValidation] Missing map:", id);
      return;
    }

    const errors = [];

    // 1) tiles array exists and matches width/height
    if (!Array.isArray(map.tiles) || map.tiles.length !== map.height) {
      errors.push(
        `tiles must be an array of length height (${map.height}). Got ${Array.isArray(map.tiles) ? map.tiles.length : typeof map.tiles}.`
      );
    } else {
      for (let y = 0; y < map.height; y++) {
        const row = map.tiles[y];
        if (!Array.isArray(row) || row.length !== map.width) {
          errors.push(
            `tiles[${y}] must be an array of length width (${map.width}). Got ${Array.isArray(row) ? row.length : typeof row}.`
          );
          break;
        }
      }
    }

    // 2) exits are in-bounds, 3) exit targets reference valid map ids
    if (Array.isArray(map.exits)) {
      for (const e of map.exits) {
        const ex = e?.x;
        const ey = e?.y;
        if (!Number.isFinite(ex) || !Number.isFinite(ey)) {
          errors.push(`exit has non-numeric coords: ${JSON.stringify(e)}`);
          continue;
        }
        if (ex < 0 || ey < 0 || ex >= map.width || ey >= map.height) {
          errors.push(`exit out of bounds at (${ex},${ey}) on map ${id}`);
        }
        if (typeof e.to !== "string" || !maps[e.to]) {
          console.error(
            `[MapValidation] Invalid exit target: from=${id} at (${ex},${ey}) -> to=${e.to}`
          );
          errors.push(`exit at (${ex},${ey}) points to invalid map id: ${e.to}`);
        }
      }
    }

    if (errors.length) {
      const header = `Invalid map data: ${id}`;
      this._runtime.mapError = header + "\n\n" + errors.join("\n");
      if (this._runtime.debugEnabled) console.error("[MapValidation] " + header, errors);
    }
  }

  _renderErrorOverlay(message) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.textBaseline = "top";

    const pad = 12;
    const maxW = this.canvas.width - pad * 2;
    const lines = String(message || "Unknown error").split("\n");

    let y = pad;
    for (const line of lines) {
      // crude wrap
      const words = line.split(" ");
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(cur, pad, y);
          y += 14;
          cur = w;
        } else {
          cur = test;
        }
      }
      ctx.fillText(cur, pad, y);
      y += 14;
      if (y > this.canvas.height - pad) break;
    }

    ctx.fillText("Reload after fixing map data.", pad, this.canvas.height - pad - 14);
    ctx.restore();
  }

  // ----- World map renderer -----
  renderWorldMap() {
    const ctx = this.ctx;
    const s = this.state;
    const img = this.assets.worldMapImage;

    // Backdrop
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw map image scaled to fit canvas
    const pad = 8;
    const maxW = this.canvas.width - pad * 2;
    const maxH = this.canvas.height - pad * 2 - 64; // reserve bottom strip for text

    let drawW = maxW;
    let drawH = maxH;

    if (img && img.width && img.height) {
      const scale = Math.min(maxW / img.width, maxH / img.height);
      drawW = Math.floor(img.width * scale);
      drawH = Math.floor(img.height * scale);
    }

    const originX = Math.floor((this.canvas.width - drawW) / 2);
    const originY = pad;

    if (img && img.complete && img.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, originX, originY, drawW, drawH);
    } else {
      // Fallback if the image hasn't loaded yet
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(originX, originY, drawW, drawH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px monospace";
      ctx.textBaseline = "top";
      ctx.fillText("Loading world map...", originX + 8, originY + 8);
    }

    // Nodes + connections
    const toPx = (nx, ny) => ({
      x: originX + Math.floor(nx * drawW),
      y: originY + Math.floor(ny * drawH),
    });

    // Connections are already drawn into the world map artwork.
// If you switch to a blank map image later, you can re-enable line rendering here.

    // Nodes
    worldMap.nodes.forEach((n, idx) => {
      const p = toPx(n.x, n.y);
      const discovered = !!s.discoveredNodes[n.id];
      const isCurrent = this.getWorldNodeIdForMap(s.currentMapId) === n.id;
      const isCursor = s.worldMapCursor === idx;

      // Outer ring
      ctx.fillStyle = discovered ? "#ffffff" : "rgba(255,255,255,0.35)";
      ctx.fillRect(p.x - 4, p.y - 4, 8, 8);

      // Current location marker
      if (isCurrent) {
        ctx.strokeStyle = "#ffdd55";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - 6, p.y - 6, 12, 12);
      }

      // Cursor marker
      if (isCursor) {
        ctx.strokeStyle = "#66aaff";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - 8, p.y - 8, 16, 16);
      }
    });

    // Bottom info panel (SOLID — removes the “grid” look from the UI panel sprite)
    const panelH = 56;
    const panelY = this.canvas.height - panelH;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fillRect(0, panelY, this.canvas.width, panelH);
    ctx.strokeStyle = "rgba(240,236,220,0.95)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, panelY + 1, this.canvas.width - 2, panelH - 2);
    // Subtle inner border
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.strokeRect(2, panelY + 2, this.canvas.width - 4, panelH - 4);
    ctx.restore();

    const selected = worldMap.nodes[s.worldMapCursor] || worldMap.nodes[0];
    const discovered = !!s.discoveredNodes[selected.id];
    // Text: outlined for legibility on any background
    const mapText = (text, x, y, fill = "#ffffff") => {
      ctx.save();
      ctx.font = "bold 12px monospace";
      ctx.textBaseline = "top";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText(text, x, y);
      ctx.fillStyle = fill;
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    const left = 8;
    const line1 = `${selected.number}. ${selected.label}`;
    const line2 = discovered ? selected.summary : "Unvisited. Follow the road.";
    mapText(line1, left, panelY + 6);
    mapText(line2, left, panelY + 24, "rgba(255,255,255,0.90)");
    mapText("M: close   Arrows: browse", left, panelY + 40, "rgba(255,255,255,0.80)");
  }

  // ----- Main loop -----
  loop(timestamp) {
    const dt = this.lastTime ? timestamp - this.lastTime : 16;
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  renderQuestOverlay(ctx) {
    const s = this.state;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const x = 16;
    const y = 20;
    const boxW = width - 32;
    const boxH = height - 40;

    // Panel skin
    const panel = this.assets.uiPanel;
    const hasPanel = !!(panel && panel.complete && panel.naturalWidth);
    if (hasPanel) {
      const tile = 32;
      for (let py = y; py < y + boxH; py += tile) {
        for (let px = x; px < x + boxW; px += tile) {
          const dw = Math.min(tile, (x + boxW) - px);
          const dh = Math.min(tile, (y + boxH) - py);
          ctx.drawImage(panel, 0, 0, dw, dh, px, py, dw, dh);
        }
      }
      ctx.strokeStyle = "rgba(240,236,220,0.95)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, boxW - 2, boxH - 2);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(x, y, boxW, boxH);
      ctx.strokeStyle = "rgba(240,236,220,0.95)";
      ctx.strokeRect(x + 1, y + 1, boxW - 2, boxH - 2);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px system-ui";
    ctx.fillText("QUEST LOG", x + 10, y + 18);

    const qids = Object.keys(QUEST_DEFS);
    if (!qids.length) {
      ctx.font = "10px system-ui";
      ctx.fillText("No quests defined.", x + 10, y + 40);
      ctx.fillText("Press Q to close.", x + 10, y + boxH - 12);
      return;
    }

    const idx = Math.min(Math.max(0, s.quest?.index || 0), qids.length - 1);
    const selectedId = qids[idx];
    const def = QUEST_DEFS[selectedId];
    const prog = s.quest?.progress?.[selectedId] || {};
    const started = !!prog.started;
    const completed = !!prog.completed;

    // Left list
    ctx.font = "10px system-ui";
    const listX = x + 10;
    const listY = y + 36;
    const listW = 150;

    qids.forEach((id, i) => {
      const rowY = listY + i * 14;
      const d = QUEST_DEFS[id];
      const p = s.quest?.progress?.[id] || {};
      const done = !!p.completed;
      const mark = done ? "✓ " : "";
      if (i === idx) {
        ctx.fillStyle = "#ffdd55";
        ctx.fillText("> " + mark + d.title, listX, rowY);
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillText("  " + mark + d.title, listX, rowY);
      }
    });

    // Right detail
    const detailX = x + listW + 20;
    const detailY = y + 36;

    ctx.font = "11px system-ui";
    ctx.fillText(def.title + (completed ? " (Complete)" : started ? "" : " (Not started)"), detailX, detailY);

    ctx.font = "10px system-ui";
    ctx.fillText(def.description || "", detailX, detailY + 16);

    const done = prog.objectivesDone || {};
    def.objectives.forEach((obj, i) => {
      const rowY = detailY + 40 + i * 14;
      const check = done[obj.id] ? "✓" : "•";
      ctx.fillText(check + " " + obj.text, detailX, rowY);
    });

    ctx.fillText("Up/Down: select   Q: close", x + 10, y + boxH - 12);
  }


}
