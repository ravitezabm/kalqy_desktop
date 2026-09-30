import Phaser from "phaser";
import type { GameContext, GameProgress } from "../../engine/core/KalqyGame";
import type { AudioManager } from "../../engine/audio/AudioManager";
import type { StoryScene } from "../../engine/game/StoryGame";
import { AtlasCharacter } from "../../engine/entities/AtlasCharacter";
import { HandZoneHitDetector, type HandSample, type HitZone, type ZoneHand, type ZoneHit } from "../../engine/mechanics/hand-zones/HandZoneHitDetector";
import { noteEvents } from "../../engine/rhythm/RhythmPattern";
import { RhythmEngine, type RhythmCue } from "../../engine/rhythm/RhythmEngine";
import { RhythmScore } from "../../engine/rhythm/RhythmScore";
import type { EventResult, Grade } from "../../engine/rhythm/RhythmValidator";
import { BeatIndicator } from "../../engine/vfx/BeatIndicator";
import { FloatingText } from "../../engine/vfx/FloatingText";
import { HandCursor } from "../../engine/vfx/HandCursor";
import { ParallaxSystem } from "../../engine/vfx/ParallaxSystem";
import { ParticleBurst } from "../../engine/vfx/ParticleBurst";
import { NO_HAND } from "../../engine/motion/hand/HandState";
import { analytics } from "../../features/games/services/analytics";
import { TABLA_SKINS } from "./assets";
import { SAFE_FALLBACK_LEVEL, TABLA_INPUT, TABLA_LEVELS, TABLA_STROKES, validateTablaLevel, type TablaLevelConfig } from "./config/levels.config";
import { TablaView, type HitGrade } from "./entities/TablaView";
import { calculateTablaLayout } from "./TablaLayout";

export const TABLA_GAME_ID = "tabla-rhythm";

const W = 1280;
const H = 720;
/** The row of drums: the playing faces sit here. */
const FACE_Y = 392;
const GROUP = "level";
const DEPTH = { bg: 0, kid: 5, tabla: 10, vfx: 22, hands: 30, hud: 34, text: 36, popup: 40 };
/** Hand position in the camera's view (0..1) → screen, using the middle of the frame like the other hand games. */
const toScreen = (nx: number, ny: number) => ({
  x: Phaser.Math.Clamp((nx - 0.12) / 0.76, 0, 1) * W,
  y: Phaser.Math.Clamp((ny - 0.1) / 0.72, 0, 1) * H,
});

type Phase = "waiting" | "lesson" | "lessonPause" | "demo" | "yourTurn" | "play" | "retry" | "complete";

const GRADE_TEXT: Record<Exclude<Grade, "miss">, { text: string; color: string }> = {
  perfect: { text: "Perfect!", color: "#ffe066" },
  good: { text: "Great!", color: "#fff3b0" },
  near: { text: "Nice!", color: "#ffffff" },
};

/**
 * The Tabla Rhythm scene. Two independent hands (`motion.hand("left"/"right")`)
 * hit tabla zones; a RhythmEngine (pure, on the audio clock) plays the pattern
 * as a demo and judges the child's copy. One scene runs the lessons and all
 * ten levels — `startLevelAt` swaps the configuration. Everything about a
 * level comes from TABLA_LEVELS; the only branching here is lesson vs. rhythm.
 */
export class TablaRhythmGame extends Phaser.Scene implements StoryScene {
  private parallax = new ParallaxSystem();
  private burst!: ParticleBurst;
  private popups!: FloatingText;
  private beats!: BeatIndicator;
  private lessonText!: Phaser.GameObjects.Text;
  private beatLight!: Phaser.GameObjects.Rectangle;
  private cursors!: Record<ZoneHand, HandCursor>;
  private kid!: AtlasCharacter;
  private bunting: { sprite: Phaser.GameObjects.Image; phase: number }[] = [];
  private lamps: Phaser.GameObjects.Image[] = [];

  private tablas: TablaView[] = [];
  private zones: HitZone[] = [];
  private detector = new HandZoneHitDetector();
  private engine: RhythmEngine | null = null;
  private score = new RhythmScore();

  private level: TablaLevelConfig | null = null;
  private levelIndex = 0;
  private phase: Phase = "waiting";
  private phaseUntil = 0;
  private attempts = 0;
  private timer: Phaser.Time.TimerEvent | null = null;

