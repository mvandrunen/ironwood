import { gameState } from "../state/gameState.js";

export function evaluateEnding() {
  const { security, prosperity, discovery, community } = gameState.scores;
  const max = Math.max(security, prosperity, discovery, community);

  if (max === security) return "iron_fortress";
  if (max === prosperity) return "mercantile_hub";
  if (max === discovery) return "frontier_university";

  return "golden_ironwood";
}
