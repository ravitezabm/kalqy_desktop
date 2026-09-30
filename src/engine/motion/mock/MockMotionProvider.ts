import type { MotionProvider } from "../MotionProvider";
import type { MotionConfig } from "../MotionConfig";
import type { TrackingSnapshot } from "../state/TrackingSnapshot";
import type { TrackingState } from "../state/TrackingState";
import type { HandState, Point2D } from "../hand/HandState";
import { NO_HAND } from "../hand/HandState";
import { BodyAnalyzer, type RawJoint } from "../body/BodyAnalyzer";
import { BODY_LANDMARK_COUNT, BODY_LANDMARK_INDEX } from "../body/BodyLandmarks";
import { NO_BODY } from "../body/BodyState";
import type { HandGesture } from "../hand/HandGesture";

/**
 * Simulates a hand drifting in a smooth path — lets a game (or an
 * automated test) run with no webcam at all. Also exposes moveTo() so
 * tests can drive the "hand" to a specific target deliberately
 * (PROMPT sections 25/26/94: "move hand to target, hold 3 seconds, success").
 */
/** A standing child, `x` = torso center (0..1, already mirrored), as MediaPipe-shaped landmarks. */
export function syntheticPose(x: number, y = 0.5, scale = 0.2): RawJoint[] {
  const joints: RawJoint[] = Array.from({ length: BODY_LANDMARK_COUNT }, () => ({ x, y, visibility: 1 }));
  const set = (name: keyof typeof BODY_LANDMARK_INDEX, dx: number, dy: number) => {
    joints[BODY_LANDMARK_INDEX[name]] = { x: x + dx * scale, y: y + dy * scale, visibility: 1 };
  };
  set("nose", 0, -1.6);
  set("leftShoulder", -0.5, -0.7);
  set("rightShoulder", 0.5, -0.7);
  set("leftElbow", -0.7, -0.1);
  set("rightElbow", 0.7, -0.1);
  set("leftWrist", -0.8, 0.5);
  set("rightWrist", 0.8, 0.5);
  set("leftHip", -0.35, 0.7);
  set("rightHip", 0.35, 0.7);
  set("leftKnee", -0.35, 2.2);
  set("rightKnee", 0.35, 2.2);
  set("leftAnkle", -0.35, 3.6);
  set("rightAnkle", 0.35, 3.6);
  return joints;
}

/** Scripted body for tests: mockBody.moveLeft() / center() / moveRight() drive real game logic. */
export interface MockBody {
  moveLeft(): void;
  center(): void;
  moveRight(): void;
  moveTo(x: number): void;
  /** Simulates the child leaving / re-entering the camera view. */
  setVisible(visible: boolean): void;
}

/** One scripted hand for two-hand tests. Positions are normalized (0..1) like real tracking. */
export interface MockHandControl {
  moveTo(target: Point2D): void;
  setVisible(visible: boolean): void;
  /** A quick up-down tap: reports a burst of speed for a moment without changing position much. */
  tap(): void;
}

interface SimHand {
  position: Point2D;
  target: Point2D | null;
  visible: boolean;
  velocity: Point2D;
  tapUntil: number;
  /** When set (tests), this hand exists on its own instead of following the single-hand simulation. */
  independent: boolean;
}

export class MockMotionProvider implements MotionProvider {
  private bodyAnalyzer = new BodyAnalyzer();
  private bodyTargetX = 0.5;
  private bodyX = 0.5;
  private bodyVisible = true;
  private bodyEnabled = false;
  private lastFrameAt = 0;

  readonly mockBody: MockBody = {
    moveLeft: () => (this.bodyTargetX = 0.15),
    center: () => (this.bodyTargetX = 0.5),
    moveRight: () => (this.bodyTargetX = 0.85),
    moveTo: (x) => (this.bodyTargetX = x),
    setVisible: (visible) => (this.bodyVisible = visible),
  };

  private sim: Record<"left" | "right", SimHand> = {
    left: { position: { x: 0.35, y: 0.6 }, target: null, visible: false, velocity: { x: 0, y: 0 }, tapUntil: 0, independent: false },
    right: { position: { x: 0.65, y: 0.6 }, target: null, visible: false, velocity: { x: 0, y: 0 }, tapUntil: 0, independent: false },
  };

  /** Independent left/right hands — what a two-hand game sees. Using one switches the mock to two-hand mode. */
  readonly mockHands: Record<"left" | "right", MockHandControl> = {
    left: this.handControl("left"),
    right: this.handControl("right"),
  };

  private handControl(side: "left" | "right"): MockHandControl {
    return {
      moveTo: (target) => {
        const hand = this.sim[side];
        hand.independent = true;
        hand.visible = true;
        hand.target = target;
      },
      setVisible: (visible) => {
        const hand = this.sim[side];
        hand.independent = true;
        hand.visible = visible;
      },
      tap: () => {
        this.sim[side].tapUntil = performance.now() + 140;
      },
    };
  }

  private twoHandMode(): boolean {
    return this.sim.left.independent || this.sim.right.independent;
  }