  private lessonIndex = 0;
  private lessonHits = new Map<number, { hand: ZoneHand; time: number }>();
  private lastLessonHand: ZoneHand | null = null;

  private handSeen = false;
  private visibleBefore = false;
  private paused = false;
  private ambient = 0;
  private strayHintAt = -10;
  private trailAt = 0;

  private carryScore = 0;
  private carryStreak = 0;
  private progress: GameProgress;

  private fpsAverage = 60;
  private lowFpsFor = 0;

  constructor(
    private readonly context: GameContext,
    private readonly audio: AudioManager,
    private readonly onProgress: (progress: GameProgress) => void,
    private readonly startIndex: number
  ) {
    super("TablaRhythmGame");
    this.progress = this.blankProgress(TABLA_LEVELS[startIndex], startIndex);
  }

  create(): void {
    this.buildEnvironment();
    this.kid = new AtlasCharacter(this, W / 2, 452, 286, {
      idle: { key: "kid-idle", texture: "kidIdle" },
      happy: { key: "kid-win", texture: "kidWin" },
      celebrate: { key: "kid-win", texture: "kidWin" },
    }).setDepth(DEPTH.kid);

    this.burst = new ParticleBurst(this, DEPTH.vfx);
    this.popups = new FloatingText(this, DEPTH.popup, 10);
    this.beats = new BeatIndicator(this, W / 2, 150, 4, DEPTH.hud);
    this.beatLight = this.add.rectangle(W / 2, H / 2, W + 40, H + 24, 0xffd08a, 0).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    this.cursors = {
      left: new HandCursor(this, false, 0x7cc8ff).setDepth(DEPTH.hands).setVisible(false),
      right: new HandCursor(this, false, 0xffb36b).setDepth(DEPTH.hands).setVisible(false),
    };
    this.lessonText = this.add
      .text(W / 2, 222, "", {
        fontFamily: '"Baloo 2", "Nunito", system-ui, sans-serif',
        fontSize: "54px",
        fontStyle: "800",
        color: "#ffffff",
        stroke: "#4a1f08",
        strokeThickness: 10,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.text)
      .setVisible(false);

    if (import.meta.env.DEV) {
      // Dev-only window for automated tests: where everything is, in game pixels.
      (window as unknown as { __kalqyDebug?: unknown }).__kalqyDebug = {
        state: () => ({
          levelId: this.level?.id,
          status: this.progress.status,
          phase: this.phase,
          now: this.audio.now(),
          zones: this.zones.map((z) => ({ x: z.x, y: z.y, r: z.radius })),
          active: this.tablas.map((t) => t.active),
          nextOpen: this.engine?.nextOpen() ?? null,
          score: this.score.score,
          streak: this.score.streak,
          notes: this.score.notes,
          perfect: this.score.perfect,
          twoHands: this.score.twoHandHits,
          misses: this.score.misses,
          attempts: this.attempts,
          lesson: this.lessonIndex,
          pattern: this.level ? noteEvents(this.level.pattern).map((e) => ({ beat: e.beat, hits: e.hits })) : [],
          startTimes: this.engine ? noteEvents(this.engine.pattern).map((e) => this.engine!.timeOf(e)) : [],
        }),
      };
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.startLevelAt(this.startIndex);
  }

  /** The market backdrop, graded to an evening festival: dusk tint, glowing lamps, twinkling string lights. */
  private buildEnvironment(): void {
    const bg = this.add.image(W / 2, H / 2, "background").setDepth(DEPTH.bg);
    const scale = Math.max((W + 30) / bg.width, (H + 18) / bg.height);
    bg.setScale(scale);
    this.parallax.add(bg, 10);
    // Image pixel → screen pixel.
    const point = (bx: number, by: number) => ({ x: (bx - bg.width / 2) * scale + W / 2, y: (by - bg.height / 2) * scale + H / 2 });

    // Dusk: multiply tints everything warm-dark (sky turns deep blue-violet), a vignette darkens the corners.
    this.add.rectangle(W / 2, H / 2, W + 40, H + 24, 0xa884a8, 1).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(1);
    this.add.rectangle(W / 2, H / 2, W + 40, H + 24, 0x2a1450, 0.22).setDepth(1);

    for (const [bx, by, size] of [[430, 188, 250], [1090, 188, 250], [362, 432, 140], [1322, 420, 140], [110, 402, 120]] as const) {
      const p = point(bx, by);
      const lamp = this.add.image(p.x, p.y, "spark").setTint(0xffc46b).setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setAlpha(0.85).setDisplaySize(size * scale * 1.3, size * scale * 1.3);
      this.parallax.add(lamp, 10);
      this.lamps.push(lamp);
    }
    // String lights along the bunting.
    const colors = [0xffd166, 0xff8fb1, 0x8fe3ff, 0xb6ff8a, 0xffb36b];
    for (let bx = 200, i = 0; bx <= 1330; bx += 58, i++) {
      const by = 298 - 88 * Math.pow((bx - 760) / 570, 2) + 14;
      const p = point(bx, by);
      const sprite = this.add.image(p.x, p.y, "spark").setTint(colors[i % colors.length]).setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setScale(0.55).setAlpha(0.8);
      this.parallax.add(sprite, 10);
      this.bunting.push({ sprite, phase: i * 0.9 });
    }
  }

  startLevelAt(index: number): void {
    let level = TABLA_LEVELS[index];
    const problems = validateTablaLevel(level);
    if (problems.length > 0) {
      // A malformed level must never crash the game: play a safe one instead.
      console.error(`Invalid level ${level.id}, using a safe fallback:`, problems);
      level = SAFE_FALLBACK_LEVEL;
    }

    this.stopAudioAndCues();
    this.level = level;
    this.levelIndex = index;
    this.buildTablas(level);
    this.detector = new HandZoneHitDetector(level.hit);
    this.engine = new RhythmEngine(level.pattern, { countInBeats: level.countInBeats, windows: level.windows });
    this.score = new RhythmScore(level.scoring, this.carryScore, this.carryStreak);
    this.attempts = 0;
    this.lessonIndex = 0;
    this.lessonHits.clear();
    this.lastLessonHand = null;
    this.phase = "waiting";
    this.handSeen = false;
    this.visibleBefore = false;
    this.lessonText.setVisible(false);
    this.beats.clear();

    this.timer?.remove();
    this.timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickTimer() });

    this.progress = { ...this.blankProgress(level, index), status: "playing", score: this.score.score, streak: this.score.streak };
    this.progress = { ...this.progress, goals: this.goalRows() };
    this.emitProgress();
    analytics.track({ name: "level_started", gameId: TABLA_GAME_ID, levelId: level.id });
  }

