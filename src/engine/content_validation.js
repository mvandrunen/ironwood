// src/engine/content_validation.js
// Centralized content validators. Kept lightweight and run once at boot (or on demand).
// Goal: fail fast with actionable errors instead of blank screens or softlocks.

function pushErr(errors, code, msg, ctx = {}) {
  const ctxStr = Object.keys(ctx).length ? ` | ${JSON.stringify(ctx)}` : "";
  errors.push(`${code}: ${msg}${ctxStr}`);
}

export function validateQuestDefs(questDefs) {
  const errors = [];
  if (!questDefs || typeof questDefs !== "object") {
    pushErr(errors, "QUESTS/ROOT", "QUEST_DEFS missing or not an object");
    return errors;
  }

  for (const [qid, def] of Object.entries(questDefs)) {
    if (!def || typeof def !== "object") {
      pushErr(errors, "QUESTS/DEF", "Quest def not an object", { qid });
      continue;
    }
    if (def.id !== qid) {
      pushErr(errors, "QUESTS/ID", "Quest def.id must match key", { key: qid, id: def.id });
    }
    if (!Array.isArray(def.objectives) || def.objectives.length === 0) {
      pushErr(errors, "QUESTS/OBJ", "Quest objectives must be a non-empty array", { qid });
    } else {
      const seen = new Set();
      for (const o of def.objectives) {
        if (!o || typeof o !== "object") {
          pushErr(errors, "QUESTS/OBJ_ITEM", "Objective not an object", { qid });
          continue;
        }
        if (typeof o.id !== "string" || !o.id.trim()) {
          pushErr(errors, "QUESTS/OBJ_ID", "Objective missing id", { qid, objective: o });
          continue;
        }
        if (seen.has(o.id)) pushErr(errors, "QUESTS/OBJ_DUP", "Duplicate objective id", { qid, id: o.id });
        seen.add(o.id);
      }
    }
  }
  return errors;
}

export function validateDialogueNodes(dialogueNodes) {
  const errors = [];
  if (!dialogueNodes) return errors; // optional
  if (typeof dialogueNodes !== "object") {
    pushErr(errors, "DIALOGUE/ROOT", "DIALOGUE_NODES is not an object");
    return errors;
  }

  const ids = new Set(Object.keys(dialogueNodes));
  for (const [id, node] of Object.entries(dialogueNodes)) {
    if (!node || typeof node !== "object") {
      pushErr(errors, "DIALOGUE/NODE", "Dialogue node not an object", { id });
      continue;
    }
    if (node.id && node.id !== id) {
      pushErr(errors, "DIALOGUE/ID", "Dialogue node.id must match key", { key: id, id: node.id });
    }
    if (node.choices && !Array.isArray(node.choices)) {
      pushErr(errors, "DIALOGUE/CHOICES", "choices must be an array when present", { id });
    }
    if (Array.isArray(node.choices)) {
      for (const c of node.choices) {
        if (!c || typeof c !== "object") {
          pushErr(errors, "DIALOGUE/CHOICE_ITEM", "Choice not an object", { id });
          continue;
        }
        if (c.next && !ids.has(c.next)) {
          pushErr(errors, "DIALOGUE/MISSING_BRANCH", "Choice points to missing node", { id, next: c.next });
        }
      }
    }
    if (node.next && typeof node.next === "string" && !ids.has(node.next)) {
      pushErr(errors, "DIALOGUE/NEXT_MISSING", "Node.next points to missing node", { id, next: node.next });
    }
  }
  return errors;
}

