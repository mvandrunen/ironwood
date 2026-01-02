# IRONWOOD CROSSING — Build v1.17.0 — Boss Conversations (Pre/Post)

## Implemented
- Step 5: Boss Auto-Conversation on Entry (before combat), plus post-defeat conversation.

## Key behaviors
- Entering a boss location now triggers a one-time intro dialogue (if the boss is present/alive).
- After defeating the boss, a one-time outro dialogue triggers (immediately, while still in the location).
- While dialogue is active, gameplay simulation is frozen (prevents boss attacks during conversations).

## Files changed / added
- **Added:** `src/data/boss_dialogue.js` (canon-aligned boss intro/outro dialogue lines)
- **Changed:** `src/engine/core.js`
  - Triggers now run before combat update
  - Gameplay simulation freezes during active dialogue
  - Build version bump
- **Changed:** `src/data/regions/region1.js`
  - Added boss intro/outro trigger for `quarry_boss_room` (Quarry Overseer)
  - Added conditional boss intro/outro trigger for `ironwood_town` (Deacon Vale when present)
- **Changed:** `src/data/regions/region2.js`
  - Added boss intro/outro trigger for `ursa_bluffs` (Bluff Warden)
- **Changed:** `src/data/regions/region_future.js`
  - Added boss intro/outro trigger for `precipice_pass` (Vale Lieutenant)

## Flags used
- `bossIntro_<archetypeId>` and `bossOutro_<archetypeId>` (stored under `state.flags`)
- Uses existing progression flags for post-defeat detection:
  - `quarryCleared`
  - `checkpoint2_ursaBossDefeated`
  - `checkpoint3_precipiceBossDefeated`
  - `finalBossDefeated`