  getProgress(): GameProgress {
    return this.progress;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (this.timer) this.timer.paused = paused;
  }

  private buildTablas(level: TablaLevelConfig): void {
    this.tablas.forEach((t) => t.destroy());
    const slots = calculateTablaLayout(level.tablaCount, W);
    this.tablas = slots.map((slot, i) => {
      const skin = TABLA_SKINS[i % TABLA_SKINS.length];
      // The drum is placed so its playing face lands on FACE_Y.
      const probe = this.textures.get(`tabla-${skin.id}`).getSourceImage();
      const height = slot.width * (probe.height / probe.width);
      return new TablaView(this, `tabla-${skin.id}`, slot.x, FACE_Y + height * 0.29, slot.width, skin.glow, DEPTH.tabla + i * 0.01);
    });
    this.zones = this.tablas.map((t, i) => ({ id: i, x: t.faceX, y: t.faceY, radius: t.width * level.hitRadiusScale }));
  }

  // ---- frame loop ---------------------------------------------------------

  update(_time: number, deltaMs: number): void {
    const now = this.audio.now();
    this.trackPerformance(deltaMs);
    this.parallax.update(deltaMs, null);
    this.burst.update(deltaMs);
    this.kid.update(deltaMs);
    this.beats.update(deltaMs);
    this.tablas.forEach((t) => t.update(deltaMs));
    this.animateAmbient(deltaMs);
    if (!this.level || this.paused) return;

    const motion = this.context.motion;
    // One hand: the main hand drives everything (as "right"); two hands: left and right independently.
    const samples =
      TABLA_INPUT.hands === 2
        ? [this.sampleFor("left", motion.hand("left")), this.sampleFor("right", motion.hand("right"))]
        : [this.sampleFor("right", motion.hand("primary")), this.sampleFor("left", NO_HAND)];
    this.updateCursors(samples);

    const anyVisible = samples.some((s) => s.visible);
    if (this.progress.status === "playing") {
      if (anyVisible) {
        if (!this.handSeen) {
          this.handSeen = true;
          this.progress = { ...this.progress, waitingForHand: false };
          this.beginLevel(now);
        } else if (!this.visibleBefore) analytics.track({ name: "tracking_recovered", gameId: TABLA_GAME_ID });
        if (!this.visibleBefore) this.audio.playSfx("handDetected");
      } else if (this.visibleBefore && this.handSeen) analytics.track({ name: "tracking_lost", gameId: TABLA_GAME_ID });
      this.visibleBefore = anyVisible;
    }
    if (this.progress.status !== "playing" || !this.handSeen) {
      this.emitProgress();
      return;
    }

    // Hits: a hand entering (or tapping) a tabla zone. One hand going missing never stops the other.
    const hits = this.detector.update(samples, this.zones, now);
    for (const hit of hits) this.onHit(hit, now);

    switch (this.phase) {
      case "demo":
        this.updateDemo(now);
        break;
      case "yourTurn":
        if (now >= this.phaseUntil) this.beginPlay(now);
        break;
      case "play":
        this.updatePlay(now);
        break;
      case "retry":
        if (now >= this.phaseUntil) this.beginDemo(now);
        break;
      default:
        break;
    }
    this.emitProgress();
  }

