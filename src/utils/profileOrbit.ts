export interface SlotGeometry {
  leftPercent: number;
  topPercent: number;
  /** Avatar diameter as a % of the (square) orbit field, so it scales with the window. */
  sizePercent: number;
  zIndex: number;
}

/**
 * All values are percentages of the *orbit field* — a square element in the
 * stage (see ProfileSelectionPage). A square field is what keeps the orbit a
 * true circle: percentage widths and heights resolve against the same edge
 * length, so `cos/sin * radius` lands on a circle rather than an ellipse
 * stretched by the window's aspect ratio.
 *
 * Outer profiles are spread across an arc over the *top* of the circle
 * rather than the full 360°, leaving the bottom of the ring empty so it can
 * run off the bottom of the window without hiding anyone — which is how the
 * reference composition reads.
 */
const ORBIT = {
  centerLeft: 50,
  centerTop: 50,
  centerSizePercent: 25,
  ringRadiusPercent: 34,
  ringSizePercent: 12.5,
  // Screen angles (0° = right, 90° = down). Sweeps from lower-left, up over
  // the top, round to lower-right.
  arcStartAngleDeg: 174,
  arcSweepDeg: 204,
};

export function getCenterSlot(): SlotGeometry {
  return {
    leftPercent: ORBIT.centerLeft,
    topPercent: ORBIT.centerTop,
    sizePercent: ORBIT.centerSizePercent,
    zIndex: 10,
  };
}

/**
 * `offset` is a profile's position around the ring relative to whichever
 * profile currently occupies the center (1..totalOuter, in fixed cyclic
 * order — see PROFILES in types/profile.ts). Re-centering a different
 * profile shifts every other profile's offset by the same constant amount,
 * which is what makes the whole arrangement read as "the ring rotated"
 * rather than each tile moving independently.
 */
export function getOuterSlot(offset: number, totalOuter: number): SlotGeometry {
  const step = totalOuter > 1 ? ORBIT.arcSweepDeg / (totalOuter - 1) : 0;
  const angleDeg = ORBIT.arcStartAngleDeg + step * (offset - 1);
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    leftPercent: ORBIT.centerLeft + Math.cos(angleRad) * ORBIT.ringRadiusPercent,
    topPercent: ORBIT.centerTop + Math.sin(angleRad) * ORBIT.ringRadiusPercent,
    sizePercent: ORBIT.ringSizePercent,
    zIndex: 5,
  };
}

/** Diameters (as % of the orbit field) for the decorative orbit path rings. */
export function getOrbitRingGeometry() {
  return {
    centerLeft: ORBIT.centerLeft,
    centerTop: ORBIT.centerTop,
    outerDiameterPercent: ORBIT.ringRadiusPercent * 2 + 16,
    innerDiameterPercent: ORBIT.ringRadiusPercent * 2 - 16,
  };
}
