export interface TablaSlot {
  x: number;
  /** Display width in game pixels. */
  width: number;
}

export interface TablaLayoutOptions {
  /** Fraction of the viewport width the row may use. */
  rowFraction: number;
  maxWidth: number;
  /** Fraction of each slot the drum fills (the rest is the gap between drums). */
  fill: number;
}

const DEFAULTS: TablaLayoutOptions = { rowFraction: 0.76, maxWidth: 232, fill: 0.9 };

/** Evenly spaced, centered drums for any count — nothing in the game assumes four. */
export function calculateTablaLayout(count: number, viewportWidth: number, options: Partial<TablaLayoutOptions> = {}): TablaSlot[] {
  const { rowFraction, maxWidth, fill } = { ...DEFAULTS, ...options };
  if (count <= 0) return [];
  const spacing = Math.min((viewportWidth * rowFraction) / count, maxWidth / fill);
  const width = Math.min(maxWidth, spacing * fill);
  const left = viewportWidth / 2 - (spacing * (count - 1)) / 2;
  return Array.from({ length: count }, (_, i) => ({ x: left + i * spacing, width }));
}
