import type { Point2D } from "../hand/HandState";

/**
 * The single place that knows the camera feed needs mirroring. MediaPipe
 * reports landmarks normalized (0..1) against the raw, un-mirrored camera
 * frame; flipping x here makes "move your hand right" move things right on
 * screen, without any game ever writing `x = 1 - x` itself (PROMPT section 19).
 */
export function mirrorPoint(point: Point2D): Point2D {
  return { x: 1 - point.x, y: point.y };
}
