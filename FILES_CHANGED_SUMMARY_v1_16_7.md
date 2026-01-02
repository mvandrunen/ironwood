# IRONWOOD CROSSING — Build v1.16.7-shop-cancel

Scope: Point 2 — Restore Cancel/Leave option visibility in shopkeeper choice menus.

## Fix
- Dialogue choice rendering no longer hard-limits to the first 3 options.
- Renders up to 4 visible options with scrolling indicators (▲/▼) when needed.
- If a Cancel/Leave/Exit/Back option exists, it is pinned to the bottom of the visible list to ensure the player always has an escape route (shopkeeper UX).

## Files changed
- src/engine/dialogue.js
- src/engine/core.js