  private sampleFor(hand: ZoneHand, state: ReturnType<GameContext["motion"]["hand"]>): HandSample {
    const p = toScreen(state.position.x, state.position.y);
    return { hand, visible: state.visible, x: p.x, y: p.y, speed: state.speed, vx: state.velocity.x, vy: state.velocity.y, confidence: state.confidence };
  }

  private updateCursors(samples: HandSample[]): void {
    const training = this.level?.kind === "training";
    for (const s of samples) {
      const cursor = this.cursors[s.hand];
      cursor.setVisible(s.visible).setPosition(s.x, s.y);
      cursor.setAlpha(training ? 0.95 : 0.6).setScale(training ? 0.95 : 0.72);
      // A light trail while the hand is moving quickly — pooled sparks, not a particle flood.
      if (s.visible && s.speed > 0.7 && this.time.now - this.trailAt > 55) {
        this.trailAt = this.time.now;
        this.burst.emit(s.x, s.y, { count: 1, tint: s.hand === "left" ? 0x9fdcff : 0xffc78a, speed: [5, 25], life: [0.25, 0.45], scale: [0.25, 0.4], endScale: 0 });
      }
    }
  }

  // ---- level flow ---------------------------------------------------------

  /** First hand seen: training starts with lessons, every other level with the demonstration. */
  private beginLevel(now: number): void {
    this.audio.startDrone();
    if (this.level!.lesson?.length) this.beginLesson();
    else this.beginDemo(now);
  }

  private beginLesson(): void {
    this.phase = "lesson";
    this.lessonHits.clear();
    this.showLessonStep();
  }

  private showLessonStep(): void {
    const step = this.level!.lesson![this.lessonIndex];
    this.tablas.forEach((t) => t.clearActive());
    step.targets.forEach((i) => this.tablas[i].setActive(60_000));
    this.lessonText.setText(step.text).setVisible(true);
    this.progress = { ...this.progress, hint: step.hint, holdProgress: this.lessonIndex / (this.level!.lesson!.length + 1) };
  }

  /** The system plays the pattern: ticks, then each event's tablas glow exactly as their sound is heard. */
  private beginDemo(now: number): void {
    const engine = this.engine!;
    this.phase = "demo";
    this.tablas.forEach((t) => {
      t.clearActive();
      t.setHint(0);
    });
    this.lessonText.setText("Listen carefully!").setVisible(true);
    this.progress = { ...this.progress, hint: "Listen to the rhythm", feedback: null, holdProgress: 0 };
    this.kid.machine.reset();

    const cues = engine.startDemo(now + 0.7);
    this.scheduleAudio(cues);
  }

  private updateDemo(now: number): void {
    const tick = this.engine!.update(now);
    for (const cue of tick.cues) this.fireCue(cue, true);
    if (tick.finished) {
      this.phase = "yourTurn";
      this.phaseUntil = now + 0.9;
      this.lessonText.setText("Your turn!").setVisible(true);
      this.progress = { ...this.progress, hint: this.level!.hint };
    }
  }

