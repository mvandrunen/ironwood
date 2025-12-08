import { loadMap, drawCurrentMap, getCurrentMap } from "../engine/systems/mapSystem.js";
import { updatePlayer, renderPlayer } from "../engine/systems/playerController.js";
import { gameState } from "../engine/state/gameState.js";
import { isKeyDown } from "../engine/core/input.js";

export class WorldScene {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.mapLoaded = false;

    this.message = "";
    this.messageTimer = 0;
  }

  onEnter() {
    this.mapLoaded = false;
    this.message = "";
    this.messageTimer = 0;

    const mapId = gameState.player.mapId;

    loadMap(mapId)
      .then(() => {
        this.mapLoaded = true;
      })
      .catch(() => {
        this.mapLoaded = false;
      });
  }

  update(dt) {
    if (!this.mapLoaded) return;

    updatePlayer(dt);
    this.handleInteraction();

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.messageTimer = 0;
        this.message = "";
      }
    }
  }

  handleInteraction() {
    if (!(isKeyDown("e") || isKeyDown("E"))) return;
    const map = getCurrentMap();
    if (!map || !map.interactables) return;

    const p = gameState.player;

    for (const it of map.interactables) {
      if (p.x === it.x && p.y === it.y) {
        this.message = it.message || "There is something interesting here.";
        this.messageTimer = 3;
        break;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.mapLoaded) {
      drawCurrentMap(ctx);
    }

    renderPlayer(ctx);

    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(`Map: ${gameState.player.mapId}`, 4, 12);
    ctx.fillText(`Pos: (${gameState.player.x}, ${gameState.player.y})`, 4, 24);

    if (this.messageTimer > 0 && this.message) {
      const boxHeight = 40;
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(0, this.canvas.height - boxHeight, this.canvas.width, boxHeight);

      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText(this.message, 6, this.canvas.height - boxHeight + 16);
      ctx.fillText("(E to interact)", 6, this.canvas.height - 6);
    }
  }

  onExit() {}
}
