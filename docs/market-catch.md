# Market Catch (game #4)

Body-movement game: fruit falls, the child moves left/right (BODY_MOTION) to steer the kid and catch the requested fruit.
Route `/games/market-catch` (Endeavour "Market Day"), registry id `market-catch`.

## What is reusable (all under `src/engine/`)

| Piece | Where | Role |
|---|---|---|
| `ObjectDefinition` / `ObjectRegistry` | `mechanics/falling-objects` | What a falling thing *is* (fruit, number, shape…) — never referenced by name in engine code |
| `ObjectSpawner` | `mechanics/falling-objects` | Pure spawn logic: interval, pools, reachability, spacing, guaranteed wanted object |
| `FallingObjectManager` + `renderObject` | `mechanics/falling-objects` | Pooled Arcade sprites, catcher overlap, sprite/text/shape rendering |
| `CollectionRule` / `CollectionGoal` | `mechanics/collection` | "Which objects count" (id, category, tag, value compare, registered custom rule) and multi-target progress |
| `ScoreManager` | `mechanics/collection` | Score/streak from a `ScoringConfig` |
| `DirectionalMovementController` | `mechanics/movement` | Acceleration/braking toward a target x |
| `LaneLesson` | `mechanics/movement` | The move-left / right / middle tutorial state machine |
| `CharacterReactionManager` + `AtlasCharacter` | `mechanics`, `entities` | Characters reacting to events from a table; sprite-sheet state animation |
| `FloatingText` | `vfx` | Pooled "+10" popups |

Market-specific code is only `src/games/market-catch/`: assets, fruit registry, the 11 level definitions, scene layout and the catch/miss reactions.

## Levels
`config/levels.config.ts` — training + 10 story levels as data (goal targets, spawn interval/speed/ratios, distractors, hazards, scoring, size). Every level is validated (`validateMarketLevel`) before it starts; an invalid one falls back to `SAFE_FALLBACK_LEVEL`.

## Assets
Raw art lives in `market_assets/`; `python3 scripts/market-assets.py` builds `public/games/market-catch/` (trimmed fruit webp, character sheets → atlas webp + JSON). Note: the supplied `grape_rotten.png` is the whole fruit sheet, so the rotten grapes are cut out of it. No music/sfx files were supplied: sounds are synthesized by `AudioManager`; drop `public/games/market-catch/audio/market-loop.mp3` to replace the loop.

## Learning mode (not built, supported)
A backend level is just objects + a rule + spawn numbers, e.g. "catch numbers greater than 5": register `{type:"number", value:n, visual:{renderer:"text"}}` objects and use goal rule `{type:"value", op:"greaterThan", value:5}` (a goal target's `rule` — levels currently build `objectId` rules from config; extend the loader, not the engine).
