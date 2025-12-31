// src/engine/input.js
export function setupInput(game) {
  window.addEventListener("keydown", (e) => {
    // Prefer unified handler in Game (supports title/pause/product shell).
    if (typeof game.handleKeyDown === "function") {
      const handled = game.handleKeyDown(e);
      if (handled) return;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (typeof game.handleKeyUp === "function") {
      const handled = game.handleKeyUp(e);
      if (handled) return;
    }
  });
}
