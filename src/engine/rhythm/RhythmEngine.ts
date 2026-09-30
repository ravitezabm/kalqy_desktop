import { RhythmClock } from "./RhythmClock";
import { beatSeconds, noteEvents, patternLengthBeats, type PatternEvent, type RhythmPattern } from "./RhythmPattern";
import { DEFAULT_WINDOWS, RhythmValidator, type EventResult, type HitInput, type HitOutcome, type TimingWindows } from "./RhythmValidator";

export type RhythmMode = "idle" | "demo" | "player";

/** Something the scene should show/play now: an event to demonstrate or a count-in tick. */
export interface RhythmCue {
  kind: "event" | "tick";
  time: number;
  beat: number;
  /** event cues: the event (may have several hits). */
  event?: PatternEvent;
  /** tick cues: is it the first beat of a bar? */
  accent?: boolean;
}

export interface EngineTick {
  cues: RhythmCue[];
  /** Events that ended without being played in full (player mode). */
  expired: EventResult[];
  /** Demo: every cue fired. Player: every event judged. */
  finished: boolean;
}

export interface RhythmEngineOptions {
  countInBeats: number;
  windows: TimingWindows;
}

/**
 * The rhythm "brain": a pattern, its clock, and the two modes — DEMO (the
 * game plays the pattern) and PLAYER (the child plays it and every hit is
 * judged). It never touches audio or Phaser; callers pass in the time (the
 * audio clock) and act on the cues it returns. The same pattern drives both
 * modes, so what the child hears is exactly what they are asked to play.
 */
export class RhythmEngine {
  readonly clock: RhythmClock;
  mode: RhythmMode = "idle";
  private validator: RhythmValidator | null = null;
  private cues: RhythmCue[] = [];
  private nextCue = 0;
  private options: RhythmEngineOptions;
  private endsAt = 0;

  constructor(readonly pattern: RhythmPattern, options: Partial<RhythmEngineOptions> = {}) {
    this.options = { countInBeats: 4, windows: DEFAULT_WINDOWS, ...options };
    this.clock = new RhythmClock(pattern.bpm, pattern.beatsPerBar);
  }

  get windows(): TimingWindows {
    return this.options.windows;
  }

  get noteCount(): number {
    return noteEvents(this.pattern).length;
  }

  /** Seconds from `startAt` until the last cue has played (a beat of tail included). */
  get durationSeconds(): number {
    return (this.options.countInBeats + patternLengthBeats(this.pattern) + 1) * beatSeconds(this.pattern);
  }

  /** The audio time of a pattern event, once a mode has started. */
  timeOf(event: PatternEvent): number {
    return this.clock.timeAtBeat(event.beat);
  }

  /** The system plays the pattern. Cues (count-in ticks then events) are all known up front so audio can be scheduled ahead. */
  startDemo(startAt: number): RhythmCue[] {
    this.begin("demo", startAt);
    return this.cues;
  }

  /** The child plays the pattern; call hit() for every tabla hit and update() every frame. */
  startPlayer(startAt: number): RhythmCue[] {
    this.begin("player", startAt);
    this.validator = new RhythmValidator(noteEvents(this.pattern), (event) => this.timeOf(event), this.options.windows);
    // In player mode only the count-in ticks are cues; the notes are the child's to play.
    this.cues = this.cues.filter((cue) => cue.kind === "tick");
    return this.cues;
  }

  stop(): void {
    this.mode = "idle";
    this.validator = null;
    this.cues = [];
    this.nextCue = 0;
  }

  /** Called every frame with the audio-clock time. */
  update(now: number): EngineTick {
    const fired: RhythmCue[] = [];
    while (this.nextCue < this.cues.length && this.cues[this.nextCue].time <= now) fired.push(this.cues[this.nextCue++]);

    let expired: EventResult[] = [];
    let finished = false;
    if (this.mode === "demo") finished = this.nextCue >= this.cues.length && now >= this.endsAt;
    else if (this.mode === "player" && this.validator) {
      expired = this.validator.advance(now);
      finished = this.validator.finished;
    }
    return { cues: fired, expired, finished };
  }

  hit(input: HitInput): HitOutcome {
    if (this.mode !== "player" || !this.validator) return { kind: "stray" };
    return this.validator.hit(input);
  }

  /** What is coming next (for the optional hint glow). */
  nextOpen(): ReturnType<RhythmValidator["nextOpen"]> {
    return this.validator?.nextOpen() ?? null;
  }

  results(): readonly EventResult[] {
    return this.validator?.results ?? [];
  }

  private begin(mode: RhythmMode, startAt: number): void {
    const { countInBeats } = this.options;
    // Beat 0 is the first beat of the pattern, `countInBeats` after `startAt`.
    this.clock.start(startAt + countInBeats * beatSeconds(this.pattern));
    this.mode = mode;
    this.nextCue = 0;
    this.cues = [];
    for (let i = 0; i < countInBeats; i++) {
      const beat = i - countInBeats;
      this.cues.push({ kind: "tick", time: this.clock.timeAtBeat(beat), beat, accent: i === 0 });
    }
    for (const event of noteEvents(this.pattern)) this.cues.push({ kind: "event", time: this.timeOf(event), beat: event.beat, event });
    this.cues.sort((a, b) => a.time - b.time);
    this.endsAt = this.clock.timeAtBeat(patternLengthBeats(this.pattern) + 0.5);
  }
}
