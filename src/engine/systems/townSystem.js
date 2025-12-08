import { gameState } from "../state/gameState.js";

export function getBuildingState(buildingId) {
  return gameState.town.buildings[buildingId] || "ruin";
}

export function setBuildingState(buildingId, stateId) {
  gameState.town.buildings[buildingId] = stateId;
}

export function increasePopulation(amount = 1) {
  gameState.town.population += amount;
}

export function adjustReputation(amount) {
  gameState.town.reputation += amount;
}
