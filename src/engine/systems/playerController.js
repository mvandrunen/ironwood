import { isKeyDown } from "../core/input.js";
import { isBlocked, TILE_SIZE } from "./mapSystem.js";
import { gameState } from "../state/gameState.js";

const MOVE_COOLDOWN_MS = 120;
let moveCooldown = 0;

export function updatePlayer(dt) {
  moveCooldown -= dt * 1000;
  if (moveCooldown > 0) return;

  let dx = 0;
  let dy = 0;

  if (isKeyDown("ArrowUp")) dy = -1;
  else if (isKeyDown("ArrowDown")) dy = 1;
  else if (isKeyDown("ArrowLeft")) dx = -1;
  else if (isKeyDown("ArrowRight")) dx = 1;

  if (dx === 0 && dy === 0) return;

  const p = gameState.player;
  const targetX = p.x + dx;
  const targetY = p.y + dy;

  if (!isBlocked(targetX, targetY)) {
    p.x = targetX;
    p.y = targetY;
    moveCooldown = MOVE_COOLDOWN_MS;
  }
}

export function renderPlayer(ctx) {
  const p = gameState.player;
  ctx.fillStyle = "#000";
  ctx.fillRect(
    p.x * TILE_SIZE + 4,
    p.y * TILE_SIZE + 4,
    TILE_SIZE - 8,
    TILE_SIZE - 8
  );
}
