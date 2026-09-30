import type { HandState } from "../hand/HandState";
import type { BodyState } from "../body/BodyState";
import type { TrackingQuality, TrackingState } from "./TrackingState";

export interface TrackingSnapshot {
  state: TrackingState;
  quality: TrackingQuality;
  primaryHand: HandState;
  leftHand: HandState;
  rightHand: HandState;
  body: BodyState;
}
