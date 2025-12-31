IRONWOOD CROSSING — Build v1.14.2 — Phase 1c Walk-Plane Cleaning Sweep

# Ironwood Crossing — Release Checklist (v1.9.0)

This checklist is the required baseline for tagging a release candidate or shipping build.

## Smoke Test Routes

### Route A — Chapter 1 (baseline)
1. Launch game → Title screen shows build version.
2. **New Game** → confirm intro loads, player can move, no console errors.
3. Reach **Forest Camp** via normal traversal (no debug / no warp).
4. Proceed to **Quarry Entrance** → descend into Quarry layers.
5. Complete the **Quarry Rescue** objective chain.
6. Return to **Ironwood Town** → verify post-Quarry reactivity (dialogue/access changes).
7. Save, Quit-to-Title, **Continue** → verify state persists and player spawns safely.

### Route B — Chapter 1.5 (expanded gold path)
1. From post-Quarry flow, reach **River Road**.
2. Enter **Fishing Village** → complete the “temptation” beat (at least one village interaction) and verify the route breadcrumb toward Ursa Bluffs appears only after that beat.
3. Reach and complete **Ursa Bluffs** → verify completion flag unlocks Mach Ranch route gate.
4. Enter **Mach Ranch** → perform the restraint test:
   - Verify outcome is deterministic (respected vs violated) and reflected via access/dialogue (no morality labels).
5. Save, reload, and re-traverse at least one gate (Village ↔ River Road or Ursa Bluffs ↔ Village) → verify no gate regression, no softlocks, no duplicate NPCs.

## Required Checks
- **No console errors during normal play** (debug OFF).
- Save slots:
  - Slot select works on Title.
  - New Game prompts overwrite when a save exists.
  - Continue loads correct slot state and respects build migration.
- Menus:
  - Title / Settings / Credits / Pause / Quit-to-Title all work.
  - Settings values persist across reload (text speed + volumes).
- Transitions & gates:
  - Region exits never softlock (including repeated transitions).
  - Route gates reference valid map ids and do not regress after reload.
  - Chapter 1.5 completion flags remain stable after save/load.
- Performance:
  - No obvious transition stutter on map changes.
  - No runaway loops (frame rate stable; no memory growth symptoms over 5–10 minutes).
- Debug tooling:
  - Debug overlay is **OFF by default**.
  - Debug hotkeys / warp are only available when debug is enabled.

## Known Issues (update before shipping)
- None logged for v1.9.0. Add issues here as they are discovered.

## How to Report Bugs (minimum info)
When reporting a bug, include:
1. Build version (from Title screen).
2. Save slot used (1/2/3) and whether it was a fresh save or migrated.
3. Exact reproduction steps (where you were, what you did, what you expected).
4. Screenshot of the issue (or short screen recording, if possible).
5. Console output (DevTools → Console) **only if debug was OFF during normal play**.

**If the bug is a softlock:** include current map id + approximate player position (enable debug overlay briefly to capture, then turn it back off).