export function validateNPCsForMap(map, dialogueNodes) {
  const errors = [];
  if (!map || typeof map !== "object") return errors;
  if (!Array.isArray(map.npcs)) return errors;

  const seen = new Set();
  for (const npc of map.npcs) {
    if (!npc || typeof npc !== "object") {
      pushErr(errors, "NPC/ITEM", "NPC is not an object", { map: map.id });
      continue;
    }
    if (typeof npc.id !== "string" || !npc.id.trim()) {
      pushErr(errors, "NPC/ID", "NPC missing id", { map: map.id });
      continue;
    }
    if (seen.has(npc.id)) pushErr(errors, "NPC/DUP", "Duplicate NPC id in map", { map: map.id, id: npc.id });
    seen.add(npc.id);

    const x = npc.x, y = npc.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      pushErr(errors, "NPC/POS", "NPC position must be numeric", { map: map.id, id: npc.id, x, y });
    } else if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
      pushErr(errors, "NPC/OOB", "NPC position out of bounds", { map: map.id, id: npc.id, x, y, w: map.width, h: map.height });
    }

    const hasDialogueFn = typeof npc.dialogue === "function";
    const hasDialogueId = typeof npc.dialogueId === "string" && npc.dialogueId.trim();
    if (!hasDialogueFn && !hasDialogueId) {
      pushErr(errors, "NPC/DIALOGUE", "NPC must define dialogue() or dialogueId", { map: map.id, id: npc.id });
    }
    if (hasDialogueId) {
      if (!dialogueNodes || typeof dialogueNodes !== "object" || !dialogueNodes[npc.dialogueId]) {
        pushErr(errors, "NPC/DIALOGUE_ID", "NPC dialogueId missing from DIALOGUE_NODES", { map: map.id, id: npc.id, dialogueId: npc.dialogueId });
      }
    }
  }

  return errors;
}

function validateExitGates(maps, questDefs) {
  const errors = [];
  if (!maps || typeof maps !== "object") return errors;

  const questObjectiveSet = new Map();
  if (questDefs && typeof questDefs === "object") {
    for (const [qid, q] of Object.entries(questDefs)) {
      const set = new Set((q?.objectives || []).map(o => o.id));
      questObjectiveSet.set(qid, set);
    }
  }

  for (const [key, map] of Object.entries(maps)) {
    if (!map || typeof map !== "object") continue;
    const exits = Array.isArray(map.exits) ? map.exits : [];
    for (const ex of exits) {
      if (!ex || typeof ex !== "object") continue;
      if (!ex.gate) continue;

      const gate = ex.gate;
      if (!Array.isArray(gate.requires)) {
        pushErr(errors, "GATE/REQ", "gate.requires must be an array", { map: map.id || key, to: ex.to });
        continue;
      }

      for (const req of gate.requires) {
        if (!req || typeof req !== "object") {
          pushErr(errors, "GATE/REQITEM", "gate requirement must be an object", { map: map.id || key, to: ex.to });
          continue;
        }

        if (req.type === "flag") {
          if (typeof req.id !== "string" || !req.id.trim()) {
            pushErr(errors, "GATE/FLAG", "flag requirement missing id", { map: map.id || key, to: ex.to });
          }
          continue;
        }

        if (req.type === "item") {
          if (typeof req.id !== "string" || !req.id.trim()) {
            pushErr(errors, "GATE/ITEM", "item requirement missing id", { map: map.id || key, to: ex.to });
          }
          continue;
        }

        if (req.type === "questObjective") {
          const qid = req.questId;
          const oid = req.objectiveId;
          if (typeof qid !== "string" || !qid.trim() || typeof oid !== "string" || !oid.trim()) {
            pushErr(errors, "GATE/QUESTFMT", "questObjective requirement missing questId/objectiveId", { map: map.id || key, to: ex.to });
            continue;
          }
          if (!questObjectiveSet.has(qid)) {
            pushErr(errors, "GATE/QUEST", "questObjective references unknown questId", { map: map.id || key, to: ex.to, questId: qid });
            continue;
          }
          if (!questObjectiveSet.get(qid).has(oid)) {
            pushErr(errors, "GATE/OBJ", "questObjective references unknown objectiveId", { map: map.id || key, to: ex.to, questId: qid, objectiveId: oid });
          }
          continue;
        }

        pushErr(errors, "GATE/TYPE", "unknown gate requirement type", { map: map.id || key, to: ex.to, type: req.type });
      }
    }
  }

  return errors;
}

export function validateAllContent({ maps, questDefs, dialogueNodes }) {
  const errors = [];
  if (!maps || typeof maps !== "object") {
    pushErr(errors, "MAPS/ROOT", "maps missing or not an object");
    return errors;
  }

  for (const [key, map] of Object.entries(maps)) {
    if (!map || typeof map !== "object") continue;
    if (map.id && map.id !== key) {
      pushErr(errors, "MAP/ID", "map.id must match key", { key, id: map.id });
    }
    errors.push(...validateNPCsForMap(map, dialogueNodes));
  }

  errors.push(...validateDialogueNodes(dialogueNodes));
  errors.push(...validateQuestDefs(questDefs));
  errors.push(...validateExitGates(maps, questDefs));
  return errors;
}
