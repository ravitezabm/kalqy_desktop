import type { TrackingProfile } from "./TrackingProfiles";
import type { BodyMotionConfig } from "./body/BodyAnalyzer";
import type { OneEuroFilterOptions } from "./smoothing/OneEuroFilter";

export interface MotionConfig {
  profile: TrackingProfile;
  smoothing?: OneEuroFilterOptions;
  /** Tunables for body tracking (dead zone, thresholds) — games configure, never hardcode. */
  body?: Partial<BodyMotionConfig>;
  /** Paths to the vendored, offline MediaPipe assets — see public/vendor/mediapipe. */
  assets: {
    wasmBasePath: string;
    handLandmarkerModelPath: string;
    poseLandmarkerModelPath?: string;
  };
}
