import { OneEuroFilter2D } from "../smoothing/OneEuroFilter";
import type { Point2D } from "../hand/HandState";
import { BODY_LANDMARK_INDEX, type BodyJointName } from "./BodyLandmarks";
import { NO_BODY, type BodyState, type MovementDirection } from "./BodyState";

export interface BodyMotionConfig {
  /** Torso-center x below `left` is LEFT, above `right` is RIGHT (mirrored, 0..1). */
  deadZone: { left: number; right: number };
  /** Extra margin a lean must retreat by before it releases — stops flicker at the edge. */
  leanHysteresis: number;
  /** Body-widths per second the torso must travel to count as moving. */
  moveSpeedThreshold: number;
  /** The movement must hold this long before a direction is reported. */
  minMovementMs: number;
  /** Wrist above shoulder by this many body-widths counts as reaching. */
  reachThreshold: number;
  /** Hip-to-knee gap (in body-widths) below this counts as squatting. */
  squatThreshold: number;
  /** Upward speed (body-widths/s) that counts as a jump. */
  jumpSpeedThreshold: number;
  /** Joints below this MediaPipe visibility are ignored. */
  minJointVisibility: number;
}

export const DEFAULT_BODY_CONFIG: BodyMotionConfig = {
  deadZone: { left: 0.4, right: 0.6 },
  leanHysteresis: 0.02,
  moveSpeedThreshold: 0.35,
  minMovementMs: 120,
  reachThreshold: 0.5,
  squatThreshold: 0.85,
  jumpSpeedThreshold: 2.2,
  minJointVisibility: 0.4,
};

/** A landmark as MediaPipe reports it, already mirrored to screen space. */
export interface RawJoint extends Point2D {
  visibility: number;
}

const TORSO: BodyJointName[] = ["leftShoulder", "rightShoulder", "leftHip", "rightHip"];

/**
 * Turns raw pose landmarks into the BodyState games read. Pure and
 * frame-driven (no MediaPipe, no DOM), so the mock provider and the real
 * one produce identical semantics and it is unit-testable.
 *
 * Direction uses velocity + dead zone + hysteresis + a minimum duration so
 * a single noisy frame never flips it; positions go through a One Euro
 * filter. See PROMPT sections 9-13.
 */
export class BodyAnalyzer {
  private readonly filter = new OneEuroFilter2D({ minCutoff: 1.4, beta: 0.05 });
  private readonly config: BodyMotionConfig;

  private center: Point2D = { x: 0.5, y: 0.5 };
  private velocity: Point2D = { x: 0, y: 0 };
  private scale = 0;
  private hasCenter = false;
  private joints: RawJoint[] = [];
  private confidence = 0;
  private visible = false;

  private direction: MovementDirection = "none";
  private candidate: MovementDirection = "none";
  private candidateMs = 0;
  private lean: "left" | "right" | null = null;
  private standingY = 0.5;
  private previousScale = 0;
  private airborne = false;

  constructor(config: Partial<BodyMotionConfig> = {}) {
    this.config = { ...DEFAULT_BODY_CONFIG, ...config, deadZone: { ...DEFAULT_BODY_CONFIG.deadZone, ...config.deadZone } };
  }

  /** Call once per tracking frame. Pass null when no body is in view. */
  update(landmarks: RawJoint[] | null, dtSeconds: number): void {
    const dt = Math.max(dtSeconds, 1 / 240);
    if (!landmarks) {
      this.visible = false;
      this.velocity = { x: 0, y: 0 };
      this.direction = "none";
      this.candidate = "none";
      this.candidateMs = 0;
      return;
    }

    this.joints = landmarks;
    const torso = TORSO.map((name) => landmarks[BODY_LANDMARK_INDEX[name]]).filter(
      (joint) => joint && joint.visibility >= this.config.minJointVisibility
    );
    const shoulders = [landmarks[BODY_LANDMARK_INDEX.leftShoulder], landmarks[BODY_LANDMARK_INDEX.rightShoulder]];
    const hips = [landmarks[BODY_LANDMARK_INDEX.leftHip], landmarks[BODY_LANDMARK_INDEX.rightHip]];

    if (torso.length < 2) {
      this.visible = false;
      this.direction = "none";
      return;
    }

    const wasVisible = this.visible;
    this.visible = true;
    this.confidence = torso.reduce((sum, joint) => sum + joint.visibility, 0) / torso.length;

    const raw = {
      x: torso.reduce((sum, joint) => sum + joint.x, 0) / torso.length,
      y: torso.reduce((sum, joint) => sum + joint.y, 0) / torso.length,
    };

    const width = (pair: RawJoint[]) => (pair[0] && pair[1] ? Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) : 0);
    this.scale = Math.max(width(shoulders), width(hips) * 0.9, 0.05);