  private beginPlay(now: number): void {
    const engine = this.engine!;
    this.phase = "play";
    this.lessonText.setVisible(false);
    this.tablas.forEach((t) => t.clearActive());
    this.detector.reset();
    const cues = engine.startPlayer(now + 0.25);
    // Only ticks + bar chimes are scheduled; the notes are the child's to play.
    this.scheduleAudio(cues);
    this.progress = { ...this.progress, hint: this.level!.hint, holdProgress: 0 };
  }

  private updatePlay(now: number): void {
    const engine = this.engine!;
    const tick = engine.update(now);
    for (const cue of tick.cues) this.fireCue(cue, false);

    for (const result of tick.expired) this.onResult(result);
    this.updateHints(now);

    if (tick.finished && this.phase === "play") this.finishRound(now);
  }

  /** Faint glow on the drum that is due next (early levels only) — a hint, never the whole pattern. */
  private updateHints(now: number): void {
    const level = this.level!;
    const next = level.showNextBeat ? this.engine!.nextOpen() : null;
    const soon = next && next.time - now < this.engine!.clock.beatDuration * 1.2 && next.time - now > -0.05;
    this.tablas.forEach((t, i) => t.setHint(soon && next!.tablas.includes(i) ? 1 : 0));
  }

  private finishRound(now: number): void {
    const level = this.level!;
    const engine = this.engine!;
    const results = engine.results();
    const played = results.filter((r) => r.grade !== "miss").length;
    const accuracy = results.length === 0 ? 0 : played / results.length;
    this.attempts += 1;
    this.tablas.forEach((t) => t.setHint(0));

    // After the allowed tries a level moves on anyway — but only if the child really played something.
    // A hand resting on a drum (or nobody playing at all) never wins a level.
    if (accuracy >= level.passRatio || (this.attempts >= level.maxAttempts && played > 0)) {
      this.phase = "complete";
      this.completeLevel(accuracy, now);
      return;
    }
    // Not quite — listen again, no penalty.
    this.phase = "retry";
    this.phaseUntil = now + 1.4;
    const message = played === 0 ? "Touch the glowing drum!" : "Let’s listen again!";
    this.lessonText.setText(message).setVisible(true);
    this.flashMessage(message, 1600);
    this.audio.playSfx("encourage");
    // A retry starts from a clean score for this attempt's notes.
    this.score = new RhythmScore(level.scoring, this.carryScore, this.carryStreak);
    this.progress = { ...this.progress, score: this.score.score, streak: this.score.streak, goals: this.goalRows(), holdProgress: 0 };
  }

  private completeLevel(accuracy: number, now: number): void {
    const level = this.level!;
    const isTraining = level.kind === "training";
    const isLast = this.levelIndex === TABLA_LEVELS.length - 1;
    this.timer?.remove();
    this.lessonText.setVisible(false);

    // A strong closing note: bass + chime together.
    this.audio.scheduleSample("dhin", now + 0.05, { gain: 1, group: GROUP });
    this.audio.scheduleSample("ga", now + 0.05, { gain: 0.9, group: GROUP });
    this.audio.scheduleClick(now + 0.05, { bell: true, group: GROUP });
    this.audio.playSfx(isLast ? "levelComplete" : "success");
    this.kid.machine.enter(isLast ? "celebrate" : "happy");
    this.celebrate(isLast);

    if (!isTraining) this.score.add(40 + this.progress.timeRemainingSeconds);
    this.carryScore = this.score.score;
    this.carryStreak = this.score.streak;

    const perfectRatio = this.score.notes === 0 ? 0 : this.score.perfect / Math.max(1, this.engine!.noteCount);
    const stars = isTraining ? 3 : accuracy >= 0.85 && perfectRatio >= 0.4 ? 3 : accuracy >= 0.7 ? 2 : 1;
    this.progress = {
      ...this.progress,
      status: "success",
      holdProgress: 1,
      score: this.score.score,
      streak: this.score.streak,
      stars,
      wrongTries: this.score.misses,
      feedback: isLast ? "Rhythm Master!" : isTraining ? "Great rhythm!" : "Great rhythm!",
      goals: this.goalRows(),
    };
    this.emitProgress();
    analytics.track({ name: "level_completed", gameId: TABLA_GAME_ID, levelId: level.id, stars, score: this.score.score });
  }

