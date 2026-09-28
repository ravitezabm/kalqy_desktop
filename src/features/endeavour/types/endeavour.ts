/**
 * Canonical Endeavour/world data model. The frontend renders whatever the
 * backend returns here — no game name, count, position or asset path is
 * ever assumed by a component. See EndeavourWorldResponse for the wire shape.
 */

export type AdventureStatus = "locked" | "available" | "in_progress" | "completed";

export interface AdventurePosition {
  /** Normalized 0–100 coordinates so one map works at any screen size. */
  x: number;
  y: number;
}

export interface AdventureTheme {
  accent: string;
}

export interface Adventure {
  id: string;
  slug: string;
  order: number;

  title: string;
  subtitle: string;

  islandImage: string;

  position: AdventurePosition;

  status: AdventureStatus;
  requiredAdventureId: string | null;

  progress: number;
  stars: number;
  bestScore: number | null;
  playCount: number;

  route: string;
  theme: AdventureTheme;
}

export interface EndeavourWorld {
  id: string;
  name: string;
  backgroundImage: string;
  version: number;
}

/** Shape returned by GET /api/endeavour/world. */
export interface EndeavourWorldResponse {
  world: EndeavourWorld;
  adventures: Adventure[];
}

export interface AdventureCompletionResult {
  stars: number;
  score: number;
}
