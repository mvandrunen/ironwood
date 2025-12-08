const entities = [];

export function addEntity(entity) {
  entities.push(entity);
}

export function getEntities() {
  return entities;
}

export function updateEntities(dt) {
  for (const e of entities) {
    if (e.update) e.update(dt);
  }
}

export function renderEntities(ctx) {
  for (const e of entities) {
    if (e.render) e.render(ctx);
  }
}
