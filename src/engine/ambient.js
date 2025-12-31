// engine/ambient.js
// Looping ambient layer with crossfades.
// Uses TWO reusable HTMLAudio elements (A/B) to avoid unbounded WebMediaPlayer creation.
import { MAP_AMBIENT, AMBIENT_TRACKS } from "../data/ambient_tracks.js";

function clamp01(v){ const n=Number(v); return Number.isFinite(n)? Math.max(0, Math.min(1,n)):0; }

export class AmbientManager {
  constructor({ basePath="assets/ambience/", initialVolume=0.6 } = {}) {
    this.basePath = basePath;
    this.enabled = true;
    this.volume = clamp01(initialVolume);
    this._unlocked = false;

    this._a = new Audio();
    this._b = new Audio();
    for (const el of [this._a, this._b]) {
      el.loop = true;
      el.preload = "auto";
      el.volume = 0;
      el.dataset.baseVolume = "0";
    }
    this._active = "a";
    this._currentKey = null;
    this._fadeTimer = null;
  }

  setEnabled(on){ this.enabled = !!on; if (!this.enabled) this.stop({ fadeMs: 150 }); }
  setVolume(v){ this.volume = clamp01(v); this._applyVolumes(); }

  unlock(){
    this._unlocked = true;
    for (const el of [this._a, this._b]) {
      try {
        if (!el.src) continue;
        el.play().then(()=> el.pause()).catch(()=>{});
      } catch(_) {}
    }
  }

  _applyVolumes(){
    for (const el of [this._a, this._b]) {
      if (!el) continue;
      const base = clamp01(el.dataset.baseVolume || 0);
      el.volume = base * this.volume;
    }
  }

  _getFile(key){
    const t = AMBIENT_TRACKS[key];
    return t ? t.file : null;
  }

  desiredAmbientForState({ mode, mapId }){
    // Ambient is only intentional in-world; keep current during pause/settings/credits.
    if (mode !== "play") return null;
    const key = MAP_AMBIENT[mapId];
    return key || null;
  }

  play(key, { fadeMs=650 } = {}){
    if (!this.enabled) return;
    if (!key) return;
    if (this._currentKey === key) return;

    const file = this._getFile(key);
    if (!file) return;

    const incomingName = this._active === "a" ? "b" : "a";
    const outgoingName = this._active;

    const incoming = incomingName === "a" ? this._a : this._b;
    const outgoing = outgoingName === "a" ? this._a : this._b;

    const src = this.basePath + file;
    if (incoming.src !== src) {
      incoming.src = src;
      try { incoming.load(); } catch(_) {}
    }

    // Start incoming at 0
    try { incoming.currentTime = 0; } catch(_) {}
    incoming.dataset.baseVolume = "0";
    incoming.volume = 0;

    const fromOut = outgoing ? clamp01(outgoing.dataset.baseVolume || 0) : 0;

    if (this._fadeTimer) cancelAnimationFrame(this._fadeTimer);

    // Kick playback
    try { incoming.play().catch(()=>{}); } catch(_) {}
    if (outgoing) { try { outgoing.play().catch(()=>{}); } catch(_){} }

    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / Math.max(1, fadeMs);
      const k = Math.max(0, Math.min(1, t));
      const inVol = k;
      const outVol = 1 - k;

      incoming.dataset.baseVolume = String(inVol);
      incoming.volume = inVol * this.volume;

      if (outgoing) {
        const v = fromOut * outVol;
        outgoing.dataset.baseVolume = String(v);
        outgoing.volume = v * this.volume;
      }

      if (k < 1) {
        this._fadeTimer = requestAnimationFrame(tick);
      } else {
        if (outgoing) {
          try { outgoing.pause(); } catch(_) {}
          outgoing.dataset.baseVolume = "0";
          outgoing.volume = 0;
          try { outgoing.removeAttribute("src"); outgoing.load(); } catch(_) {}
        }
        this._active = incomingName;
        this._currentKey = key;
        this._fadeTimer = null;
      }
    };

    this._fadeTimer = requestAnimationFrame(tick);
  }

  stop({ fadeMs=200 } = {}){
    const a = this._a, b = this._b;
    if (!a && !b) return;

    if (this._fadeTimer) cancelAnimationFrame(this._fadeTimer);

    const start = performance.now();
    const a0 = a ? clamp01(a.dataset.baseVolume || 0) : 0;
    const b0 = b ? clamp01(b.dataset.baseVolume || 0) : 0;

    const tick = () => {
      const t = (performance.now() - start) / Math.max(1, fadeMs);
      const k = Math.max(0, Math.min(1, t));
      const out = 1 - k;

      if (a) { const v = a0 * out; a.dataset.baseVolume=String(v); a.volume=v*this.volume; }
      if (b) { const v = b0 * out; b.dataset.baseVolume=String(v); b.volume=v*this.volume; }

      if (k < 1) requestAnimationFrame(tick);
      else {
        for (const el of [a,b]) {
          if (!el) continue;
          try { el.pause(); } catch(_) {}
          el.dataset.baseVolume="0";
          el.volume=0;
          try { el.removeAttribute("src"); el.load(); } catch(_) {}
        }
        this._currentKey = null;
      }
    };
    requestAnimationFrame(tick);
  }
}
