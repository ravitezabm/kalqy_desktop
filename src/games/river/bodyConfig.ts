import type { BodyMotionConfig } from "../../engine/motion/body/BodyAnalyzer";

/** River's body-tracking tunables — the engine reads these; gameplay code never hardcodes them. */
export const RIVER_BODY_CONFIG: Partial<BodyMotionConfig> & { deadZone: { left: number; right: number } } = {
  deadZone: { left: 0.4, right: 0.6 },
  leanHysteresis: 0.02,
  moveSpeedThreshold: 0.35,
  minMovementMs: 120,
};