  // ---- audio + cues ---------------------------------------------------------

  /** Everything is scheduled on the audio clock: ticks, bar chimes and (in the demo) the notes themselves. */
  private scheduleAudio(cues: RhythmCue[]): void {
    const engine = this.engine!;
    const beatsPerBar = engine.pattern.beatsPerBar;
    for (const cue of cues) {
      if (cue.kind === "tick") {
        this.audio.scheduleClick(cue.time, { accent: cue.accent, group: GROUP });
      } else if (cue.event) {
        for (const hit of cue.event.hits) this.audio.scheduleSample(TABLA_STROKES[hit.tabla], cue.time, { group: GROUP, gain: cue.event.hits.length > 1 ? 0.85 : 1 });
        if (cue.beat % beatsPerBar === 0) this.audio.scheduleClick(cue.time, { bell: true, group: GROUP });
      }
    }
  }

  /** A cue has reached its time: pulse the beat dot, and (demo) light the drum. */
  private fireCue(cue: RhythmCue, demo: boolean): void {
    const beatsPerBar = this.engine!.pattern.beatsPerBar;
    const inBar = ((Math.round(cue.beat) % beatsPerBar) + beatsPerBar) % beatsPerBar;
    this.beats.pulse(inBar);
    this.beatLight.setAlpha(0.07);
    this.tweens.add({ targets: this.beatLight, alpha: 0, duration: 380 });

    if (cue.kind === "event" && cue.event && demo) {
      const beat = this.engine!.clock.beatDuration;
      for (const hit of cue.event.hits) {
        const view = this.tablas[hit.tabla];
        view.setActive(beat * 650);
        view.hit("good");
        this.burst.emit(view.faceX, view.faceY, { count: 6, tint: [0xffe27a, 0xffffff], speed: [60, 190], gravity: 120, life: [0.4, 0.8], scale: [0.25, 0.5] });
      }
    }
  }

  private stopAudioAndCues(): void {
    // Leaving a level (or replaying it) must be silent: cancel everything it scheduled.
    this.audio.cancelScheduled(GROUP);
    this.engine?.stop();
  }

  // ---- hits -----------------------------------------------------------------

  private onHit(hit: ZoneHit, now: number): void {
    const view = this.tablas[hit.zone];
    if (!view) return;
    // Sound first, with the lowest delay we can: play it right now on the audio clock.
    this.audio.scheduleSample(TABLA_STROKES[hit.zone], now, { group: GROUP });
    analytics.track({ name: "correct_answer", gameId: TABLA_GAME_ID, levelId: this.level!.id });

    if (this.phase === "lesson") {
      view.hit("neutral");
      this.onLessonHit(hit, now);
      return;
    }
    if (this.phase !== "play") {
      view.hit("neutral");
      return;
    }

    const outcome = this.engine!.hit({ hand: hit.hand, tabla: hit.zone, time: now });
    if (outcome.kind === "stray") {
      view.hit("neutral");
      // Gentle nudge at most every few seconds, never a penalty.
      if (this.time.now / 1000 - this.strayHintAt > 4) {
        this.strayHintAt = this.time.now / 1000;
        this.flashMessage("Try the glowing one!", 1500);
      }
      return;
    }
    const grade = outcome.grade === "miss" ? "near" : outcome.grade;
    view.hit(grade as HitGrade);
    this.hitBurst(view, grade as HitGrade);
    const text = GRADE_TEXT[grade as Exclude<Grade, "miss">];
    this.popups.show(view.faceX, view.faceY - 70, text.text, text.color);
    if (outcome.result) this.onResult(outcome.result);
  }

  /** An event is finished (played, or expired unplayed): score it and show the outcome. */
  private onResult(result: EventResult): void {
    const level = this.level!;
    const notes = noteEvents(level.pattern);
    const event = notes[result.eventIndex];
    const points = this.score.apply(result);

    if (result.grade === "miss") {
      event.hits.forEach((h) => this.tablas[h.tabla]?.miss());
      this.flashMessage("Try the next beat!", 1400);
    } else {
      const x = event.hits.reduce((sum, h) => sum + (this.tablas[h.tabla]?.faceX ?? W / 2), 0) / event.hits.length;
      if (points > 0 && level.kind === "story") this.popups.show(x, FACE_Y - 130, `+${points}`, result.twoHands ? "#ffb347" : "#ffe066");
      if (result.twoHands) this.twoHandFlourish(event.hits.map((h) => h.tabla));
      this.kid.machine.enter("happy");
      if (this.score.streak > 0 && this.score.streak % 5 === 0) this.audio.playSfx("streakUp");
    }
    this.progress = {
      ...this.progress,
      score: this.score.score,
      streak: this.score.streak,
      wrongTries: this.score.misses,
      holdProgress: Math.min(1, this.engine!.results().length / Math.max(1, this.engine!.noteCount)),
      goals: this.goalRows(),
    };
  }

