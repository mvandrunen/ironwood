import { gameState } from "../state/gameState.js";

export function startQuest(id) {
  if (!gameState.quests.active.includes(id) && !gameState.quests.completed.includes(id)) {
    gameState.quests.active.push(id);
  }
}

export function completeQuest(id, rewards = {}) {
  gameState.quests.active = gameState.quests.active.filter(q => q !== id);
  if (!gameState.quests.completed.includes(id)) {
    gameState.quests.completed.push(id);
  }

  if (rewards.gold) gameState.player.gold += rewards.gold;
  if (rewards.scores) {
    for (const key of Object.keys(rewards.scores)) {
      if (gameState.scores[key] != null) {
        gameState.scores[key] += rewards.scores[key];
      }
    }
  }
}

export function setFlag(flag, value = true) {
  gameState.quests.flags[flag] = value;
}

export function getFlag(flag) {
  return !!gameState.quests.flags[flag];
}
