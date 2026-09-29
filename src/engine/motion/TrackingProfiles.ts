export interface TrackingProfile {
  id: string;
  hands: number;
  body: boolean;
  gestures: boolean;
}

/**
 * Phase 1 only implements hand tracking, so only HAND_BASIC actually does
 * anything yet — BODY_MOTION/HAND_BODY etc. are deliberately not defined
 * here until the pose side of the engine exists (see PROMPT section 12;
 * we're not pretending to support profiles we can't back with real tracking).
 */
export const TRACKING_PROFILES = {
  HAND_BASIC: { id: "HAND_BASIC", hands: 1, body: false, gestures: false },
  HAND_PRECISE: { id: "HAND_PRECISE", hands: 2, body: false, gestures: false },
} satisfies Record<string, TrackingProfile>;

export type TrackingProfileId = keyof typeof TRACKING_PROFILES;
