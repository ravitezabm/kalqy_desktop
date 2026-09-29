import type { TrackingProfile } from "./TrackingProfiles";
import type { OneEuroFilterOptions } from "./smoothing/OneEuroFilter";

export interface MotionConfig {
  profile: TrackingProfile;
  smoothing?: OneEuroFilterOptions;
  /** Paths to the vendored, offline MediaPipe assets — see public/vendor/mediapipe. */
  assets: {
    wasmBasePath: string;
    handLandmarkerModelPath: string;
  };
}
