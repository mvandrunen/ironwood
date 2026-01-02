# FILES_CHANGED_SUMMARY_v1_16_9.md

Build: v1.16.9-revolver-projectile-fix

## Purpose
Fix revolver/pistol shots damaging the player by ensuring player-fired projectiles are marked as `owner: "player"` (matching the marksman projectile system), so collision logic treats them as player-owned.

## Changes
- src/engine/core.js
  - `BUILD_VERSION` -> `v1.16.9-revolver-projectile-fix`
  - `_spawnProjectile(...)` now persists `spec.owner` onto the projectile object:
    - `owner: spec?.owner ?? "enemy"`
  - This makes `shoot()`'s existing `projSpec.owner = "player"` effective, preventing self-damage.
