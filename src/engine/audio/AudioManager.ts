export type SfxName = "handDetected" | "holdStart" | "correct" | "success" | "encourage" | "fail" | "button";

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

/**
 * Shared audio for every game (PROMPT sections 69/70). No sound files have
 * been supplied yet, so SFX and the fallback music are synthesized with Web
 * Audio; if a music track URL is provided and loads, that file is used
 * instead. All gains sit behind master/music/sfx buses so volume + mute
 * work the same either way.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  private musicTimer: number | null = null;
  private nextNoteAt = 0;
  private lastNote = 2;
  private beat = 0;
  private trackEl: HTMLAudioElement | null = null;
  private muted = false;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    const musicBus = ctx.createGain();
    const sfxBus = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    musicBus.gain.value = 0.5;
    sfxBus.gain.value = 0.8;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.musicBus = musicBus;
    this.sfxBus = sfxBus;
    return ctx;
  }

  /** Browsers/webviews keep the context suspended until a user gesture. */
  async unlock(): Promise<void> {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
    if (this.trackEl) this.trackEl.muted = muted;
  }

  setMusicVolume(volume: number): void {
    if (this.musicBus) this.musicBus.gain.value = volume;
    if (this.trackEl) this.trackEl.volume = volume;
  }

  setSfxVolume(volume: number): void {
    if (this.sfxBus) this.sfxBus.gain.value = volume;
  }

  playSfx(name: SfxName): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    switch (name) {
      case "handDetected":
        this.tone(783.99, t, 0.18, "sine", 0.25);
        break;
      case "holdStart":
        this.tone(659.25, t, 0.2, "sine", 0.22);
        break;
      case "correct":
        [523.25, 659.25].forEach((f, i) => this.tone(f, t + i * 0.09, 0.3, "triangle", 0.25));
        break;
      case "success":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.11, 0.55, "triangle", 0.3));
        break;
      case "encourage":
        this.tone(440, t, 0.25, "sine", 0.18);
        this.tone(392, t + 0.16, 0.35, "sine", 0.18);
        break;
      case "fail":
        this.tone(392, t, 0.3, "sine", 0.2);
        this.tone(329.63, t + 0.22, 0.5, "sine", 0.2);
        break;
      case "button":
        this.tone(880, t, 0.08, "square", 0.08);
        break;
    }
  }

  async startMusic(trackUrl?: string): Promise<void> {
    this.stopMusic();
    await this.unlock();

    if (trackUrl && (await this.tryStartTrack(trackUrl))) return;
    this.startSynthMusic();
  }

  pauseMusic(): void {
    void this.ctx?.suspend();
    this.trackEl?.pause();
  }

  resumeMusic(): void {
    void this.ctx?.resume();
    void this.trackEl?.play();
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.trackEl) {
      this.trackEl.pause();
      this.trackEl.src = "";
      this.trackEl = null;
    }
  }

  destroy(): void {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }

  private tryStartTrack(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const el = new Audio(url);
      el.loop = true;
      el.muted = this.muted;
      el.volume = this.musicBus?.gain.value ?? 0.5;
      const fail = () => resolve(false);
      el.addEventListener("error", fail, { once: true });
      el.play()
        .then(() => {
          this.trackEl = el;
          resolve(true);
        })
        .catch(fail);
    });
  }

  private startSynthMusic(): void {
    const ctx = this.ensure();
    this.nextNoteAt = ctx.currentTime + 0.1;
    this.beat = 0;

    // Soft shimmer: a feedback delay on the music bus.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.36;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.musicBus!);

    const schedule = () => {
      while (this.nextNoteAt < ctx.currentTime + 0.6) {
        if (this.beat % 8 === 0) this.pad(ctx, this.nextNoteAt, delay);

        if (this.beat % 2 === 0 || Math.random() < 0.4) {
          this.lastNote = Math.max(0, Math.min(PENTATONIC.length - 1, this.lastNote + Math.round(Math.random() * 2 - 1) * (Math.random() < 0.3 ? 2 : 1)));
          this.musicNote(ctx, PENTATONIC[this.lastNote], this.nextNoteAt, delay);
        }
        this.beat += 1;
        this.nextNoteAt += 0.5;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 200);
  }

  private musicNote(ctx: AudioContext, freq: number, at: number, delay: DelayNode): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.1, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    osc.connect(gain);
    gain.connect(this.musicBus!);
    gain.connect(delay);
    osc.start(at);
    osc.stop(at + 1.5);
  }

  private pad(ctx: AudioContext, at: number, delay: DelayNode): void {
    [130.81, 196.0].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(0.07, at + 1.2);
      gain.gain.linearRampToValueAtTime(0.0001, at + 4.2);
      osc.connect(gain);
      gain.connect(this.musicBus!);
      gain.connect(delay);
      osc.start(at);
      osc.stop(at + 4.3);
    });
  }

  private tone(freq: number, at: number, duration: number, type: OscillatorType, peak: number): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(this.sfxBus!);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }
}
