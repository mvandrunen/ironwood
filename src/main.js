import { Game } from "./engine/core.js";
import { setupInput } from "./engine/input.js";

function hideBootWarning() {
  const el = document.getElementById("boot-warning");
  if (el) el.style.display = "none";
}

function showBootError(err) {
  const msg = (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err);
  const el = document.getElementById("boot-warning");
  if (el) {
    el.style.display = "flex";
    el.innerHTML = `
      <div style="max-width: 290px;">
        <div style="font-weight:700; margin-bottom:6px;">Game failed to start</div>
        <div style="font-size:12px; line-height:1.35; opacity:0.92; margin-bottom:8px;">
          Open DevTools Console for details. If you're running via <code>file://</code>, use
          <code>start_server.sh</code>/<code>start_server.bat</code> and reload.
        </div>
        <pre style="white-space:pre-wrap; font-size:10px; line-height:1.3; max-height:180px; overflow:auto; background:rgba(255,255,255,0.08); padding:8px; border:1px solid rgba(255,255,255,0.18);">${msg}</pre>
      </div>
    `;
  }
}

let canvas;
let game;

try {
  canvas = document.getElementById("game");
  if (!canvas) throw new Error("Missing <canvas id=\"game\"> in index.html");
  // Make the canvas focusable so keyboard input is reliable (esp. when served from simple local servers).
  canvas.tabIndex = 0;
  canvas.style.outline = "none";
  canvas.addEventListener("click", () => canvas.focus());
  // Attempt to capture keyboard input immediately.
  setTimeout(() => { try { canvas.focus(); window.focus(); } catch (_) {} }, 0);

  game = new Game(canvas);
  // Expose a handle for debugging in DevTools.
  // (Useful for inspecting state and diagnosing transitions.)
  window.game = game;
  setupInput(game);
  hideBootWarning();
} catch (e) {
  // If we fail before the loop starts, keep a visible error instead of a blank canvas.
  showBootError(e);
  throw e;
}

// Main loop: fixed-timestep update with accumulator to reduce stutter and avoid runaway re-render loops.
const FIXED_DT = 1000 / 60; // 16.666...
let last = performance.now();
let acc = 0;

function loop(now) {
  const frame = Math.min(100, now - last); // clamp to avoid spiral after tab-switch
  last = now;
  acc += frame;

  // Step simulation in fixed increments.
  while (acc >= FIXED_DT) {
    game.update(FIXED_DT);
    acc -= FIXED_DT;
  }

  game.render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
