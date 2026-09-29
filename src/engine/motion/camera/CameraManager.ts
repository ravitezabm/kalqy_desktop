/**
 * The only place in the app that calls getUserMedia (PROMPT section 14).
 * Owns a single hidden <video> element that MediaPipe reads frames from.
 * Camera stays un-mirrored here — CoordinateMapper.mirrorPoint handles the
 * "feels like a mirror" flip on the landmark coordinates instead, so the
 * raw frame MediaPipe sees always matches what it was trained on.
 */
export class CameraManager {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;

  async start(): Promise<HTMLVideoElement> {
    if (this.videoEl && this.stream) return this.videoEl;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (error) {
      throw new CameraError(
        error instanceof DOMException && error.name === "NotAllowedError" ? "permission-denied" : "unavailable"
      );
    }

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();

    this.stream = stream;
    this.videoEl = video;
    return video;
  }

  get video(): HTMLVideoElement | null {
    return this.videoEl;
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
  }
}

export type CameraErrorReason = "permission-denied" | "unavailable";

export class CameraError extends Error {
  constructor(public readonly reason: CameraErrorReason) {
    super(`Camera ${reason}`);
  }
}
