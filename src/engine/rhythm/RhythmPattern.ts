export type HandAssignment = "left" | "right" | "either";

export interface PatternHit {
  hand: HandAssignment;
  /** 0-based tabla index. */
  tabla: number;
}

/** One moment in the pattern. No hits = a rest; several hits = they must be played together. */
export interface PatternEvent {
  beat: number;
  hits: PatternHit[];
}

export interface RhythmPattern {
  bpm: number;
  beatsPerBar: number;
  events: PatternEvent[];
  /** Total length in beats (rests at the end count); defaults to the last event + 1. */
  lengthBeats?: number;
}

/**
 * Compact way to write a pattern, one token per beat:
 *   "1"     tabla 1, either hand        "L2" / "R3"  tabla 2 with the left / tabla 3 with the right hand
 *   "L1+R3" both hands together          "-"          a rest
 * Tablas are numbered from 1 here (what a child sees) and 0-based in the data.
 */
export function parsePattern(bpm: number, tokens: readonly string[], beatsPerBar = 4): RhythmPattern {
  const events: PatternEvent[] = tokens.map((token, beat) => {
    if (token === "-") return { beat, hits: [] };
    const hits = token.split("+").map((part): PatternHit => {
      const match = /^([LR]?)(\d+)$/.exec(part.trim());
      if (!match) throw new Error(`Bad pattern token "${token}"`);
      return { hand: match[1] === "L" ? "left" : match[1] === "R" ? "right" : "either", tabla: Number(match[2]) - 1 };
    });
    return { beat, hits };
  });
  return { bpm, beatsPerBar, events, lengthBeats: tokens.length };
}

export const beatSeconds = (pattern: RhythmPattern): number => 60 / pattern.bpm;

/** Only the events a player has to play (rests dropped). */
export const noteEvents = (pattern: RhythmPattern): PatternEvent[] => pattern.events.filter((event) => event.hits.length > 0);

export function patternLengthBeats(pattern: RhythmPattern): number {
  return pattern.lengthBeats ?? Math.max(0, ...pattern.events.map((e) => e.beat)) + 1;
}

/** Problems that would make a pattern unplayable (empty = fine). */
export function validatePattern(pattern: RhythmPattern, tablaCount: number): string[] {
  const problems: string[] = [];
  if (!(pattern.bpm > 0)) problems.push("bpm must be positive");
  if (noteEvents(pattern).length === 0) problems.push("pattern has no notes");
  for (const event of pattern.events) {
    if (!(event.beat >= 0)) problems.push(`event at beat ${event.beat}: beat must be >= 0`);
    const hands = event.hits.map((h) => h.hand).filter((h) => h !== "either");
    if (new Set(hands).size !== hands.length) problems.push(`beat ${event.beat}: the same hand is asked to hit twice`);
    if (event.hits.length > 2) problems.push(`beat ${event.beat}: only two hands are available`);
    for (const hit of event.hits) if (!Number.isInteger(hit.tabla) || hit.tabla < 0 || hit.tabla >= tablaCount) problems.push(`beat ${event.beat}: tabla ${hit.tabla + 1} does not exist`);
  }
  return problems;
}