    // Coming back into view: restart the filter instead of gliding across the screen.
    if (!this.hasCenter || !wasVisible) {
      this.filter.reset();
      this.center = this.filter.filter(raw.x, raw.y, dt);
      this.standingY = this.center.y;
      this.previousScale = this.scale;
      this.hasCenter = true;
      return;
    }

    const smoothed = this.filter.filter(raw.x, raw.y, dt);
    this.velocity = {
      x: (smoothed.x - this.center.x) / dt / this.scale,
      y: (smoothed.y - this.center.y) / dt / this.scale,
    };
    this.center = smoothed;

    this.updateDirection(dt);
    this.updateLean();
    this.updateJump(dt);
    this.previousScale = this.scale;
  }

  state(): BodyState {
    if (!this.visible) return NO_BODY;
    const cfg = this.config;
    const at = (name: BodyJointName): Point2D => {
      const joint = this.joints[BODY_LANDMARK_INDEX[name]];
      return joint ? { x: joint.x, y: joint.y } : { x: 0.5, y: 0.5 };
    };
    const seen = (name: BodyJointName) => (this.joints[BODY_LANDMARK_INDEX[name]]?.visibility ?? 0) >= cfg.minJointVisibility;

    return {
      visible: true,
      confidence: this.confidence,
      joint: at,
      center: () => this.center,
      centerVelocity: () => this.velocity,
      scale: () => this.scale,
      angle: (a, b, c) => {
        const pa = at(a);
        const pb = at(b);
        const pc = at(c);
        const ab = Math.atan2(pa.y - pb.y, pa.x - pb.x);
        const cb = Math.atan2(pc.y - pb.y, pc.x - pb.x);
        let degrees = Math.abs(((ab - cb) * 180) / Math.PI);
        if (degrees > 180) degrees = 360 - degrees;
        return degrees;
      },
      isMoving: () => Math.hypot(this.velocity.x, this.velocity.y) > cfg.moveSpeedThreshold,
      movementDirection: () => this.direction,
      isLeaningLeft: () => this.lean === "left",
      isLeaningRight: () => this.lean === "right",
      isReaching: () =>
        (["left", "right"] as const).some((side) => {
          const wrist = `${side}Wrist` as BodyJointName;
          const shoulder = `${side}Shoulder` as BodyJointName;
          return seen(wrist) && seen(shoulder) && at(shoulder).y - at(wrist).y > cfg.reachThreshold * this.scale;
        }),
      isSquatting: () => {
        const gaps = (["left", "right"] as const)
          .filter((side) => seen(`${side}Hip` as BodyJointName) && seen(`${side}Knee` as BodyJointName))
          .map((side) => (at(`${side}Knee` as BodyJointName).y - at(`${side}Hip` as BodyJointName).y) / this.scale);
        return gaps.length > 0 && Math.min(...gaps) < cfg.squatThreshold;
      },
      isJumping: () => this.airborne,
    };
  }

  private updateDirection(dt: number): void {
    const { x, y } = this.velocity;
    const scaleRate = this.previousScale > 0 ? (this.scale - this.previousScale) / dt / this.scale : 0;
    const threshold = this.direction === "none" ? this.config.moveSpeedThreshold : this.config.moveSpeedThreshold * 0.5;

    let next: MovementDirection = "none";
    if (Math.abs(x) >= threshold && Math.abs(x) >= Math.abs(y)) next = x < 0 ? "left" : "right";
    else if (Math.abs(scaleRate) >= threshold * 2) next = scaleRate > 0 ? "forward" : "backward";

    if (next === this.direction) {
      this.candidate = next;
      this.candidateMs = 0;
      return;
    }
    if (next !== this.candidate) {
      this.candidate = next;
      this.candidateMs = 0;
    }
    this.candidateMs += dt * 1000;
    // Stopping releases at once; starting has to be sustained.
    if (next === "none" || this.candidateMs >= this.config.minMovementMs) this.direction = next;
  }

  private updateLean(): void {
    const { left, right } = this.config.deadZone;
    const h = this.config.leanHysteresis;
    const x = this.center.x;
    if (this.lean === "left") {
      if (x > left + h) this.lean = null;
    } else if (this.lean === "right") {
      if (x < right - h) this.lean = null;
    }
    if (this.lean === null) {
      if (x < left) this.lean = "left";
      else if (x > right) this.lean = "right";
    }
  }

  private updateJump(dt: number): void {
    // Standing height follows slowly, so a jump reads as a fast rise above it.
    this.standingY += (this.center.y - this.standingY) * Math.min(1, dt * 0.8);
    const rise = (this.standingY - this.center.y) / this.scale;
    if (this.velocity.y < -this.config.jumpSpeedThreshold || rise > 0.5) this.airborne = true;
    else if (rise < 0.2 && this.velocity.y > -this.config.jumpSpeedThreshold * 0.3) this.airborne = false;
  }
}

