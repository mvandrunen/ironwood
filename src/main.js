import { startSceneSystem } from "./engine/core/sceneManager.js";
import { WorldScene } from "./scenes/WorldScene.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const initialScene = new WorldScene(canvas, ctx);
startSceneSystem(initialScene);
