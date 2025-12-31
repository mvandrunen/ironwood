// engine/music.js
import { MUSIC_TRACKS, MAP_MUSIC } from "../data/music_tracks.js";

function clamp01(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

/**
 * MusicManager
 * - Exactly TWO HTMLAudio elements (A/B) reused forever (no unbounded Audio creation).
 * - Crossfade between decks.
 * - Designed to avoid Edge/Chromium WebMediaPlayer exhaustion.
 */
export class MusicManager {
  constructor({ basePath = "assets/music/", initialVolume = 0.75 } = {}) {
    this.basePath = basePath;
    this.enabled = true;
    this.volume = clamp01(initialVolume);

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
    this._unlocked = false;
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!this.enabled) this.stop({ fadeMs: 150 });
    else if (this._currentKey) this.play(this._currentKey, { fadeMs: 150 });
  }

  setVolume(v) {
    this.volume = clamp01(v);
    this._applyVolumes();
  }

  unlock() {
    // Prime both decks (some browsers require a gesture before playback).
    this._unlocked = true;
    for (const el of [this._a, this._b]) {
      try {
        if (!el.src) continue;
        el.play().then(() => el.pause()).catch(() => {});
      } catch (_) {}
    }
  }

  _applyVolumes() {
    for (const el of [this._a, this._b]) {
      if (!el) continue;
      const base = clamp01(el.dataset.baseVolume || 0);
      el.volume = base * this.volume;
    }
  }

  desiredTrackForState({ mode, mapId, combatActive }) {
    if (mode === "title") return "title";
    if (mode !== "play") return null; // keep current during pause/settings/credits
    if (combatActive) return "combat";
    const key = MAP_MUSIC[mapId];
    return key || "ironwood_town";
  }

  play(key, { fadeMs = 650 } = {}) {
    if (!this.enabled) return;
    if (!key) return;
    if (this._currentKey === key) return;

    const t = MUSIC_TRACKS[key];
    if (!t || !t.file) return;

    const incomingName = this._active === "a" ? "b" : "a";
    const outgoingName = this._active;

    const incoming = incomingName === "a" ? this._a : this._b;
    const outgoing = outgoingName === "a" ? this._a : this._b;

    // Set incoming source (reuse element)
    const src = this.basePath + t.file;
    if (incoming.src !== src) {
      incoming.src = src;
      try { incoming.load(); } catch (_) {}
    }

    // Start incoming at 0
    try { incoming.currentTime = 0; } catch (_) {}
    incoming.dataset.baseVolume = "0";
    incoming.volume = 0;

    // Ensure outgoing has a sane base volume
    const fromOut = outgoing ? clamp01(outgoing.dataset.baseVolume || 0) : 0;

    // Stop any previous fade
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }

    // Kick playback (gesture gate handled elsewhere)
    try { incoming.play().catch(() => {}); } catch (_) {}
    if (outgoing && !outgoing.paused) { /* keep playing */ }
    else if (outgoing) { try { outgoing.play().catch(() => {}); } catch (_) {} }

    const steps = Math.max(1, Math.floor(fadeMs / 30));
    let i = 0;

    this._fadeTimer = setInterval(() => {
      i++;
      const k = Math.max(0, Math.min(1, i / steps));

      const inVol = k;       // 0 -> 1
      const outVol = 1 - k;  // 1 -> 0

      incoming.dataset.baseVolume = String(inVol);
      incoming.volume = inVol * this.volume;

      if (outgoing) {
        const v = fromOut * outVol;
        outgoing.dataset.baseVolume = String(v);
        outgoing.volume = v * this.volume;
      }

      if (k >= 1) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;

        // Hard stop outgoing and release decode pressure
        if (outgoing) {
          try { outgoing.pause(); } catch (_) {}
          outgoing.dataset.baseVolume = "0";
          outgoing.volume = 0;
          try {
            outgoing.removeAttribute("src");
            outgoing.load();
          } catch (_) {}
        }

        this._active = incomingName;
        this._currentKey = key;
      }
    }, 30);
  }

  stop({ fadeMs = 200 } = {}) {
    const a = this._a, b = this._b;
    if (!a && !b) return;

    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }

    const steps = Math.max(1, Math.floor(fadeMs / 30));
    let i = 0;

    const a0 = a ? clamp01(a.dataset.baseVolume || 0) : 0;
    const b0 = b ? clamp01(b.dataset.baseVolume || 0) : 0;

    const timer = setInterval(() => {
      i++;
      const k = Math.max(0, Math.min(1, i / steps));
      const out = 1 - k;

      if (a) {
        const v = a0 * out;
        a.dataset.baseVolume = String(v);
        a.volume = v * this.volume;
      }
      if (b) {
        const v = b0 * out;
        b.dataset.baseVolume = String(v);
        b.volume = v * this.volume;
      }

      if (k >= 1) {
        clearInterval(timer);
        for (const el of [a, b]) {
          if (!el) continue;
          try { el.pause(); } catch (_) {}
          el.dataset.baseVolume = "0";
          el.volume = 0;
          try { el.removeAttribute("src"); el.load(); } catch (_) {}
        }
        this._currentKey = null;
      }
    }, 30);
  }
}
