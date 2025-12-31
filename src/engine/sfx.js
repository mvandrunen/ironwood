// engine/sfx.js
// Asset-based SFX using WebAudio (AudioBuffer) to avoid spawning many HTMLAudio/WebMediaPlayers.
// Respects Settings SFX volume and degrades gracefully if assets fail to load.
import { UI_SFX, STEP_SFX, WEAPON_SFX } from "../data/sfx_maps.js";

function clamp01(v){ const n=Number(v); return Number.isFinite(n)? Math.max(0, Math.min(1,n)):0; }

export class SfxManager {
  constructor({ basePath="assets/sfx/", initialVolume=0.85 } = {}) {
    this.basePath = basePath;
    this.enabled = true;
    this.volume = clamp01(initialVolume);

    this._ctx = null;
    this._buffers = new Map();  // file -> AudioBuffer
    this._loading = new Map();  // file -> Promise<AudioBuffer>
    this._unlocked = false;
  }

  setEnabled(on){ this.enabled = !!on; }
  setVolume(v){ this.volume = clamp01(v); }

  _ensureCtx(){
    if (this._ctx) return this._ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this._ctx = new AC();
    return this._ctx;
  }

  unlock(){
    // Call during first user gesture; resumes context if needed.
    const ctx = this._ensureCtx();
    if (!ctx) return;
    this._unlocked = true;
    if (ctx.state === "suspended") {
      try { ctx.resume().catch(()=>{}); } catch(_) {}
    }
  }

  async _loadBuffer(file){
    if (!file) return null;
    if (this._buffers.has(file)) return this._buffers.get(file);
    if (this._loading.has(file)) return this._loading.get(file);

    const p = (async () => {
      const ctx = this._ensureCtx();
      if (!ctx) return null;
      const res = await fetch(this.basePath + file);
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr.slice(0));
      this._buffers.set(file, buf);
      this._loading.delete(file);
      return buf;
    })().catch(() => {
      this._loading.delete(file);
      return null;
    });

    this._loading.set(file, p);
    return p;
  }

  async playFile(file, { vol=1.0 } = {}){
    if (!this.enabled) return;
    if (!file) return;

    const ctx = this._ensureCtx();
    if (!ctx) return;

    // Best effort resume (in case unlock wasn't called)
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch(_) {}
    }

    const buf = await this._loadBuffer(file);
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.value = clamp01(vol) * this.volume;

    src.connect(gain);
    gain.connect(ctx.destination);

    try { src.start(0); } catch(_) {}
  }

  playUI(name){
    const file = UI_SFX[name];
    this.playFile(file, { vol: 0.55 });
  }

  playStep(surface){
    const file = STEP_SFX[surface];
    this.playFile(file, { vol: 0.5 });
  }

  playWeapon(name){
    const file = WEAPON_SFX[name];
    this.playFile(file, { vol: 0.75 });
  }
}