  private onLessonHit(hit: ZoneHit, now: number): void {
    const level = this.level!;
    const step = level.lesson![this.lessonIndex];
    if (!step.targets.includes(hit.zone)) return;
    let done = false;

    if (step.rule === "any") done = true;
    else if (step.rule === "otherHand") done = this.lastLessonHand === null || hit.hand !== this.lastLessonHand;
    else {
      this.lessonHits.set(hit.zone, { hand: hit.hand, time: now });
      const hits = step.targets.map((t) => this.lessonHits.get(t));
      done = hits.every((h) => h && now - h.time < 2.2) && new Set(hits.map((h) => h!.hand)).size === hits.length;
      if (!done && hits.filter(Boolean).length < step.targets.length) this.flashMessage("Now the other tabla!", 1400);
    }
    if (!done) {
      if (step.rule === "otherHand") this.flashMessage("Try your other hand!", 1600);
      return;
    }

    this.lastLessonHand = hit.hand;
    this.lessonHits.clear();
    this.audio.playSfx("correct");
    step.targets.forEach((i) => {
      this.tablas[i].clearActive();
      this.hitBurst(this.tablas[i], "perfect");
    });
    this.flashMessage("Great!", 1200);
    this.lessonIndex += 1;
    if (this.lessonIndex >= level.lesson!.length) {
      this.progress = { ...this.progress, holdProgress: level.lesson!.length / (level.lesson!.length + 1) };
      // Lessons done — now the same demonstration the real levels use.
      this.phase = "lessonPause";
      this.lessonText.setText("Now copy the rhythm!");
      this.tablas.forEach((t) => t.clearActive());
      this.time.delayedCall(1100, () => {
        if (this.phase === "lessonPause") this.beginDemo(this.audio.now());
      });
    } else {
      this.phase = "lessonPause";
      this.time.delayedCall(800, () => {
        if (this.phase === "lessonPause") {
          this.phase = "lesson";
          this.showLessonStep();
        }
      });
    }
  }

  // ---- effects --------------------------------------------------------------

  private hitBurst(view: TablaView, grade: HitGrade): void {
    const perfect = grade === "perfect";
    this.burst.emit(view.faceX, view.faceY, {
      count: perfect ? 16 : 8,
      tint: perfect ? [0xffe27a, 0xffffff, 0xffb347] : [0xfff0b0, 0xffffff],
      speed: [70, perfect ? 280 : 200],
      gravity: 140,
      life: [0.5, 1],
      scale: [0.25, perfect ? 0.6 : 0.45],
    });
  }

  /** Both hands together: stronger glow, twin ripples, symmetrical sparks, a bonus SFX. */
  private twoHandFlourish(tablaIndexes: number[]): void {
    this.audio.playSfx("success");
    tablaIndexes.forEach((i) => {
      const view = this.tablas[i];
      view.hit("perfect");
      this.burst.emit(view.faceX, view.faceY, { count: 22, tint: [0xffe27a, 0xff9ecb, 0x8fe3ff, 0xffffff], speed: [90, 320], gravity: 100, life: [0.6, 1.2] });
    });
  }

  private celebrate(big: boolean): void {
    const rounds = big ? 8 : 3;
    for (let i = 0; i < rounds; i++) {
      this.time.delayedCall(i * 240, () => {
        this.burst.emit(Phaser.Math.Between(W * 0.2, W * 0.8), Phaser.Math.Between(150, 330), {
          count: big ? 18 : 12,
          tint: [0xffe27a, 0xff9ecb, 0x8fe3ff, 0xb6ff8a, 0xffffff],
          speed: [60, 220],
          gravity: 90,
          life: [1.1, 2],
        });
      });
    }
    this.tablas.forEach((t, i) => this.time.delayedCall(i * 120, () => t.hit("perfect")));
  }

