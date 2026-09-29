import { FilesetResolver, HandLandmarker, type HandLandmarkerResult, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { MotionProvider } from "../MotionProvider";
import type { MotionConfig } from "../MotionConfig";
import type { TrackingSnapshot } from "../state/TrackingSnapshot";
import type { TrackingState } from "../state/TrackingState";
import type { HandState, Handedness, Point2D } from "../hand/HandState";
import { NO_HAND } from "../hand/HandState";
import { HAND_LANDMARK_INDEX, type HandLandmarkName } from "../hand/HandLandmarks";
import { OneEuroFilter2D } from "../smoothing/OneEuroFilter";
import { mirrorPoint } from "../normalization/CoordinateMapper";
import { CameraManager, CameraError } from "../camera/CameraManager";

const LOST_AFTER_MS = 500;

interface TrackedHand {
  filter: OneEuroFilter2D;
  confidence: number;
  position: Point2D;
  velocity: Point2D;
  rawLandmarks: NormalizedLandmark[];
  lastSeenAt: number;
  lastTimestamp: number;
}

/**
 * The only file in the engine that imports MediaPipe. Runs HandLandmarker
 * in VIDEO mode on the main thread's rAF loop (see PROMPT section 16 — a
 * dedicated worker is the documented next step; the MotionProvider
 * boundary means moving this off-thread later won't touch a single game).
 */
export class MediaPipeMotionProvider implements MotionProvider {
  private landmarker: HandLandmarker | null = null;
  private camera = new CameraManager();
  private rafId: number | null = null;
  private state: TrackingState = "initializing";

  private fps = 0;
  private lastFrameAt = 0;
  private latencyMs = 0;

  private hands = new Map<Handedness, TrackedHand>();
  private primaryHandedness: Handedness | null = null;

  async initialize(config: MotionConfig): Promise<void> {
    this.state = "initializing";
    const fileset = await FilesetResolver.forVisionTasks(config.assets.wasmBasePath);
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: config.assets.handLandmarkerModelPath,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: config.profile.hands,
    });
    this.state = "ready";
  }

  async start(): Promise<void> {
    if (!this.landmarker) throw new Error("MediaPipeMotionProvider.start() called before initialize()");

    try {
      await this.camera.start();
    } catch (error) {
      this.state = "error";
      throw error;
    }

    this.state = "tracking";
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
    this.camera.stop();
    this.hands.clear();
    this.primaryHandedness = null;
    this.state = "stopped";
  }

  destroy(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
  }

  getSnapshot(): TrackingSnapshot {
    const left = this.buildHandState("left");
    const right = this.buildHandState("right");
    const primary = this.primaryHandedness ? this.buildHandState(this.primaryHandedness) : NO_HAND;

    return {
      state: this.state,
      quality: {
        overall: primary.confidence,
        hand: primary.confidence,
        fps: this.fps,
        latencyMs: this.latencyMs,
      },
      primaryHand: primary,
      leftHand: left,
      rightHand: right,
    };
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const video = this.camera.video;
    if (!video || !this.landmarker || video.readyState < 2) return;

    const captureStart = performance.now();
    const result = this.landmarker.detectForVideo(video, captureStart);
    this.latencyMs = performance.now() - captureStart;

    if (this.lastFrameAt > 0) {
      const dt = captureStart - this.lastFrameAt;
      if (dt > 0) this.fps = this.fps === 0 ? 1000 / dt : this.fps * 0.9 + (1000 / dt) * 0.1;
    }
    this.lastFrameAt = captureStart;

    this.applyResult(result, captureStart);
  };

  private applyResult(result: HandLandmarkerResult, now: number): void {
    const seenThisFrame = new Set<Handedness>();

    result.landmarks.forEach((landmarks, index) => {
      const categoryName = result.handednesses[index]?.[0]?.categoryName?.toLowerCase();
      const handedness: Handedness = categoryName === "left" ? "left" : "right";
      const confidence = result.handednesses[index]?.[0]?.score ?? 0;
      seenThisFrame.add(handedness);

      let tracked = this.hands.get(handedness);
      if (!tracked) {
        tracked = {
          filter: new OneEuroFilter2D(),
          confidence: 0,
          position: { x: 0.5, y: 0.5 },
          velocity: { x: 0, y: 0 },
          rawLandmarks: landmarks,
          lastSeenAt: now,
          lastTimestamp: now,
        };
        this.hands.set(handedness, tracked);
      }

      const dt = Math.max((now - tracked.lastTimestamp) / 1000, 1 / 240);
      const wristRaw = mirrorPoint({ x: landmarks[0].x, y: landmarks[0].y });
      const smoothed = tracked.filter.filter(wristRaw.x, wristRaw.y, dt);

      tracked.velocity = {
        x: (smoothed.x - tracked.position.x) / dt,
        y: (smoothed.y - tracked.position.y) / dt,
      };
      tracked.position = smoothed;
      tracked.rawLandmarks = landmarks;
      tracked.confidence = confidence;
      tracked.lastTimestamp = now;
      tracked.lastSeenAt = now;
    });

    if (!this.primaryHandedness || !seenThisFrame.has(this.primaryHandedness)) {
      this.primaryHandedness = seenThisFrame.values().next().value ?? this.primaryHandedness;
    }
  }

  private buildHandState(handedness: Handedness): HandState {
    const tracked = this.hands.get(handedness);
    if (!tracked || performance.now() - tracked.lastSeenAt > LOST_AFTER_MS) {
      return NO_HAND;
    }

    const landmark = (name: HandLandmarkName): Point2D => {
      const raw = tracked.rawLandmarks[HAND_LANDMARK_INDEX[name]];
      return mirrorPoint({ x: raw.x, y: raw.y });
    };

    return {
      visible: true,
      handedness,
      confidence: tracked.confidence,
      position: tracked.position,
      velocity: tracked.velocity,
      speed: Math.hypot(tracked.velocity.x, tracked.velocity.y),
      direction: Math.atan2(tracked.velocity.y, tracked.velocity.x),
      landmark,
    };
  }
}

export { CameraError };
