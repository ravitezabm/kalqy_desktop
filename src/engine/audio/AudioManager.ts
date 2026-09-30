export type SfxName =
  | "handDetected"
  | "holdStart"
  | "correct"
  | "success"
  | "encourage"
  | "fail"
  | "button"
  | "waterSplash"
  | "bloom"
  | "sizzle"
  | "levelComplete"
  | "eggPickup"
  | "eggDrop"
  | "birdChirp"
  | "birdSad"
  | "fruitCatch"
  | "wrongFruit"
  | "rottenFruit"
  | "streakUp"
  | "timerWarning";

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

  private buffers = new Map<string, AudioBuffer>();
  private scheduled = new Set<{ source: AudioScheduledSourceNode; gain: GainNode; group: string }>();
  private drone: { out: GainNode; oscillators: OscillatorNode[] } | null = null;
  private musicTimer: number | null = null;
  private nextNoteAt = 0;
  private lastNote = 2;
  private beat = 0;
  private trackEl: HTMLAudioElement | null = null;
  private muted = false;
  private sfxEnabled = true;
  private musicEnabled = true;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    const musicBus = ctx.createGain();
    const sfxBus = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    musicBus.gain.value = this.musicEnabled ? 0.5 : 0;
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

  /** Player's Settings toggles: SFX and music switch off independently. */
  setEnabled(sfx: boolean, music: boolean): void {
    this.sfxEnabled = sfx;
    this.musicEnabled = music;
    if (this.musicBus) this.musicBus.gain.value = music ? 0.5 : 0;
    if (this.trackEl) this.trackEl.muted = this.muted || !music;
  }

  setMusicVolume(volume: number): void {
    if (this.musicBus) this.musicBus.gain.value = volume;
    if (this.trackEl) this.trackEl.volume = volume;
  }

  setSfxVolume(volume: number): void {
    if (this.sfxBus) this.sfxBus.gain.value = volume;
  }

  playSfx(name: SfxName): void {
    if (!this.sfxEnabled) return;
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
      case "waterSplash":
        this.noise(t, 0.35, 900, 0.22);
        this.tone(660, t, 0.12, "sine", 0.1);
        break;
      case "bloom":
        [523.25, 659.25, 783.99, 987.77, 1318.5].forEach((f, i) => this.tone(f, t + i * 0.08, 0.5, "sine", 0.18));
        break;
      case "sizzle":
        this.noise(t, 0.9, 4200, 0.16);
        break;
      case "eggPickup":
        this.tone(700, t, 0.1, "sine", 0.16);
        this.tone(930, t + 0.06, 0.12, "sine", 0.12);
        break;
      case "eggDrop":
        this.tone(180, t, 0.16, "sine", 0.22);
        this.noise(t, 0.08, 500, 0.08);
        break;
      case "birdChirp":
        [1500, 1900, 1650, 2200].forEach((f, i) => this.tone(f, t + i * 0.07, 0.09, "sine", 0.1));
        break;
      case "birdSad":
        this.tone(1300, t, 0.14, "sine", 0.09);
        this.tone(950, t + 0.15, 0.25, "sine", 0.09);
        break;
      case "fruitCatch":
        this.tone(520, t, 0.08, "square", 0.08);
        this.tone(880, t + 0.05, 0.22, "triangle", 0.26);
        this.tone(1175, t + 0.11, 0.26, "triangle", 0.2);
        break;
      case "wrongFruit":
        this.tone(220, t, 0.22, "triangle", 0.2);
        this.tone(185, t + 0.12, 0.3, "triangle", 0.18);
        break;
      case "rottenFruit":
        this.noise(t, 0.3, 420, 0.3);
        this.tone(140, t, 0.3, "sawtooth", 0.1);
        this.tone(110, t + 0.14, 0.34, "sine", 0.16);
        break;
      case "streakUp":
        [659.25, 783.99, 987.77].forEach((f, i) => this.tone(f, t + i * 0.07, 0.2, "triangle", 0.2));
        break;
      case "timerWarning":
        this.tone(1000, t, 0.06, "square", 0.07);
        break;
      case "levelComplete":
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.1, 0.6, "triangle", 0.28));
        break;
    }
  }

  async startMusic(trackUrl?: string, options: { fallback?: boolean } = {}): Promise<void> {
    this.stopMusic();
    await this.unlock();

    if (trackUrl && (await this.tryStartTrack(trackUrl))) return;
    if (options.fallback !== false) this.startSynthMusic();
  }

  // ---- rhythm API -----------------------------------------------------------
  // Sample playback is scheduled against the audio clock (never setTimeout) and
  // uses decoded buffers, so a hit is heard as fast as the device allows.

  /** The audio clock in seconds. It stops while the context is suspended (pause), so anything timed by it pauses too. */
  now(): number {
    return this.ensure().currentTime;
  }

  /** Fetches and decodes samples once; later calls for the same id are free. Resolves before gameplay starts. */
  async loadSamples(samples: Record<string, string>): Promise<void> {
    const ctx = this.ensure();
    await Promise.all(
      Object.entries(samples)
        .filter(([id]) => !this.buffers.has(id))
        .map(async ([id, url]) => {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Could not load sample ${id} (${url})`);
          this.buffers.set(id, await ctx.decodeAudioData(await response.arrayBuffer()));
        })
    );
  }

  hasSample(id: string): boolean {
    return this.buffers.has(id);
  }

  /**
   * Plays a decoded sample at audio time `at` (seconds; in the past = now). `group` lets a whole level's
   * future sounds be cancelled together. Returns false if the sample isn't loaded.
   */
  scheduleSample(id: string, at: number, options: { gain?: number; rate?: number; group?: string } = {}): boolean {
    const buffer = this.buffers.get(id);
    if (!buffer) return false;
    const ctx = this.ensure();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options.rate ?? 1;
    const gain = ctx.createGain();
    gain.gain.value = this.sfxEnabled ? (options.gain ?? 1) : 0;
    source.connect(gain);
    gain.connect(this.sfxBus ?? ctx.destination);
    const entry = { source, gain, group: options.group ?? "" };
    this.scheduled.add(entry);
    source.onended = () => {
      this.scheduled.delete(entry);
      source.disconnect();
      gain.disconnect();
    };
    source.start(Math.max(at, ctx.currentTime));
    return true;
  }

  /** A soft tick or bell on the audio clock — the count-in and bar chimes. */
  scheduleClick(at: number, options: { accent?: boolean; bell?: boolean; group?: string } = {}): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensure();
    const when = Math.max(at, ctx.currentTime);
    if (options.bell) {
      [880, 1318.5].forEach((freq, i) => this.scheduledTone(freq, when, 1.1 - i * 0.4, "sine", 0.05 - i * 0.02, options.group));
      return;
    }
    this.scheduledTone(options.accent ? 1200 : 820, when, 0.07, "triangle", options.accent ? 0.16 : 0.1, options.group);
  }

  /** Cancels every sound scheduled in `group` (or all of them) that hasn't finished — leaving a level must be silent. */
  cancelScheduled(group?: string): void {
    for (const entry of [...this.scheduled]) {
      if (group !== undefined && entry.group !== group) continue;
      try {
        entry.gain.gain.cancelScheduledValues(0);
        entry.gain.gain.value = 0;
        entry.source.stop();
      } catch {
        /* already stopped */
      }
      this.scheduled.delete(entry);
    }
  }

  /** A soft tanpura-like drone (root + fifth + octave) under the music bus; stays until stopDrone. */
  startDrone(root = 110): void {
    if (this.drone) return;
    const ctx = this.ensure();
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);
    out.connect(this.musicBus!);
    const oscillators: OscillatorNode[] = [];
    [[root, 0.05], [root * 1.5, 0.035], [root * 2, 0.03], [root * 2.003, 0.02]].forEach(([freq, level]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      gain.gain.value = level;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 700;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      osc.start();
      oscillators.push(osc);
    });
    this.drone = { out, oscillators };
  }

  stopDrone(): void {
    if (!this.drone) return;
    const { out, oscillators } = this.drone;
    this.drone = null;
    const ctx = this.ctx;
    if (!ctx) return;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    oscillators.forEach((osc) => osc.stop(ctx.currentTime + 0.5));
  }

  private scheduledTone(freq: number, at: number, duration: number, type: OscillatorType, peak: number, group = ""): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(this.musicBus ?? ctx.destination);
    const entry = { source: osc as unknown as AudioScheduledSourceNode, gain, group };
    this.scheduled.add(entry);
    osc.onended = () => {
      this.scheduled.delete(entry);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(at);
    osc.stop(at + duration + 0.05);
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
    this.cancelScheduled();
    this.stopDrone();
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }

  private tryStartTrack(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const el = new Audio(url);
      el.loop = true;
      el.muted = this.muted || !this.musicEnabled;
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

  /** A short burst of filtered noise — water, steam. */
  private noise(at: number, duration: number, cutoff: number, peak: number): void {
    const ctx = this.ensure();
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus ?? ctx.destination);
    source.start(at);
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