  private animateAmbient(deltaMs: number): void {
    const t = this.time.now / 1000;
    for (const b of this.bunting) b.sprite.setAlpha(0.55 + 0.35 * Math.sin(t * 2.2 + b.phase));
    this.lamps.forEach((lamp, i) => lamp.setAlpha(0.75 + 0.12 * Math.sin(t * 1.4 + i * 1.7)));
    this.ambient += deltaMs;
    if (this.ambient > 650) {
      this.ambient = 0;
      this.burst.emit(Phaser.Math.Between(60, W - 60), Phaser.Math.Between(120, 520), {
        count: 1,
        tint: 0xffd998,
        speed: [6, 16],
        angle: [-Math.PI * 0.8, -Math.PI * 0.2],
        life: [3, 5],
        scale: [0.18, 0.32],
        endScale: 0.05,
      });
    }
  }

  // ---- helpers ---------------------------------------------------------------

  private goalRows(): NonNullable<GameProgress["goals"]> {
    const level = this.level!;
    const events = noteEvents(level.pattern);
    const rows: NonNullable<GameProgress["goals"]> = [];
    for (const metric of level.goals) {
      if (metric === "notes") rows.push({ id: "move", label: "Play Notes", value: this.score.notes, target: events.length });
      else if (metric === "perfect") rows.push({ id: "brain", label: "Perfect Hits", value: this.score.perfect, target: events.length });
      else rows.push({ id: "streak", label: "Two Hands", value: this.score.twoHandHits, target: Math.max(1, events.filter((e) => e.hits.length > 1).length) });
    }
    return rows;
  }

  private flashMessage(message: string | null, ms: number): void {
    this.progress = { ...this.progress, feedback: message };
    if (message && ms > 0) {
      this.time.delayedCall(ms, () => {
        if (this.progress.feedback === message) {
          this.progress = { ...this.progress, feedback: null };
          this.emitProgress();
        }
      });
    }
  }

  /** The clock only runs while the child is actually playing their turn, and out of view it stops. */
  private tickTimer(): void {
    const level = this.level;
    if (!level?.timed || this.progress.status !== "playing" || !this.handSeen || this.paused || this.phase !== "play") return;
    const remaining = Math.max(0, this.progress.timeRemainingSeconds - 1);
    this.progress = { ...this.progress, timeRemainingSeconds: remaining };
    if (remaining > 0 && remaining <= 5) this.audio.playSfx("timerWarning");
    if (remaining === 0) {
      this.timer?.remove();
      this.stopAudioAndCues();
      this.audio.playSfx("fail");
      analytics.track({ name: "level_failed", gameId: TABLA_GAME_ID, levelId: level.id });
      this.progress = { ...this.progress, status: "failed", feedback: "Nice try! Let’s go again." };
    }
    this.emitProgress();
  }

  private trackPerformance(deltaMs: number): void {
    this.fpsAverage = this.fpsAverage * 0.95 + (1000 / Math.max(deltaMs, 1)) * 0.05;
    this.lowFpsFor = this.fpsAverage < 42 ? this.lowFpsFor + deltaMs : Math.max(0, this.lowFpsFor - deltaMs);
    this.burst.quality = this.lowFpsFor > 2500 ? 0.4 : 1;
  }

  private blankProgress(level: TablaLevelConfig, index: number): GameProgress {
    return {
      status: "idle",
      holdProgress: 0,
      score: this.carryScore ?? 0,
      streak: this.carryStreak ?? 0,
      timeRemainingSeconds: level.timeLimitSeconds,
      levelId: level.id,
      levelTitle: level.title,
      headline: level.headline,
      timed: level.timed,
      tutorial: level.kind === "training",
      levelIndex: index,
      totalLevels: TABLA_LEVELS.length,
      hint: level.hint,
      wrongTries: 0,
      stars: 0,
      feedback: null,
      waitingForHand: true,
    };
  }

  private emitProgress(): void {
    this.onProgress(this.progress);
  }

  private cleanup(): void {
    this.timer?.remove();
    this.stopAudioAndCues();
    this.audio.stopDrone();
    this.tablas.forEach((t) => t.destroy());
    this.tablas = [];
    this.beats.destroy();
    this.burst.destroy();
    this.popups.destroy();
    this.kid.destroy();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
