export type FlowerColorId = "red" | "blue" | "yellow" | "purple" | "green";

export const FLOWER_COLORS: Record<FlowerColorId, number> = {
  red: 0xff4f4f,
  blue: 0x00aeef,
  yellow: 0xffd166,
  purple: 0xa855c9,
  green: 0x7cb928,
};

export interface FlowerTargetConfig {
  id: string;
  colorId: FlowerColorId;
  /** Normalized 0..1 position of the pot's base — see PROMPT section 60. */
  x: number;
  y: number;
  scale: number;
}

export interface ButterflyLevelConfig {
  id: string;
  title: string;
  kind: "training" | "story";
  /** Shown in the HUD instruction panel. */
  hint: string;
  timeLimitSeconds: number;
  /** Training reveals the answer; Story Mode never does (PROMPT section 106). */
  highlightCorrect: boolean;
  butterfly: { colorId: FlowerColorId };
  targets: FlowerTargetConfig[];
  mechanics: {
    holdDurationMs: number;
    /** Px in the 1280x720 game space, measured from the blossom's center. */
    interactionRadius: number;
  };
}

const HOLD_MS = 3000;

/**
 * Story Mode, in order (PROMPT sections 53-58). Config-driven so a backend
 * can later replace this list without any engine/game code changing.
 */
export const BUTTERFLY_LEVELS: ButterflyLevelConfig[] = [
  {
    id: "butterfly-training",
    title: "Training",
    kind: "training",
    hint: "Move your hand to fly the butterfly to the glowing flower and hold still!",
    timeLimitSeconds: 90,
    highlightCorrect: true,
    butterfly: { colorId: "red" },
    targets: [{ id: "t-red", colorId: "red", x: 0.685, y: 0.84, scale: 0.66 }],
    mechanics: { holdDurationMs: HOLD_MS, interactionRadius: 150 },
  },
  {
    id: "butterfly-story-01",
    title: "Level 1",
    kind: "story",
    hint: "Guide the butterfly to the flower with the same color",
    timeLimitSeconds: 45,
    highlightCorrect: false,
    butterfly: { colorId: "red" },
    targets: [{ id: "t-red", colorId: "red", x: 0.685, y: 0.84, scale: 0.66 }],
    mechanics: { holdDurationMs: HOLD_MS, interactionRadius: 150 },
  },
  {
    id: "butterfly-story-02",
    title: "Level 2",
    kind: "story",
    hint: "Two flowers - which one matches the butterfly?",
    timeLimitSeconds: 45,
    highlightCorrect: false,
    butterfly: { colorId: "red" },
    targets: [
      { id: "t-blue", colorId: "blue", x: 0.55, y: 0.8, scale: 0.56 },
      { id: "t-red", colorId: "red", x: 0.8, y: 0.86, scale: 0.56 },
    ],
    mechanics: { holdDurationMs: HOLD_MS, interactionRadius: 110 },
  },
  {
    id: "butterfly-story-03",
    title: "Level 3",
    kind: "story",
    hint: "Three flowers - find the matching color",
    timeLimitSeconds: 45,
    highlightCorrect: false,
    butterfly: { colorId: "blue" },
    targets: [
      { id: "t-red", colorId: "red", x: 0.5, y: 0.78, scale: 0.5 },
      { id: "t-yellow", colorId: "yellow", x: 0.68, y: 0.88, scale: 0.5 },
      { id: "t-blue", colorId: "blue", x: 0.86, y: 0.8, scale: 0.5 },
    ],
    mechanics: { holdDurationMs: HOLD_MS, interactionRadius: 90 },
  },
  {
    id: "butterfly-story-04",
    title: "Level 4",
    kind: "story",
    hint: "Four flowers - look carefully!",
    timeLimitSeconds: 45,
    highlightCorrect: false,
    butterfly: { colorId: "yellow" },
    targets: [
      { id: "t-purple", colorId: "purple", x: 0.48, y: 0.74, scale: 0.46 },
      { id: "t-blue", colorId: "blue", x: 0.62, y: 0.88, scale: 0.46 },
      { id: "t-red", colorId: "red", x: 0.76, y: 0.76, scale: 0.46 },
      { id: "t-yellow", colorId: "yellow", x: 0.9, y: 0.88, scale: 0.46 },
    ],
    mechanics: { holdDurationMs: HOLD_MS, interactionRadius: 75 },
  },
  {
    id: "butterfly-story-05",
    title: "Level 5",
    kind: "story",
    hint: "Five flowers - you can do it!",
    timeLimitSeconds: 45,
    highlightCorrect: false,
    butterfly: { colorId: "green" },
    targets: [
      { id: "t-blue", colorId: "blue", x: 0.46, y: 0.72, scale: 0.42 },
      { id: "t-purple", colorId: "purple", x: 0.58, y: 0.87, scale: 0.42 },
      { id: "t-green", colorId: "green", x: 0.7, y: 0.73, scale: 0.42 },
      { id: "t-red", colorId: "red", x: 0.82, y: 0.88, scale: 0.42 },
      { id: "t-yellow", colorId: "yellow", x: 0.93, y: 0.75, scale: 0.42 },
    ],
    mechanics: { holdDurationMs: HOLD_MS, interactionRadius: 65 },
  },
];

/** Returns a list of problems; empty means the level is safe to run (PROMPT section 104). */
export function validateLevel(level: ButterflyLevelConfig): string[] {
  const problems: string[] = [];
  if (!level.id) problems.push("missing level id");
  if (level.targets.length === 0) problems.push("no targets");
  if (!(level.mechanics.holdDurationMs > 0)) problems.push("invalid holdDurationMs");
  if (!(level.mechanics.interactionRadius > 0)) problems.push("invalid interactionRadius");
  if (!(level.timeLimitSeconds > 0)) problems.push("invalid timeLimitSeconds");
  if (!(level.butterfly.colorId in FLOWER_COLORS)) problems.push("unknown butterfly color");

  const ids = new Set<string>();
  for (const target of level.targets) {
    if (ids.has(target.id)) problems.push(`duplicate target id ${target.id}`);
    ids.add(target.id);
    if (!(target.colorId in FLOWER_COLORS)) problems.push(`unknown color on ${target.id}`);
    if (target.x < 0 || target.x > 1 || target.y < 0 || target.y > 1) problems.push(`position out of range on ${target.id}`);
  }

  const matches = level.targets.filter((t) => t.colorId === level.butterfly.colorId).length;
  if (matches !== 1) problems.push(`expected exactly one matching target, found ${matches}`);
  return problems;
}
