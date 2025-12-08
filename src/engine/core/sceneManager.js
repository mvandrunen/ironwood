let currentScene = null;
let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (currentScene) {
    if (currentScene.update) currentScene.update(dt);
    if (currentScene.render) currentScene.render();
  }

  requestAnimationFrame(loop);
}

export function startSceneSystem(initialScene) {
  changeScene(initialScene);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

export function changeScene(newScene) {
  if (currentScene && currentScene.onExit) {
    currentScene.onExit();
  }
  currentScene = newScene;
  if (currentScene && currentScene.onEnter) {
    currentScene.onEnter();
  }
}

export function getCurrentScene() {
  return currentScene;
}
