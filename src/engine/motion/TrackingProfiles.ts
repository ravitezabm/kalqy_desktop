export interface TrackingProfile {
  id: string;
  hands: number;
  body: boolean;
  gestures: boolean;
}

/**
 * Each profile turns on only the trackers a game needs — River never
 * spins up the hand model, Butterfly never spins up the pose model.
 */
export const TRACKING_PROFILES = {
  HAND_BASIC: { id: "HAND_BASIC", hands: 1, body: false, gestures: false },
  HAND_PRECISE: { id: "HAND_PRECISE", hands: 2, body: false, gestures: false },
  BODY_MOTION: { id: "BODY_MOTION", hands: 0, body: true, gestures: false },
  HAND_BODY: { id: "HAND_BODY", hands: 2, body: true, gestures: false },
} satisfies Record<string, TrackingProfile>;

export type TrackingProfileId = keyof typeof TRACKING_PROFILES;
