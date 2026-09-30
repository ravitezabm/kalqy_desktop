# Motion Engine

`src/engine/motion/` is the only place that knows about cameras, MediaPipe or tracking.
Games read `context.motion` and nothing else.

    MotionEngine ── MotionProvider ─┬─ MediaPipeMotionProvider (real camera)
                                    └─ MockMotionProvider      (tests / ?demo=1)

## Profiles (`TrackingProfiles.ts`)
| Profile | Hand model | Pose model |
|---|---|---|
| HAND_BASIC / HAND_PRECISE | yes | no |
| BODY_MOTION | no | yes |
| HAND_BODY | yes | yes |

Only the models a profile asks for are created. Models and WASM are vendored offline in
`public/vendor/mediapipe/` (`hand_landmarker.task`, `pose_landmarker_lite.task`).

## Body API — `motion.body()`
`visible, confidence, joint(name), center(), centerVelocity(), scale(), angle(a,b,c), isMoving(),
movementDirection(), isLeaningLeft/Right(), isReaching(), isSquatting(), isJumping()`.

* All coordinates are normalized 0..1 and mirrored (moving right moves right on screen).
* `center()` is the smoothed (One Euro) torso center from shoulders + hips; velocity is in
  body-widths/second so a small/far child behaves like a large/near one.
* Direction needs sustained movement (`minMovementMs`) and releases with hysteresis; the
  left/right lean uses a configurable dead zone (`deadZone.left/right`, default 0.40 / 0.60).
* Tunables live in `BodyMotionConfig` (`BodyAnalyzer.ts`); games pass overrides via `MotionConfig.body`.
* `BodyAnalyzer` is pure (no MediaPipe/DOM) and unit-tested; the mock provider feeds it synthetic
  landmarks, so mock and real tracking share the same semantics.

## Events
`motion.on("bodyDetected" | "bodyLost" | "bodyRecovered" | "movementLeft" | "movementRight" | "movementStopped", cb)`
(polled every 50 ms; returns an unsubscribe). Reach/squat/jump are state queries for now, not events.

## Mock body
`window.__kalqyMockBody` (dev, `?demo=1`): `moveLeft()`, `center()`, `moveRight()`, `moveTo(x)`, `setVisible(bool)`.

## Not built yet
Web Worker inference, gesture recognition, reach/squat/jump *events*, adaptive inference rate.
