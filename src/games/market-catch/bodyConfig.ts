import type { BodyMotionConfig } from "../../engine/motion/body/BodyAnalyzer";

/** Market Catch's body-tracking tunables — the engine reads these; gameplay code never hardcodes them. */
export const MARKET_BODY_CONFIG: Partial<BodyMotionConfig> & { deadZone: { left: number; right: number } } = {
  deadZone: { left: 0.42, right: 0.58 },
  leanHysteresis: 0.02,
  moveSpeedThreshold: 0.35,
  minMovementMs: 120,
};
