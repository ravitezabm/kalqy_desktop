import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { MotionProvider } from "../MotionProvider";
import type { MotionConfig } from "../MotionConfig";
import type { TrackingSnapshot } from "../state/TrackingSnapshot";
import type { TrackingState } from "../state/TrackingState";
import type { HandState, Handedness, Point2D } from "../hand/HandState";
import { NO_HAND } from "../hand/HandState";
import { HAND_LANDMARK_INDEX, type HandLandmarkName } from "../hand/HandLandmarks";
import { GestureTracker, readGesture } from "../hand/HandGesture";
import { OneEuroFilter2D } from "../smoothing/OneEuroFilter";
import { mirrorPoint } from "../normalization/CoordinateMapper";
import { BodyAnalyzer } from "../body/BodyAnalyzer";
import { CameraManager, CameraError } from "../camera/CameraManager";

const LOST_AFTER_MS = 500;

interface TrackedHand {
  filter: OneEuroFilter2D;
  confidence: number;
  position: Point2D;
  velocity: Point2D;
  rawLandmarks: NormalizedLandmark[];
  gestures: GestureTracker;
  closure: number;
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
  private poseLandmarker: PoseLandmarker | null = null;
  private body = new BodyAnalyzer();
  private lastBodyAt = 0;
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
    this.body = new BodyAnalyzer(config.body);
    const fileset = await FilesetResolver.forVisionTasks(config.assets.wasmBasePath);

    // Only the trackers the profile asks for are created — a body-only game
    // never pays for the hand model, and vice versa.
    if (config.profile.hands > 0) {
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: config.assets.handLandmarkerModelPath, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: config.profile.hands,
      });
    }
    if (config.profile.body) {
      const modelPath = config.assets.poseLandmarkerModelPath;
      if (!modelPath) throw new Error("BODY tracking needs assets.poseLandmarkerModelPath");
      const options = { runningMode: "VIDEO" as const, numPoses: 1 };
      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: modelPath, delegate: "GPU" },
        });
      } catch {
        // No usable GPU delegate (some Windows drivers): the CPU path still works.
        this.poseLandmarker = await PoseLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: modelPath, delegate: "CPU" },
        });
      }
    }
    this.state = "ready";
  }

  async start(): Promise<void> {
    if (!this.landmarker && !this.poseLandmarker) throw new Error("MediaPipeMotionProvider.start() called before initialize()");

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
    this.poseLandmarker?.close();
    this.poseLandmarker = null;
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
        body: this.body.state().confidence,
        fps: this.fps,
        latencyMs: this.latencyMs,
      },
      primaryHand: primary,
      leftHand: left,
      rightHand: right,
      body: this.body.state(),
    };
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const video = this.camera.video;
    if (!video || video.readyState < 2) return;

    const captureStart = performance.now();
    if (this.landmarker) this.applyResult(this.landmarker.detectForVideo(video, captureStart), captureStart);
    if (this.poseLandmarker) this.applyPose(this.poseLandmarker.detectForVideo(video, captureStart), captureStart);
    this.latencyMs = performance.now() - captureStart;

    if (this.lastFrameAt > 0) {
      const dt = captureStart - this.lastFrameAt;
      if (dt > 0) this.fps = this.fps === 0 ? 1000 / dt : this.fps * 0.9 + (1000 / dt) * 0.1;
    }
    this.lastFrameAt = captureStart;
  };

  private applyPose(result: PoseLandmarkerResult, now: number): void {
    const landmarks = result.landmarks[0];
    const dt = this.lastBodyAt > 0 ? (now - this.lastBodyAt) / 1000 : 1 / 30;
    this.lastBodyAt = now;
    this.body.update(
      landmarks ? landmarks.map((l) => ({ ...mirrorPoint({ x: l.x, y: l.y }), visibility: l.visibility ?? 0 })) : null,
      dt
    );
  }

  private applyResult(result: HandLandmarkerResult, now: number): void {
    const seenThisFrame = new Set<Handedness>();

    result.landmarks.forEach((landmarks, index) => {
      const categoryName = result.handednesses[index]?.[0]?.categoryName?.toLowerCase();
      // MediaPipe labels hands as if the image were already mirrored (a selfie view). Our camera frames are
      // raw, so its "Left" is the child's RIGHT hand — swap so "left" always means the child's left hand.
      const handedness: Handedness = categoryName === "left" ? "right" : "left";
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
          gestures: new GestureTracker(),
          closure: 0,
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
      const reading = readGesture((name) => {
        const raw = landmarks[HAND_LANDMARK_INDEX[name]];
        return { x: raw.x, y: raw.y };
      });
      tracked.closure = reading.closure;
      tracked.gestures.update(reading);
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
      gesture: tracked.gestures.gesture,
      closure: tracked.closure,
      landmark,
    };
  }
}

export { CameraError };
