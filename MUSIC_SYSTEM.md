# Music System (v1.11.0)

This build introduces a lightweight background-music system:

- Per-location routing (map id -> theme)
- Crossfade between themes on transitions
- Combat proximity override (plays a short tension loop when an enemy is close)
- Uses the existing Settings menu sliders:
  - Music Volume
  - SFX Volume

## Where music files live

`assets/music/*.wav`

These `.wav` files are **placeholder low‑fi hybrid loops** generated for development.
You can replace them with your final compositions later (recommended: `.ogg` or `.mp3` for smaller size)
as long as you keep the filenames (or update `src/data/music_tracks.js`).

## Routing

See `src/data/music_tracks.js` for:
- `MUSIC_TRACKS` (track key -> file)
- `MAP_MUSIC` (map id -> track key)

## Autoplay note

Browsers block autoplay. Music begins after the first user input (key press), consistent with the SFX unlock path.
