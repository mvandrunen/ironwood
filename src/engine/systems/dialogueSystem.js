let activeDialogue = null;

export function startDialogue(dialogueId) {
  activeDialogue = {
    id: dialogueId,
    lineIndex: 0
  };
}

export function advanceDialogue() {
  if (!activeDialogue) return;
  activeDialogue.lineIndex += 1;
}

export function endDialogue() {
  activeDialogue = null;
}

export function getActiveDialogue() {
  return activeDialogue;
}
