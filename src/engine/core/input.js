const keysDown = new Set();

window.addEventListener("keydown", (e) => {
  keysDown.add(e.key);
});

window.addEventListener("keyup", (e) => {
  keysDown.delete(e.key);
});

export function isKeyDown(key) {
  return keysDown.has(key);
}
