# Audio Identity System (v1.15.2)

This build extends the existing Music System with:

- Region-routed ambient beds (wind, insects, rail creak, water lap, interior near-silence)
- Asset-based UI SFX (open/close/tap/pickup/scroll)
- Footstep surface SFX (grass/dirt/wood/stone)
- Weapon SFX (blade swing, pistol, rifle)

## Where assets live

- Music: `assets/music/*.wav` (existing)
- Ambience: `assets/ambience/*.wav`
- SFX: `assets/sfx/*.wav`

All files in `ambience/` and `sfx/` are **placeholder procedural WAVs** generated for development.
Replace them with frontier-authentic recordings later (recommended: `.ogg` for size),
keeping filenames stable (or updating the routing maps).

## Routing

- Ambience tracks + map routing:
  - `src/data/ambient_tracks.js`:
    - `AMBIENT_TRACKS` (key -> file)
    - `MAP_AMBIENT` (map id -> ambient key)

- UI / Step / Weapon SFX:
  - `src/data/sfx_maps.js`

## Engine

- `src/engine/ambient.js`: crossfaded looping ambient layer (HTMLAudio)
- `src/engine/sfx.js`: pooled one-shot SFX (HTMLAudio)
- `src/engine/core.js`:
  - syncs ambient every tick (like music)
  - plays UI sounds on screen transitions
  - plays dialogue tap on advance/confirm
  - plays pickup sound on item acquisition
  - plays footstep sound on successful movement
  - plays blade/gun SFX on attack/shoot

## Notes on intent (Constitution-aligned)

- Ambience is intentionally sparse.
- Interiors are near-silent to make exterior contrast meaningful.
- Ursa Bluffs is mostly wind: exposed endurance, not constant noise.
