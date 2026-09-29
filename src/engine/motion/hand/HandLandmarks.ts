/**
 * Semantic hand landmark names, mapped onto MediaPipe HandLandmarker's 21
 * raw indices. Games (and the rest of the engine) only ever use these
 * names — nobody outside this file knows the numeric index scheme, so a
 * future tracker swap only has to update this map.
 */
export type HandLandmarkName =
  | "wrist"
  | "thumbCMC"
  | "thumbMCP"
  | "thumbIP"
  | "thumbTip"
  | "indexMCP"
  | "indexPIP"
  | "indexDIP"
  | "indexTip"
  | "middleMCP"
  | "middlePIP"
  | "middleDIP"
  | "middleTip"
  | "ringMCP"
  | "ringPIP"
  | "ringDIP"
  | "ringTip"
  | "pinkyMCP"
  | "pinkyPIP"
  | "pinkyDIP"
  | "pinkyTip";

export const HAND_LANDMARK_INDEX: Record<HandLandmarkName, number> = {
  wrist: 0,
  thumbCMC: 1,
  thumbMCP: 2,
  thumbIP: 3,
  thumbTip: 4,
  indexMCP: 5,
  indexPIP: 6,
  indexDIP: 7,
  indexTip: 8,
  middleMCP: 9,
  middlePIP: 10,
  middleDIP: 11,
  middleTip: 12,
  ringMCP: 13,
  ringPIP: 14,
  ringDIP: 15,
  ringTip: 16,
  pinkyMCP: 17,
  pinkyPIP: 18,
  pinkyDIP: 19,
  pinkyTip: 20,
};

export const HAND_LANDMARK_NAMES = Object.keys(HAND_LANDMARK_INDEX) as HandLandmarkName[];
