import type { HandAssignment, PatternEvent } from "./RhythmPattern";

export type Grade = "perfect" | "good" | "near" | "miss";

export interface TimingWindows {
  perfectMs: number;
  goodMs: number;
  nearMs: number;
  /** Both hands of a two-hand event must land within this of each other. */
  simultaneousMs: number;
}

export const DEFAULT_WINDOWS: TimingWindows = { perfectMs: 120, goodMs: 220, nearMs: 340, simultaneousMs: 220 };

export interface HitInput {
  hand: "left" | "right";
  tabla: number;
  /** Seconds, same clock as the event times. */
  time: number;
}

export interface EventResult {
  /** Index into the validator's event list. */
  eventIndex: number;
  grade: Grade;
  /** Per matched hit: how early (-) or late (+) it was, ms. */
  offsetsMs: number[];
  twoHands: boolean;
  /** Only some of a two-hand event's hits were played. */
  partial: boolean;
}

export type HitOutcome =
  | { kind: "matched"; eventIndex: number; grade: Grade; offsetMs: number; result: EventResult | null }
  /** Right sound, nothing expected here (wrong tabla, wrong moment) — harmless. */
  | { kind: "stray" };

interface Slot {
  hand: HandAssignment;
  tabla: number;
  matched: { hand: "left" | "right"; offsetMs: number; time: number } | null;
}

interface EventState {
  time: number;
  slots: Slot[];
  done: boolean;
}

const gradeFor = (absMs: number, w: TimingWindows): Grade => (absMs <= w.perfectMs ? "perfect" : absMs <= w.goodMs ? "good" : absMs <= w.nearMs ? "near" : "miss");
const RANK: Record<Grade, number> = { perfect: 0, good: 1, near: 2, miss: 3 };

/**
 * Judges what the child plays against the pattern — pure logic on a shared
 * clock. A hit is matched to the nearest still-open event that expects that
 * tabla (and that hand, if the pattern names one) within the widest window.
 * Two-hand events need both hits close together. Events nobody played expire
 * as misses once their window passes, so the round always ends.
 */
export class RhythmValidator {
  private readonly states: EventState[];
  readonly results: EventResult[] = [];

  constructor(events: readonly PatternEvent[], timeOf: (event: PatternEvent) => number, private readonly windows: TimingWindows = DEFAULT_WINDOWS) {
    this.states = events.map((event) => ({ time: timeOf(event), slots: event.hits.map((h) => ({ hand: h.hand, tabla: h.tabla, matched: null })), done: false }));
  }

  get total(): number {
    return this.states.length;
  }

  get finished(): boolean {
    return this.states.every((s) => s.done);
  }

  /** The next event nobody has finished yet (for "next beat" hints), or null. */
  nextOpen(): { eventIndex: number; time: number; tablas: number[] } | null {
    const index = this.states.findIndex((s) => !s.done);
    if (index < 0) return null;
    const state = this.states[index];
    return { eventIndex: index, time: state.time, tablas: state.slots.filter((s) => !s.matched).map((s) => s.tabla) };
  }

  hit(input: HitInput): HitOutcome {
    const nearSeconds = this.windows.nearMs / 1000;
    let best: { index: number; slot: Slot; abs: number } | null = null;

    this.states.forEach((state, index) => {
      if (state.done) return;
      const offset = input.time - state.time;
      if (Math.abs(offset) > nearSeconds) return;
      const slot = this.freeSlotFor(state, input);
      if (!slot) return;
      // For two-hand events the second hit must land close to the first.
      const first = state.slots.find((s) => s.matched)?.matched;
      if (first && Math.abs(input.time - first.time) * 1000 > this.windows.simultaneousMs) return;
      const abs = Math.abs(offset);
      if (!best || abs < best.abs) best = { index, slot, abs };
    });

    if (!best) return { kind: "stray" };
    const { index, slot } = best as { index: number; slot: Slot; abs: number };
    const state = this.states[index];
    const offsetMs = (input.time - state.time) * 1000;
    slot.matched = { hand: input.hand, offsetMs, time: input.time };
    const grade = gradeFor(Math.abs(offsetMs), this.windows);

    let result: EventResult | null = null;
    if (state.slots.every((s) => s.matched)) result = this.finish(index, false);
    return { kind: "matched", eventIndex: index, grade, offsetMs, result };
  }

  /** Expires events whose window has passed. Returns the events that just ended (misses / partials). */
  advance(now: number): EventResult[] {
    const expired: EventResult[] = [];
    const limit = this.windows.nearMs / 1000;
    this.states.forEach((state, index) => {
      if (state.done || now <= state.time + limit) return;
      expired.push(this.finish(index, true));
    });
    return expired;
  }

  private freeSlotFor(state: EventState, input: HitInput): Slot | null {
    const usedHands = new Set(state.slots.filter((s) => s.matched).map((s) => s.matched!.hand));
    if (usedHands.has(input.hand)) return null;
    const exact = state.slots.find((s) => !s.matched && s.tabla === input.tabla && s.hand === input.hand);
    if (exact) return exact;
    return state.slots.find((s) => !s.matched && s.tabla === input.tabla && s.hand === "either") ?? null;
  }

  private finish(index: number, expired: boolean): EventResult {
    const state = this.states[index];
    state.done = true;
    const matched = state.slots.filter((s) => s.matched).map((s) => s.matched!);
    const partial = expired && matched.length > 0 && matched.length < state.slots.length;
    const offsets = matched.map((m) => m.offsetMs);
    let grade: Grade;
    if (matched.length === 0) grade = "miss";
    else if (partial) grade = "near";
    else grade = matched.map((m) => gradeFor(Math.abs(m.offsetMs), this.windows)).reduce((worst, g) => (RANK[g] > RANK[worst] ? g : worst), "perfect" as Grade);
    const result: EventResult = { eventIndex: index, grade, offsetsMs: offsets, twoHands: state.slots.length > 1 && !partial && matched.length > 1, partial };
    this.results.push(result);
    return result;
  }
}
