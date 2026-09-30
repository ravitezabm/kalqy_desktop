# River Adventure (`river-adventure`)

Story-mode, full-body game. Lean/step left and right to steer a rain cloud, hold it over the right target.
Route `/games/river-adventure`; Endeavour island "River Adventure".

## Flow
Episode (shared with Butterfly, first 10 s not skippable) → tracking prep ("Stand where I can see you")
→ training (left, center, right, center; untimed, doesn't count as a level) → levels 1-5 → story complete.
Levels advance automatically after the celebration; no popup between levels.

| # | Scene | Correct | Result |
|---|---|---|---|
| 1 | dry plant | plant | blooms |
| 2 | two birds | thirsty bird | happy bird |
| 3 | forest fire | forest | fire out, smoke clears |
| 4 | two humans | thirsty human | swimming human |
| 5 | fire + water/ice | water | pool's water puts out the fire; ice unused |

## Where things live
* Level data: `games/river/config/levels.config.ts` (positions, visuals, hold time, tolerance, sensitivity, copy). Story levels are
  hard-coded config but use the shape a backend/Learning Mode can supply.
* River-only code: `games/river/` (scene, entities, environment, preload, definition).
* Reusable: `engine/mechanics/` (`BodyLaneController`, `TargetSystem` = hold + choice, `CharacterStateMachine`, `PlacementSystem`),
  `engine/vfx/` (`WaterStream`, `ParticleBurst`, `ParallaxSystem`), `engine/game/` (`StoryGamePage`, `StoryGameDefinition`),
  `engine/hud/StoryHud`, `engine/progression/ProgressManager`, `games/registry.ts`.
* Adding another story game = a `StoryGameDefinition` + a Phaser scene implementing `StoryScene`; the page, HUD, episode, pause/exit,
  persistence and Endeavour reporting come for free (Butterfly and River both run on it).

## Assets
`public/games/river/` (atlases + WebP from `river_water/`). The backdrop is Butterfly's meadow with a drawn river. The "water" choice
in level 5 has no supplied art, so it is drawn at load (`RiverPreloadScene.createWaterPool`) — replace with real art by adding a
`waterPool` image. No river music/SFX files exist: SFX and music are synthesized; drop `public/games/river/audio/river-loop.mp3` to use a track.

## Testing
`npm test` (54 unit tests) and `scripts/e2e/` (headless, mock body).
