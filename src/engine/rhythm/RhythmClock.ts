/**
 * Deterministic musical time. It is pure: give it the time the pattern
 * started (in whatever clock you use — the game passes the audio clock, in
 * seconds) and it converts between seconds, beats and bars. Beats before the
 * start are negative, which is how a count-in is expressed.
 */
export class RhythmClock {
  private startAt = 0;

  constructor(readonly bpm: number, readonly beatsPerBar = 4) {}

  get beatDuration(): number {
    return 60 / this.bpm;
  }

  get barDuration(): number {
    return this.beatDuration * this.beatsPerBar;
  }

  /** Beat 0 happens at `time`. */
  start(time: number): void {
    this.startAt = time;
  }

  timeAtBeat(beat: number): number {
    return this.startAt + beat * this.beatDuration;
  }

  /** Fractional beat at `time` (negative during the count-in). */
  beatAt(time: number): number {
    return (time - this.startAt) / this.beatDuration;
  }

  position(time: number): { beat: number; bar: number; beatInBar: number } {
    const beat = this.beatAt(time);
    const whole = Math.floor(beat);
    return { beat, bar: Math.floor(whole / this.beatsPerBar), beatInBar: ((whole % this.beatsPerBar) + this.beatsPerBar) % this.beatsPerBar };
  }
}
