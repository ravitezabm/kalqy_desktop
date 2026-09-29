/**
 * The One Euro Filter (Casiez, Roussel, Vogel 2012) — the standard smoothing
 * filter for noisy real-time input like hand tracking. Filters jitter at
 * low speed while staying responsive at high speed, so a slowly-hovering
 * hand looks stable and a fast swipe doesn't lag.
 *
 * Every motion-driven game shares this one implementation — see PROMPT
 * section 18: "Do NOT duplicate filters in games."
 */
export interface OneEuroFilterOptions {
  /** Minimum cutoff frequency — lower = smoother but more lag at low speed. */
  minCutoff?: number;
  /** How much cutoff increases with speed — higher = more responsive when moving fast. */
  beta?: number;
  /** Cutoff for the derivative estimate itself. */
  dCutoff?: number;
}

function lowPassAlpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

class ScalarOneEuro {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  private initialized = false;
  private xPrev = 0;
  private dxPrev = 0;

  constructor(options: OneEuroFilterOptions = {}) {
    this.minCutoff = options.minCutoff ?? 1.0;
    this.beta = options.beta ?? 0.02;
    this.dCutoff = options.dCutoff ?? 1.0;
  }

  filter(value: number, dtSeconds: number): number {
    const dt = Math.max(dtSeconds, 1 / 240);

    if (!this.initialized) {
      this.initialized = true;
      this.xPrev = value;
      this.dxPrev = 0;
      return value;
    }

    const dx = (value - this.xPrev) / dt;
    const dAlpha = lowPassAlpha(this.dCutoff, dt);
    const dxHat = this.dxPrev + dAlpha * (dx - this.dxPrev);

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const alpha = lowPassAlpha(cutoff, dt);
    const xHat = this.xPrev + alpha * (value - this.xPrev);

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }

  reset(): void {
    this.initialized = false;
  }
}

/** Filters a 2D point (e.g. a hand position) by running one filter per axis. */
export class OneEuroFilter2D {
  private readonly fx: ScalarOneEuro;
  private readonly fy: ScalarOneEuro;

  constructor(options: OneEuroFilterOptions = {}) {
    this.fx = new ScalarOneEuro(options);
    this.fy = new ScalarOneEuro(options);
  }

  filter(x: number, y: number, dtSeconds: number): { x: number; y: number } {
    return { x: this.fx.filter(x, dtSeconds), y: this.fy.filter(y, dtSeconds) };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }
}

/** Named smoothing presets — see PROMPT section 18. */
export const SMOOTHING_PROFILES: Record<"smooth" | "balanced" | "responsive", OneEuroFilterOptions> = {
  smooth: { minCutoff: 0.6, beta: 0.01, dCutoff: 1.0 },
  balanced: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },
  responsive: { minCutoff: 1.8, beta: 0.05, dCutoff: 1.0 },
};