  private simHandState(side: "left" | "right"): HandState {
    const hand = this.sim[side];
    const tapping = performance.now() < hand.tapUntil;
    const speed = tapping ? 1.4 : Math.hypot(hand.velocity.x, hand.velocity.y);
    return {
      visible: this.state === "tracking" && hand.visible,
      handedness: side,
      confidence: 1,
      position: hand.position,
      velocity: tapping ? { x: 0, y: 1.4 } : hand.velocity,
      speed,
      direction: Math.atan2(hand.velocity.y, hand.velocity.x),
      gesture: "open",
      closure: 0,
      landmark: () => hand.position,
    };
  }

  private state: TrackingState = "initializing";
  private rafId: number | null = null;
  private startedAt = 0;
  private target: Point2D | null = null;
  private position: Point2D = { x: 0.5, y: 0.5 };
  private gesture: HandGesture = "open";
  private handVisible = true;
  private velocity: Point2D = { x: 0, y: 0 };

  async initialize(config: MotionConfig): Promise<void> {
    this.bodyEnabled = config.profile.body;
    this.bodyAnalyzer = new BodyAnalyzer(config.body);
    this.state = "ready";
  }

  async start(): Promise<void> {
    this.state = "tracking";
    this.startedAt = performance.now();
    this.lastFrameAt = this.startedAt;
    this.loop();
  }

  pause(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.state = "paused";
  }

  resume(): void {
    if (this.state === "paused") {
      this.state = "tracking";
      this.loop();
    }
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.state = "stopped";
  }

  destroy(): void {
    this.stop();
  }

  /** Simulates the hand opening / pinching / making a fist. */
  setGesture(gesture: HandGesture): void {
    this.gesture = gesture;
  }

  /** Simulates the hand leaving / re-entering the camera view. */
  setHandVisible(visible: boolean): void {
    this.handVisible = visible;
  }

  /** Drives the simulated hand toward a normalized (0..1) target — for tests. */
  moveTo(target: Point2D): void {
    this.target = target;
  }

  getSnapshot(): TrackingSnapshot {
    const hand: HandState = {
      visible: this.state === "tracking" && this.handVisible,
      handedness: "right",
      confidence: 1,
      position: this.position,
      velocity: this.velocity,
      speed: Math.hypot(this.velocity.x, this.velocity.y),
      direction: Math.atan2(this.velocity.y, this.velocity.x),
      gesture: this.gesture,
      closure: this.gesture === "fist" ? 1 : 0,
      landmark: () => this.position,
    };

    if (this.twoHandMode()) {
      const left = this.simHandState("left");
      const right = this.simHandState("right");
      return {
        state: this.state,
        quality: { overall: 1, hand: 1, body: 1, fps: 60, latencyMs: 0 },
        primaryHand: right.visible ? right : left.visible ? left : NO_HAND,
        leftHand: left.visible ? left : NO_HAND,
        rightHand: right.visible ? right : NO_HAND,
        body: NO_BODY,
      };
    }

    return {
      state: this.state,
      quality: { overall: 1, hand: 1, body: 1, fps: 60, latencyMs: 0 },
      primaryHand: this.state === "tracking" && !this.bodyEnabled && this.handVisible ? hand : NO_HAND,
      leftHand: NO_HAND,
      rightHand: this.state === "tracking" && !this.bodyEnabled ? hand : NO_HAND,
      body: this.bodyEnabled && this.state === "tracking" ? this.bodyAnalyzer.state() : NO_BODY,
    };
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const elapsed = (now - this.startedAt) / 1000;
    const dt = (now - this.lastFrameAt) / 1000;
    this.lastFrameAt = now;

    if (this.bodyEnabled) {
      this.bodyX += (this.bodyTargetX - this.bodyX) * 0.08;
      this.bodyAnalyzer.update(this.bodyVisible ? syntheticPose(this.bodyX) : null, dt);
    }

    if (this.twoHandMode()) {
      for (const hand of [this.sim.left, this.sim.right]) {
        if (!hand.target) continue;
        const next = { x: hand.position.x + (hand.target.x - hand.position.x) * 0.22, y: hand.position.y + (hand.target.y - hand.position.y) * 0.22 };
        hand.velocity = dt > 0 ? { x: (next.x - hand.position.x) / dt, y: (next.y - hand.position.y) / dt } : hand.velocity;
        hand.position = next;
      }
    }

    if (this.target) {
      const next = {
        x: this.position.x + (this.target.x - this.position.x) * 0.12,
        y: this.position.y + (this.target.y - this.position.y) * 0.12,
      };
      this.velocity = dt > 0 ? { x: (next.x - this.position.x) / dt, y: (next.y - this.position.y) / dt } : this.velocity;
      this.position = next;
    } else {
      // Gentle idle drift so a mock-driven scene still feels alive.
      this.position = {
        x: 0.5 + Math.sin(elapsed * 0.6) * 0.18,
        y: 0.5 + Math.sin(elapsed * 0.9) * 0.12,
      };
    }
  };
}
