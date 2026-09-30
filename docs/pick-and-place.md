# Pick & Place engine (Word Eggs is its first game)

Subject-blind: nothing in the engine knows about eggs, letters or English.

    engine/content/     PromptSequence, OptionGenerator, ContentValidator, ContentRenderer, skins/EggSkin,
                        GameConfigProvider (local / remote / cached + fallback chain), random (seeded)
    engine/mechanics/   pick-place/PickAndPlaceEngine (hover → grab → drag → drop → correct / incorrect / missed / returned),
                        answer/AnswerValidator (compares normalised content, never appearance)
    engine/physics/     PhysicsOptionController (Arcade physics for loose pieces only)
    engine/vfx/         HandCursor, ParticleBurst
    engine/motion/hand  HandGesture (open / pinch / fist with hysteresis) — on `motion.hand().gesture`

## A new subject = new content, no new code
Numbers: `PromptSequence.fromValues([2, 4, null, 8], "number", {type:"number", value:6})`, options from
`generateOptions({ correct, pool: numbers, ... })`. Shapes: `type: "shape"` (circle/square/triangle/star drawers built in).
Skins: `OPTION_SKINS` (egg now; card/circle/sprite implement `OptionSkin`). Content drawers are registered by type.

## Word Eggs (`games/word-eggs/`)
* `config/levels.config.ts` — training + exactly 10 story slots; word length ≤ 5 (validated); option count fixed or a range;
  physics, magnet/drop radii, egg scale and the drag gesture (`grab` | `pinch` | `either`) are all config.
* `config/wordBank.ts` — curated pools per length + a larger set of valid words used only to reject distractors that would
  spell a second real word.
* `RoundBuilder.ts` — random word, random missing position, unique distractors (look-alikes on harder levels), validated,
  falls back to a known-good round. Dev: `?seed=123` reproduces the same words/layout.
* Saved per profile with the shared `ProgressManager` (`kalqy.word-eggs.progress.*`).

## Config sources
`loadWithFallback([remote, cached, local], safeDefault)`. `RemoteGameConfigProvider` is ready (fetch + validate + cache) but
not wired to a URL yet. Config is declarative; only registered skins / drawers / mechanics can be selected.

## Not done
Card/circle/sprite skins, a dwell-to-pick fallback gesture, real (non-synthesized) audio, reach/predictive drag on hand loss,
wiring the remote provider to a backend. The training ghost hand is drawn with simple shapes.
