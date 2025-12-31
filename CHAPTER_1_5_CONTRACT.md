# Ironwood Crossing — Chapter 1.5 Contract
**Chapter 1.5 Title:** *The Ease of Not Returning*  
**Build Target:** v1.1.0

## Purpose
Chapter 1.5 formalizes the “temptation loop” after the Quarry: the world offers comfort and forward motion, but Ironwood’s recovery depends on whether you keep choosing to return.

This chapter is implemented as **deterministic route gating** plus **minimal, diegetic signposting** (NPC dialogue + access changes). No tutorials, meters, or timers.

---

## Gold-Path Requirements (Deterministic)
**Prerequisite (from Chapter 1):**
1. Complete Quarry rescue and **report back in Ironwood** (Elder/Caretaker debrief).

**Chapter 1.5 required sequence:**
2. **Enter River Road** (first access after reporting back).
3. Speak to the **River Road Scout** to mark River Road as “completed”.
4. **Enter Fishing Village** (unlocks only after River Road completion).
5. Speak to the **Fishing Village Head** to mark Fishing Village as “completed”.
6. **Enter Ursa Bluffs** (unlocks only after Fishing Village completion).
7. Speak to the **Ursa Bluffs Trapper** to mark Ursa Bluffs as “completed”.
8. **Mach Ranch unlocks** only after River Road + Fishing Village + Ursa Bluffs are completed.

---

## Optional vs Required
### Required
- The 8 steps above (including the three “completion” conversations).

### Optional (Allowed, but does not advance the contract)
- Re-entering Junction, Camps, Ironwood.
- Exploring within River Road / Fishing Village / Ursa Bluffs beyond the completion conversation.
- Any combat or looting present in existing maps.

---

## Route Gates (What is Locked and Why)
### River Road access
- **Locked until:** Quarry rescue has been reported back in Ironwood.
- **Rationale:** ensures the post-Quarry “return obligation” is acknowledged before temptation begins.

### Fishing Village access
- **Locked until:** River Road completion conversation.

### Ursa Bluffs access
- **Locked until:** Fishing Village completion conversation.

### Mach Ranch access
- **Locked until:** River Road + Fishing Village + Ursa Bluffs are completed.

---

## Return Pressure: What Changes When the Player Delays
Return Pressure remains **hidden** (no UI). Chapter 1.5 depends on it to make “staying away” feel costly but not punishing.

**Tier effects (high level):**
- **Tier 0–1:** Ironwood dialogue is concerned but stable; small reminders of obligation.
- **Tier 2:** Trust erosion begins; Ironwood NPCs become short, buildings feel quieter.
- **Tier 3+:** Comfort decay increases; Ironwood’s tone shifts toward disappointment and urgency.

Implementation note: effects manifest via **dialogue tone shifts + minor access/comfort changes**, never via hard failure.

---

## Completion Flags (Source of Truth)
These flags are persisted in `state.flags`:
- `chapter1_reportedBack` (prerequisite)
- `chapter1_5_riverRoadComplete`
- `chapter1_5_fishingVillageComplete`
- `chapter1_5_ursaBluffsComplete`
- `chapter1_5_machRanchUnlocked` (derived)

---

## Test Route (Smoke)
1. Load a save that has Quarry cleared and report-back done.
2. Travel Junction → River Road; talk to Scout.
3. River Road → Fishing Village; talk to Head.
4. Fishing Village → Ursa Bluffs; talk to Trapper.
5. Attempt Mach Ranch before step 4 (must fail), then after step 4 (must succeed).

