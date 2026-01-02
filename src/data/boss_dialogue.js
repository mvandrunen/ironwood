// src/data/boss_dialogue.js
// Canon-aligned boss conversations (grounded, plainspoken, no mysticism).

export const BOSS_DIALOGUE = {
  quarry_overseer: {
    intro: [
      "So you're the one walking my cuts like you own them.",
      "This pit runs because I keep men moving and mouths fed.",
      "Turn back. The town doesn't pay for trouble anymore."
    ],
    outro: [
      "…Alright. Take your proof and go.",
      "Tell Ironwood what this place has been doing to it.",
      "This mine will keep taking until someone shuts the books."
    ],
  },

  bluff_warden: {
    intro: [
      "You don't cross Ursa without paying for it.",
      "The road is narrow for a reason. Keeps the wrong people out.",
      "Hand over what you've got and walk away breathing."
    ],
    outro: [
      "Fine. Keep your coat and your pride.",
      "But the next man up this bluff won't talk first.",
      "If you're heading back to Ironwood—move with your eyes open."
    ],
  },

  vale_lieutenant: {
    intro: [
      "Orders are clear: no one passes with questions still in their pocket.",
      "Vale doesn't fear a blade. He fears a town remembering.",
      "Turn around. Last warning I'm allowed to give."
    ],
    outro: [
      "…He'll replace me by morning.",
      "If you mean to return, don't do it loud.",
      "Go—before I decide to be useful again."
    ],
  },

  deacon_vale: {
    intro: [
      "You left Ironwood. I stayed and kept it from starving.",
      "Empty chairs invite men like me. That's not evil—it's arithmetic.",
      "If you want your town back, you'll have to take it from my hands."
    ],
    outro: [
      "So that's what return looks like.",
      "Do what I wouldn't: leave room for people to come home.",
      "Ironwood is yours to rebuild—if you can bear it."
    ],
  },
};

export function getBossIntro(archetypeId) {
  return BOSS_DIALOGUE?.[archetypeId]?.intro || [];
}

export function getBossOutro(archetypeId) {
  return BOSS_DIALOGUE?.[archetypeId]?.outro || [];
}
