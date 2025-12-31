// src/data/dialogue_nodes.js
// Optional dialogue node registry for data-driven branching dialogue.
// Existing content may still use NPC.dialogue(state, game) => string[] directly.
//
// Schema example:
// export const DIALOGUE_NODES = {
//   intro_elder: {
//     id: "intro_elder",
//     lines: ["..."],
//     choices: [{ text: "Continue", next: "intro_elder_2" }],
//     next: null,
//   },
// };

export const DIALOGUE_NODES = {};
export default DIALOGUE_NODES;
