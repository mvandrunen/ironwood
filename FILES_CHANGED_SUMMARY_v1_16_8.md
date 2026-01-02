# IRONWOOD CROSSING — Build v1.16.8 — Audio Identity Pass (Step 3)

## Goal
Remove background music completely while preserving world pressure through SFX/ambience, and add a clear audio cue when the player takes HP damage.

## Changes
### Music
- MusicManager is force-disabled on startup (`this._music.setEnabled(false)`).
- Map/combat routing remains in place but is inert because music is disabled.

### Player Hit SFX
- Added new player hit SFX assets:
  - `assets/sfx/player_hit_1.wav`
  - `assets/sfx/player_hit_2.wav`
- Added `PLAYER_SFX` mapping and `playPlayer()` in SfxManager.
- Wired `damagePlayer()` to trigger `playPlayer("hit")` when HP decreases.

## Files changed
- `src/engine/core.js`
- `src/engine/sfx.js`
- `src/data/sfx_maps.js`
- `assets/sfx/player_hit_1.wav` (new)
- `assets/sfx/player_hit_2.wav` (new)
- `FILES_CHANGED_SUMMARY_v1_16_8.md` (new)
