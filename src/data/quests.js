// src/data/quests.js
// Quest definitions + helper to evaluate progress.
// Keep this data-only so content can scale without engine rewrites.

export const QUEST_DEFS = {
  q1_quarry_rescue: {
    id: "q1_quarry_rescue",
    title: "Quarry Rescue",
    description: "Find out what happened at the quarry and bring word back to Ironwood.",
    objectives: [
      { id: "talk_caretaker", text: "Speak with the Caretaker in Ironwood Town." },
      { id: "visit_upper_camp", text: "Check in at the Upper Forest Camp." },
      { id: "reach_quarry", text: "Reach the Quarry Entrance and speak to the miner." },
      { id: "clear_quarry", text: "Descend into the quarry and drive off the Overseer." },
      { id: "visit_lower_camp", text: "Return to the Lower Forest Camp for guidance." },
      { id: "report_back", text: "Return to the Caretaker with word the miners are safe." },
    ],
    rewards: {
      flags: { chapter1_quarryRescueComplete: true },
      items: [
        {
          id: "pickaxe",
          name: "Pick-Axe",
          kind: "tool",
          amount: 1,
          description: "A miner’s pick. Heavy, honest. Breaks rock and settles arguments.",
        },
        {
          id: "pay_script",
          name: "Pay Script Token",
          kind: "token",
          amount: 1,
          description: "Stamped paper the crews use as payment. Proof you did the work.",
        }
      ],
    },
  },

  q2_crossroads: {
    id: "q2_crossroads",
    title: "Crossroads",
    description: "The valley opens up. The wrong route will cost you time you can't get back.",
    objectives: [
      { id: "reach_junction", text: "Reach Ironwood Junction." },
      { id: "speak_railman", text: "Speak to the railman at the depot." },
      { id: "choose_route", text: "Choose a route: Ursa Bluffs or River Road." },
    ],
    rewards: {
      flags: { chapter1_crossroadsStarted: true },
      items: [],
    },
  },
};

export function allObjectivesComplete(def, progress) {
  if (!def || !def.objectives) return false;
  const done = progress?.objectivesDone || {};
  return def.objectives.every(o => !!done[o.id]);
}
