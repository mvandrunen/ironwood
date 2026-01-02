export class DialogueSystem {
  constructor() {
    this.lines = [];
    this.index = 0;
    this.active = false;

    this.choiceIndex = 0;

    // Optional typewriter rendering. The game can adjust this via Settings.
    this._textSpeed = "normal"; // slow | normal | fast
    this._charsPerSec = 60;
    this._charCount = 0;
    this._charAccMs = 0;

    // Optional UI skin (set by Game after assets load)
    this.skin = {
      panel: null,
      placeholder: null,
    };
  }

  setSkin(skin) {
    if (!skin || typeof skin !== "object") return;
    this.skin.panel = skin.panel || this.skin.panel;
    this.skin.placeholder = skin.placeholder || this.skin.placeholder;
  }

  startDialogue(lines) {
    if (!lines || !lines.length) return;
    // Normalize for readability/pacing:
    // - Split overly-long lines into smaller "beats".
    // - Avoid dense paragraphs in a small Game Boy-scale box.
    this.lines = normalizeDialogueLines(lines);
    this.index = 0;
    this.active = true;
    this.choiceIndex = 0;

    // Reset typewriter state for the first line.
    this._charCount = 0;
    this._charAccMs = 0;
  }

  isActive() {
    return this.active;
  }

  isChoiceActive() {
    const cur = this.lines[this.index];
    return !!(cur && typeof cur === "object" && cur.type === "choice");
  }

  moveChoice(delta) {
    const cur = this.lines[this.index];
    if (!cur || typeof cur !== "object" || cur.type !== "choice") return;
    const opts = Array.isArray(cur.options) ? cur.options : [];
    if (!opts.length) return;
    const next = (this.choiceIndex + delta + opts.length) % opts.length;
    this.choiceIndex = next;
  }

  confirmChoice(state, game) {
    const cur = this.lines[this.index];
    if (!cur || typeof cur !== "object" || cur.type !== "choice") return false;
    const opts = Array.isArray(cur.options) ? cur.options : [];
    const opt = opts[this.choiceIndex];
    if (!opt) return false;

    try {
      if (typeof opt.onChoose === "function") opt.onChoose(state, game);
    } catch (e) {
      console.error(e);
    }

    // Some choices should immediately close the dialogue without additional text.
    // Used for shop "Cancel"/"Leave" options so the player can back out cleanly.
    if (opt && opt.close === true) {
      this.active = false;
      this.lines = [];
      this.index = 0;
      this.choiceIndex = 0;
      this._charCount = 0;
      this._charAccMs = 0;
      return true;
    }

    // Replace the choice line with its prompt (for pacing) then inject follow-up lines.
    const follow = Array.isArray(opt.after) ? opt.after : (opt.after ? [String(opt.after)] : []);
    const prompt = String(cur.prompt || "");
    this.lines.splice(this.index, 1, ...(prompt ? [prompt] : []), ...follow);

    // Ensure typewriter restarts cleanly on the injected prompt.
    this._charCount = 0;
    this._charAccMs = 0;
    this.choiceIndex = 0;

    return true;
  }


  advance() {
    if (!this.active) return;

    const cur = this.lines[this.index];
    // Choice lines are interactive; advancing happens via confirmChoice().
    if ((cur && typeof cur === "object" && cur.type === "choice")) return;

    // If the current line is still typing, first reveal it fully.
    const full = (String(cur || ""));
    if (this._charCount < full.length) {
      this._charCount = full.length;
      this._charAccMs = 0;
      return;
    }

    this.index++;
    if (this.index >= this.lines.length) {
      this.active = false;
      this._charCount = 0;
      this._charAccMs = 0;
      return;
    }

    // Start typing the next line.
    this._charCount = 0;
    this._charAccMs = 0;
  }

  update(dt) {
    if (!this.active) return;
    const cur = this.lines[this.index];
    if ((cur && typeof cur === "object" && cur.type === "choice")) return;
    const full = (String(cur || ""));
    if (this._charCount >= full.length) return;

    this._charAccMs += dt;
    const add = Math.floor((this._charAccMs * this._charsPerSec) / 1000);
    if (add > 0) {
      this._charCount = Math.min(full.length, this._charCount + add);
      // keep remainder so typing is smooth across frame times
      this._charAccMs = this._charAccMs % Math.max(1, Math.floor(1000 / this._charsPerSec));
    }
  }

  setTextSpeed(speed) {
    const s = (speed || "").toLowerCase();
    if (s === "slow") {
      this._textSpeed = "slow";
      this._charsPerSec = 35;
      return;
    }
    if (s === "fast") {
      this._textSpeed = "fast";
      this._charsPerSec = 120;
      return;
    }
    this._textSpeed = "normal";
    this._charsPerSec = 60;
  }

  
  render(ctx, width, height) {
    if (!this.active) return;
    const boxHeight = 72;
    const y = height - boxHeight;

    // Simplified dialogue box: solid fill + thin border (no tiled panel)
    const inset = 4;
    const bx = inset;
    const by = y + inset;
    const bw = width - inset * 2;
    const bh = boxHeight - inset * 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
    ctx.fillRect(bx, by, bw, bh);

    ctx.strokeStyle = "rgba(240,236,220,0.95)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    // Text readability
    ctx.shadowColor = "rgba(0,0,0,0.90)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";

    const cur = this.lines[this.index];

    // Choice prompt (interactive within the same dialogue box; no new UI surface).
    if (cur && typeof cur === "object" && cur.type === "choice") {
      const prompt = String(cur.prompt || "");
      const opts = Array.isArray(cur.options) ? cur.options : [];
      const lineHeight = 16;

      // Prompt
      const promptLines = wrapText(prompt, bw - 16, ctx);
      let ty = by + 18;
      for (const pl of promptLines) {
        ctx.fillText(pl, bx + 8, ty);
        ty += lineHeight;
      }

      // Options
      ty += 4;
      // Options
      ty += 4;

      // Render up to 4 options. If a Cancel/Leave option exists, keep it pinned to the bottom
      // so shopkeeper menus always show a way out.
      const MAX_VISIBLE = 4;
      const labelOf = (o) => String(o?.label || "");
      const isCancel = (o) => /^(\s*)(cancel|leave|exit|back)(\s*)$/i.test(labelOf(o));
      const cancelIdx = opts.findIndex(isCancel);

      let display = []; // { opt, idx }[]
      let showUp = false;
      let showDown = false;

      if (opts.length <= MAX_VISIBLE) {
        display = opts.map((opt, idx) => ({ opt, idx }));
      } else if (cancelIdx >= 0) {
        const others = opts.map((opt, idx) => ({ opt, idx })).filter((x) => x.idx !== cancelIdx);
        const V = MAX_VISIBLE - 1;

        // If Cancel is selected, keep window at the end; otherwise center-ish around selection.
        const selInOthers = (this.choiceIndex === cancelIdx)
          ? Math.max(0, others.length - 1)
          : Math.max(0, others.findIndex((x) => x.idx === this.choiceIndex));

        const maxStart = Math.max(0, others.length - V);
        const start = Math.min(maxStart, Math.max(0, selInOthers - (V - 1)));
        display = others.slice(start, start + V);
        display.push({ opt: opts[cancelIdx], idx: cancelIdx });

        showUp = start > 0;
        showDown = (start + V) < others.length;
      } else {
        const V = MAX_VISIBLE;
        const maxStart = Math.max(0, opts.length - V);
        const start = Math.min(maxStart, Math.max(0, this.choiceIndex - (V - 1)));
        display = opts.slice(start, start + V).map((opt, idx) => ({ opt, idx: start + idx }));
        showUp = start > 0;
        showDown = (start + V) < opts.length;
      }

      // Up/Down indicators when scrolling is possible
      if (showUp) ctx.fillText("▲", bx + bw - 16, ty);

      display.forEach(({ opt, idx }) => {
        const label = labelOf(opt);
        const prefix = (idx === this.choiceIndex) ? "> " : "  ";
        ctx.fillText(prefix + label, bx + 8, ty);
        ty += lineHeight;
      });

      if (showDown) ctx.fillText("▼", bx + bw - 16, ty - 2);

      return;

      return;
    }

    const fullText = String(cur || "");
    const text = fullText.slice(0, Math.max(0, this._charCount));
    const words = text.split(" ");
    const lineHeight = 16;
    let line = "";
    let row = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const w = ctx.measureText(testLine).width;
      if (w > bw - 16 && i > 0) {
        ctx.fillText(line, bx + 8, by + 18 + row * lineHeight);
        line = words[i] + " ";
        row++;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, bx + 8, by + 18 + row * lineHeight);

    // Prompt
    ctx.font = "10px monospace";
    ctx.fillText("Press E to continue", bx + 8, by + bh - 10);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

}

// ---- helpers ----
function normalizeDialogueLines(lines) {
  const out = [];
  const arr = Array.isArray(lines) ? lines : [String(lines || "")];
  for (const raw of arr) {
    // Pass through non-string "special" dialogue lines (e.g., choice prompts).
    if (raw && typeof raw === "object" && raw.type === "choice") {
      out.push(raw);
      continue;
    }

    const text = String(raw || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    // First split on sentence beats so "exposition" doesn't land as a single wall of text.
    const beats = splitBeats(text);
    for (const b of beats) {
      const wrapped = wrapToMaxChars(b, 62); // render still wraps by width; this is for pacing only
      for (const w of wrapped) out.push(w);
    }
  }
  return out.length ? out : [""];
}

function splitBeats(text) {
  // Prefer punctuation boundaries; keep it conservative to avoid choppy dialogue.
  const parts = [];
  const chunks = text.split(/(?<=[\.!\?])\s+/g);
  for (const c of chunks) {
    const s = c.trim();
    if (!s) continue;
    // If a sentence is still very long, split once on a comma/semicolon.
    if (s.length > 120) {
      const mid = s.search(/[,;:]\s+/);
      if (mid > 20 && mid < 100) {
        parts.push(s.slice(0, mid + 1).trim());
        parts.push(s.slice(mid + 1).trim());
        continue;
      }
    }
    parts.push(s);
  }
  // If no punctuation splitting happened, return as a single beat.
  return parts.length ? parts : [text];
}

function wrapToMaxChars(text, maxChars) {
  if (!text) return [""];
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? (cur + " " + w) : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function wrapText(text, maxWidth, ctx) {
  const t = String(text || "");
  if (!t) return [""];
  const words = t.split(" ");
  const lines = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = line ? (line + " " + word) : word;
    const w = ctx.measureText(testLine).width;
    if (w > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

