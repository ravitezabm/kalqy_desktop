# Tabla Rhythm (game #5)

Two-hand rhythm game (HAND_PRECISE): the game plays a pattern on the drums, the child copies it with both hands.
Route `/games/tabla-festival` (Endeavour "Tabla Festival"), registry id `tabla-rhythm`.

## Reusable engine pieces
| Piece | Where | Role |
|---|---|---|
| `RhythmPattern` (+ `parsePattern`) | `engine/rhythm` | Events with beats and hits (`hand`: left/right/either, `tabla`); no hits = rest; 2 hits = together. Levels are written as tokens: `"1"`, `"L2"`, `"L1+R3"`, `"-"` |
| `RhythmClock` | `engine/rhythm` | Pure bpm/beat/bar ↔ time; negative beats are the count-in |
| `RhythmEngine` | `engine/rhythm` | DEMO and PLAYER modes over one pattern; returns cues, judges hits, expires misses. No audio, no Phaser |
| `RhythmValidator` | `engine/rhythm` | Matches hits to events (tabla, hand, timing window, simultaneous window) → perfect/good/near/miss |
| `RhythmScore` | `engine/rhythm` | Score, streak, two-hand bonus from a config |
| `HandZoneHitDetector` | `engine/mechanics/hand-zones` | Per-hand hits on circular zones: entry / tap / press, confidence gate, min interval (no audio spam), edge hysteresis |
| `BeatIndicator` | `engine/vfx` | Glowing beat dots |
| `AudioManager` rhythm API | `engine/audio` | `loadSamples` (decoded once), `scheduleSample(id, at)` on the audio clock, `scheduleClick`, `cancelScheduled(group)`, drone |

Time is the **audio clock** (`AudioContext.currentTime`). Pausing suspends the context, so the rhythm clock and every scheduled sound pause together; leaving/restarting a level calls `cancelScheduled`.

## Hands
`MotionEngine.hand("left" | "right")` were already independent. Fix made in the universal tracker: MediaPipe labels hands as if the image were mirrored, our frames are raw, so the labels are swapped — `left` is the child's left hand. (Verified only by reasoning and MediaPipe's docs, not on a real hand — check left/right on a real camera once.) The mock provider now has two independent scripted hands (`window.__kalqyMockHands.left/right` with `moveTo`, `setVisible`, `tap`).

## Levels
`games/tabla-rhythm/config/levels.config.ts` — training (3 lessons, then a 4-note pattern) + 10 story levels as data: bpm, tabla count, pattern, timing windows, hints, pass ratio, scoring, goals. A round that is under the pass ratio is demonstrated again (up to 3 tries), never failed; only the level timer (which runs while the child is playing) can fail a level.

## Assets
Raw files are in `tabala_assets/`; `python3 scripts/tabla-assets.py` builds `public/games/tabla-rhythm/` (drum webp, kid atlases, the stroke wavs renamed to their stroke). The 17 supplied strokes are mapped by name (`ga na tin dha` on the four drums; `dhin ga` for the closing note); 8 are decoded. No fail animation or background was supplied: the kid's idle is reused, and the backdrop is the Market Catch market graded to evening in code. Music is procedural (drone, count-in ticks, bar chimes) — no track file.
