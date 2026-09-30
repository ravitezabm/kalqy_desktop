import Phaser from "phaser";
import type { GameContext, GameProgress } from "../../engine/core/KalqyGame";
import type { AudioManager } from "../../engine/audio/AudioManager";
import type { StoryScene } from "../../engine/game/StoryGame";
import { ParallaxSystem } from "../../engine/vfx/ParallaxSystem";
import { ParticleBurst } from "../../engine/vfx/ParticleBurst";
import { WaterStream } from "../../engine/vfx/WaterStream";
import { BodyLaneController } from "../../engine/mechanics/BodyLaneController";
import { TargetSystem, type HoldTarget } from "../../engine/mechanics/TargetSystem";
import { analytics } from "../../features/games/services/analytics";
import { RIVER_BODY_CONFIG } from "./bodyConfig";
import { RIVER_LEVELS, validateRiverLevel, type RiverLevelConfig, type RiverTargetConfig, type TrainingStep } from "./config/levels.config";
import { RiverEnvironment } from "./RiverEnvironment";
import { CloudEntity } from "./entities/CloudEntity";
import { FishAvatar } from "./entities/FishAvatar";
import { RiverTarget } from "./entities/RiverTarget";
import { LeanCard } from "./entities/LeanCard";

export const RIVER_GAME_ID = "river-adventure";

const CLOUD_Y = 0.25;
const FISH_Y = 0.76;
/** The HUD sits over the left/right edges, so play happens in the middle 66%. */
const LANE_MARGIN = 0.17;
const TRAINING_ZONES: Record<TrainingStep, (position: number) => boolean> = {
  left: (p) => p < 0.28,
  center: (p) => Math.abs(p - 0.5) < 0.1,
  right: (p) => p > 0.72,
};
const TRAINING_X: Record<TrainingStep, number> = { left: 0.27, center: 0.5, right: 0.73 };
const TRAINING_HINT: Record<TrainingStep, string> = {
  left: "Lean or step to your left",
  center: "Now come back to the middle",
  right: "Lean or step to your right",
};

interface TargetView extends HoldTarget {
  view: RiverTarget;
  config: RiverTargetConfig;
}

/**
 * The River Adventure scene. Reads only `context.motion.body()`. One scene
 * serves the tutorial and all five story levels — `startLevelAt` swaps the
 * level entities without reloading Phaser. Everything about a level (what
 * is on screen, what is correct, what changes) comes from RIVER_LEVELS;
 * the only branching here is training vs. play.
 */
export class RiverGame extends Phaser.Scene implements StoryScene {
  private parallax = new ParallaxSystem();
  private env!: RiverEnvironment;
  private cloud!: CloudEntity;
  private fish!: FishAvatar;
  private stream!: WaterStream;
  private burst!: ParticleBurst;
  private guide!: Phaser.GameObjects.Graphics;
  private arrows!: Phaser.GameObjects.Graphics;
  private lessonText!: Phaser.GameObjects.Text;
  private leanCards: LeanCard[] = [];
  private lane = new BodyLaneController();

  private level: RiverLevelConfig | null = null;
  private levelIndex = 0;
  private views: TargetView[] = [];
  private props = new Map<string, RiverTarget>();
  private targetSystem: TargetSystem<TargetView> | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;

  private handSeen = false;
  private bodyWasVisible = false;
  private paused = false;
  private frozen = false;
  private frozenCloudX = 0;
  private holdWasActive = false;

  private trainingStep = 0;
  private trainingHoldMs = 0;

  private score = 0;
  private streak = 0;
  private progress: GameProgress;

  private fpsAverage = 60;
  private lowFpsFor = 0;
  private quality = 1;

  constructor(
    private readonly context: GameContext,
    private readonly audio: AudioManager,
    private readonly onProgress: (progress: GameProgress) => void,
    private readonly startIndex: number
  ) {
    super("RiverGame");
    this.progress = this.blankProgress(RIVER_LEVELS[startIndex], startIndex);
  }

  create(): void {
    const { width, height } = this.scale;
    this.env = new RiverEnvironment(this, this.parallax);

    this.fish = new FishAvatar(this, width / 2, height * FISH_Y).setDepth(8);
    this.cloud = new CloudEntity(this, width / 2, height * CLOUD_Y).setDepth(40);
    this.stream = new WaterStream(this, { depth: 41, color: 0x6fc8ff, width: 44 });
    this.burst = new ParticleBurst(this, 46);
    this.guide = this.add.graphics().setDepth(35);
    this.arrows = this.add.graphics().setDepth(34);
    this.lessonText = this.add
      .text(width / 2, height * 0.5, "", {
        fontFamily: '"Baloo 2", "Nunito", system-ui, sans-serif',
        fontSize: "60px",
        fontStyle: "800",
        color: "#ffffff",
        stroke: "#12324f",
        strokeThickness: 10,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(36)
      .setVisible(false);
    // Lean cards teach the movement, so they only show during training.
    this.leanCards = [
      new LeanCard(this, width * 0.2, height * 0.88, "left").setDepth(33),
      new LeanCard(this, width * 0.8, height * 0.88, "right").setDepth(33),
    ];

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.startLevelAt(this.startIndex);
  }

  startLevelAt(index: number): void {
    const level = RIVER_LEVELS[index];
    const problems = validateRiverLevel(level);
    if (problems.length > 0) {
      // A malformed config must never crash the game.
      console.error(`Invalid level ${level.id}:`, problems);
      return;
    }

    this.level = level;
    this.levelIndex = index;
    const { width, height } = this.scale;

    // Tear down the previous level's entities, then build this one's.
    this.views.forEach((v) => {
      this.parallax.remove(v.view);
      v.view.destroy();
    });
    this.props.forEach((prop) => {
      this.parallax.remove(prop);
      prop.destroy();
    });
    this.props.clear();

    const radius = level.mechanic.alignmentTolerance * width;
    this.views = level.targets.map((config) => {
      const view = new RiverTarget(this, config, config.visual, config.x * width, config.y * height, true).setDepth(10 + config.y * 10);
      this.parallax.add(view, 26);
      return { id: config.id, correct: config.correct, radius, view, config };
    });
    for (const prop of level.props) {
      const view = new RiverTarget(
        this,
        { id: prop.id, visual: prop.visual, x: prop.x, y: prop.y, scale: prop.scale, correct: false },
        prop.visual,
        prop.x * width,
        prop.y * height
      ).setDepth(9);
      this.parallax.add(view, 20);
      this.props.set(prop.id, view);
    }

    this.targetSystem = level.kind === "training" ? null : new TargetSystem(this.views, level.mechanic.holdDurationMs);
    this.lane = new BodyLaneController({
      deadZone: RIVER_BODY_CONFIG.deadZone,
      movementSensitivity: level.mechanic.movementSensitivity,
    });
    this.lane.reset();

    this.frozen = false;
    this.handSeen = false;
    this.holdWasActive = false;
    this.trainingStep = 0;
    this.trainingHoldMs = 0;
    this.guide.clear();
    this.lessonText.setVisible(level.kind === "training");
    this.stream.setFlowing(false);
    this.cloud.setMode("idle");
    this.cloud.x = width / 2;
    this.fish.machine.reset();
    this.env.setSmoke(level.smoky ? 1 : 0, 0);

    this.timer?.remove();
    this.timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickTimer() });

    this.progress = { ...this.blankProgress(level, index), status: "playing", score: this.score, streak: this.streak };
    if (level.kind === "training") this.progress.hint = TRAINING_HINT[level.mechanic.trainingSteps![0]];
    this.emitProgress();
    analytics.track({ name: "level_started", gameId: RIVER_GAME_ID, levelId: level.id });
  }

  getProgress(): GameProgress {
    return this.progress;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (this.timer) this.timer.paused = paused;
    if (paused) this.stream.setFlowing(false);
  }

  update(_time: number, deltaMs: number): void {
    const { width } = this.scale;
    const body = this.context.motion.body();
    this.trackPerformance(deltaMs);

    this.parallax.update(deltaMs, body.visible ? { x: (body.center().x - 0.5) * 2, y: 0 } : null);
    this.env.update(deltaMs);
    this.burst.update(deltaMs);
    this.stream.update(deltaMs);
    this.targetViews().forEach((view) => view.update(deltaMs / 1000, 0));

    if (!this.level || this.paused) return;

    const position = this.lane.update(body, deltaMs);
    const cloudX = this.frozen ? this.frozenCloudX : width * (LANE_MARGIN + position * (1 - LANE_MARGIN * 2));
    this.cloud.followTo(cloudX, deltaMs);
    this.fish.followTo(cloudX, deltaMs);

    this.drawSteeringHints(cloudX, position);

    if (this.progress.status !== "playing") return;

    if (body.visible) {
      if (!this.handSeen) {
        this.handSeen = true;
        this.progress = { ...this.progress, waitingForHand: false };
      } else if (!this.bodyWasVisible) {
        analytics.track({ name: "tracking_recovered", gameId: RIVER_GAME_ID });
      }
      if (!this.bodyWasVisible) this.audio.playSfx("handDetected");
    } else if (this.bodyWasVisible && this.handSeen) {
      analytics.track({ name: "tracking_lost", gameId: RIVER_GAME_ID });
    }
    this.bodyWasVisible = body.visible;

    // Nothing happens until the child is in view; leaving view just pauses play gently.
    const active = this.handSeen && body.visible;
    if (!active) {
      this.stream.setFlowing(false);
      this.cloud.setMode("idle");
      this.emitProgress();
      return;
    }

    if (this.level.kind === "training") this.updateTraining(deltaMs, position);
    else this.updatePlay(deltaMs);
  }

  /** The dashed left/right arrows under the cloud, and the lean cards lighting up with the child's lean. */
  private drawSteeringHints(cloudX: number, position: number): void {
    const { width, height } = this.scale;
    const g = this.arrows;
    g.clear();
    const showing = this.level?.kind === "story" && this.progress.status === "playing" && this.progress.holdProgress < 0.05;
    this.leanCards.forEach((card) => {
      card.setVisible(this.level?.kind === "training");
      card.setLit(card.side === "left" ? (position < 0.3 ? 1 : 0) : position > 0.7 ? 1 : 0);
    });
    if (!showing) return;

    const y = height * 0.29;
    const half = width * 0.2 + 120;
    const cx = cloudX;
    const phase = (this.time.now / 700) % 1;
    const pulse = 0.55 + 0.25 * Math.sin(this.time.now / 300);
    for (const dir of [-1, 1]) {
      const from = cx + dir * 132;
      const to = Phaser.Math.Clamp(cx + dir * half, width * 0.05, width * 0.95);
      const dashes = 5;
      for (let i = 0; i < dashes; i++) {
        const t0 = (i + phase) / dashes;
        const t1 = Math.min(1, t0 + 0.5 / dashes);
        g.lineStyle(9, 0xfff4c8, pulse * (1 - t0 * 0.5));
        g.lineBetween(Phaser.Math.Linear(from, to, t0), y, Phaser.Math.Linear(from, to, t1), y);
      }
      g.fillStyle(0xfff4c8, pulse);
      g.fillTriangle(to + dir * 30, y, to - dir * 6, y - 22, to - dir * 6, y + 22);
    }
  }

  private updatePlay(deltaMs: number): void {
    const system = this.targetSystem;
    if (!system) return;

    // Rain only falls when the cloud is over the RIGHT answer. Over a wrong
    // choice (or nothing) the cloud just floats — no free hints for guessing.
    const correct = this.views.find((v) => v.correct)!;
    const overCorrect = Math.abs(this.cloud.x - correct.view.x) <= correct.radius;
    this.stream.setEndpoints(this.cloud.x, this.cloud.rainOriginY, correct.view.headX, correct.view.headY);
    this.stream.setFlowing(overCorrect);
    this.cloud.setMode(overCorrect ? "raining" : "idle");

    const result = system.update((t) => Math.abs(this.cloud.x - t.view.x), deltaMs);
    this.views.forEach((t) => t.view.update(deltaMs / 1000, result.byId.get(t.id) ?? 0));

    const holding = result.progress > 0;
    if (holding && !this.holdWasActive) this.audio.playSfx("holdStart");
    this.holdWasActive = holding;

    this.progress = { ...this.progress, holdProgress: result.progress };
    if (result.completed) {
      const view = this.views.find((v) => v.id === result.completed!.id)!;
      if (result.completed.correct) this.handleSuccess(view);
      else this.handleWrong(view);
    } else {
      this.emitProgress();
    }
  }

  private updateTraining(deltaMs: number, position: number): void {
    const steps = this.level!.mechanic.trainingSteps!;
    const step = steps[this.trainingStep];
    const inZone = TRAINING_ZONES[step](position);

    this.trainingHoldMs = inZone ? this.trainingHoldMs + deltaMs : Math.max(0, this.trainingHoldMs - deltaMs * 2);
    const holdProgress = Math.min(1, this.trainingHoldMs / this.level!.mechanic.holdDurationMs);
    this.stream.setFlowing(false);
    this.drawTrainingGuide(step, inZone, holdProgress);

    this.progress = { ...this.progress, holdProgress };
    if (holdProgress < 1) return this.emitProgress();

    // Step done.
    this.trainingHoldMs = 0;
    this.audio.playSfx("correct");
    this.burst.emit(this.cloud.x, this.cloud.y, { count: 18, tint: [0x9be7ff, 0xffffff, 0xfff2a8], speed: [80, 240] });
    this.trainingStep += 1;

    if (this.trainingStep >= steps.length) {
      this.guide.clear();
      this.lessonText.setVisible(false);
      this.finishLevel("Great job! You’re ready!");
      return;
    }
    this.progress = {
      ...this.progress,
      holdProgress: 0,
      hint: TRAINING_HINT[steps[this.trainingStep]],
      feedback: "Great!",
    };
    this.time.delayedCall(1200, () => {
      if (this.progress.feedback === "Great!") {
        this.progress = { ...this.progress, feedback: null };
        this.emitProgress();
      }
    });
    this.emitProgress();
  }

  /**
   * The move-left/right lesson: a glowing ghost body demonstrates the lean,
   * a big arrow and a "move the cloud here" ring show where to go, the
   * instruction is spelled out in large text, and dots show how far along
   * the lesson is.
   */
  private drawTrainingGuide(step: TrainingStep, inZone: boolean, holdProgress: number): void {
    const { width, height } = this.scale;
    const g = this.guide;
    g.clear();
    const steps = this.level!.mechanic.trainingSteps!;
    const laneX = TRAINING_X[step] * width;
    const homeX = width / 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 260);
    const color = inZone ? 0x8dff9a : 0x6fd6ff;

    // Demonstration loop: the ghost leans from the middle out to the lane, holds, repeats.
    const cycle = (this.time.now / 2200) % 1;
    const move = Phaser.Math.Easing.Sine.InOut(Math.min(1, cycle / 0.55));
    const ghostX = inZone ? laneX : Phaser.Math.Linear(step === "center" ? laneX : homeX, laneX, step === "center" ? 1 : move);
    const dir = step === "left" ? -1 : step === "right" ? 1 : 0;
    const lean = dir * 0.32 * (inZone ? 1 : move);
    const gy = height * 0.74;

    // Goal ring where the cloud should end up.
    const cloudY = this.cloud.y;
    g.lineStyle(8, color, 0.5 + 0.4 * pulse);
    g.strokeCircle(laneX, cloudY, 92 + pulse * 8);
    g.fillStyle(color, 0.1 + 0.08 * pulse);
    g.fillCircle(laneX, cloudY, 92);

    // Ghost body (thick, bright, outlined) leaning toward the lane.
    const topX = ghostX + Math.sin(lean) * 90;
    const topY = gy - Math.cos(lean) * 90;
    const headX = topX + Math.sin(lean) * 36;
    const headY = topY - Math.cos(lean) * 36;
    g.lineStyle(42, 0xffffff, 0.35);
    g.lineBetween(ghostX, gy, topX, topY);
    g.lineStyle(34, color, 0.6 + 0.15 * pulse);
    g.lineBetween(ghostX, gy, topX, topY);
    g.lineStyle(22, color, 0.5);
    g.lineBetween(ghostX, gy, ghostX - 28, gy + 66);
    g.lineBetween(ghostX, gy, ghostX + 28, gy + 66);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(headX, headY, 31);
    g.fillStyle(color, 0.75);
    g.fillCircle(headX, headY, 27);

    // Big pulsing arrow beside the ghost.
    if (dir !== 0) {
      const ax = ghostX - dir * 170;
      const ay = gy - 30;
      const nudge = dir * pulse * 22;
      g.lineStyle(20, 0x12324f, 0.5);
      this.arrowShape(g, ax + nudge, ay, dir, 3);
      g.lineStyle(14, 0xffffff, 0.95);
      this.arrowShape(g, ax + nudge, ay, dir, 0);
    }

    // Progress ring around the head while the pose is held.
    if (holdProgress > 0) {
      g.lineStyle(12, 0xffd166, 0.95);
      g.beginPath();
      g.arc(headX, headY, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * holdProgress);
      g.strokePath();
    }

    // Lesson dots: done / current / to do.
    steps.forEach((_, i) => {
      const dx = width / 2 + (i - (steps.length - 1) / 2) * 36;
      const dy = height * 0.4;
      g.fillStyle(i < this.trainingStep ? 0x8dff9a : i === this.trainingStep ? 0xffd166 : 0xffffff, i === this.trainingStep ? 1 : 0.55);
      g.fillCircle(dx, dy, i === this.trainingStep ? 11 + pulse * 3 : 9);
    });

    this.lessonText.setText(
      step === "left" ? "Lean LEFT!" : step === "right" ? "Lean RIGHT!" : "Come back to the MIDDLE"
    );
    this.lessonText.setPosition(width / 2, height * 0.47).setAlpha(0.85 + 0.15 * pulse);
  }

  private arrowShape(g: Phaser.GameObjects.Graphics, x: number, y: number, dir: number, grow: number): void {
    g.lineBetween(x - dir * grow, y, x + dir * (110 + grow), y);
    g.lineBetween(x + dir * 110, y, x + dir * 70, y - 38 - grow);
    g.lineBetween(x + dir * 110, y, x + dir * 70, y + 38 + grow);
  }

  /** A full hold on the wrong choice: gentle shake, a hint, streak reset — never ends the level. */
  private handleWrong(target: TargetView): void {
    target.view.shakeWrong();
    analytics.track({ name: "wrong_match", gameId: RIVER_GAME_ID, levelId: this.progress.levelId });
    this.audio.playSfx("encourage");
    this.cloud.setMode("fail");
    this.fish.machine.enter("fail");
    this.time.delayedCall(1300, () => {
      if (this.progress.status === "playing") this.cloud.setMode("idle");
    });

    const message = target.config.wrongHint ?? "Look carefully!";
    this.streak = 0;
    this.progress = { ...this.progress, holdProgress: 0, wrongTries: this.progress.wrongTries + 1, streak: 0, feedback: message };
    this.time.delayedCall(2600, () => {
      if (this.progress.feedback === message) {
        this.progress = { ...this.progress, feedback: null };
        this.emitProgress();
      }
    });
    this.emitProgress();
  }

  private handleSuccess(target: TargetView): void {
    const effect = target.config.onCorrect!;
    this.frozen = true;
    this.frozenCloudX = this.cloud.x;
    this.cloud.setMode("happy");
    this.fish.machine.enter("success");
    this.audio.playSfx("waterSplash");
    this.audio.playSfx("success");

    // Keep the water flowing onto the target while it transforms.
    this.stream.setEndpoints(this.cloud.x, this.cloud.rainOriginY, target.view.headX, target.view.headY);
    this.stream.setFlowing(true);
    this.time.delayedCall(1800, () => this.stream.setFlowing(false));

    const { x, y } = { x: target.view.headX, y: target.view.headY };
    switch (effect.effect) {
      case "bloom":
        this.time.delayedCall(500, () => {
          this.audio.playSfx("bloom");
          if (effect.swapTo) void target.view.swapTo(effect.swapTo);
          target.view.bounce();
          this.burst.emit(x, y, { count: 40, tint: [0xff8ac1, 0xffffff, 0xfff2a8], speed: [90, 320], gravity: 160, life: [1, 1.8] });
          this.env.flashLight();
        });
        break;
      case "happy":
        this.time.delayedCall(400, () => {
          if (effect.swapTo) void target.view.swapTo(effect.swapTo);
          target.view.bounce();
          this.burst.emit(x, y, { count: 30, tint: [0xfff2a8, 0xffffff, 0x9be7ff], speed: [80, 260], gravity: 120 });
        });
        break;
      case "extinguish":
        this.audio.playSfx("sizzle");
        this.emitSteam(x, y, 22);
        this.time.delayedCall(700, () => {
          if (effect.swapTo) void target.view.swapTo(effect.swapTo);
          this.env.setSmoke(0, 1800);
          this.env.flashLight();
          this.burst.emit(x, y, { count: 34, tint: [0xb6ff8a, 0xffffff, 0xfff2a8], speed: [80, 280], gravity: 100, life: [1, 1.7] });
        });
        break;
      case "pour": {
        // The water choice is right: the pool's water flows onto the fire.
        const fire = [...this.props.values()][0];
        this.stream.setFlowing(false);
        this.time.delayedCall(250, () => {
          this.stream.setEndpoints(target.view.headX, target.view.headY, fire.headX, fire.headY);
          this.stream.setFlowing(true);
          this.audio.playSfx("sizzle");
        });
        this.time.delayedCall(900, () => {
          this.emitSteam(fire.headX, fire.headY, 26);
          void fire.fadeOutAndShrink();
          this.env.flashLight();
        });
        this.time.delayedCall(2100, () => this.stream.setFlowing(false));
        break;
      }
    }

    this.finishLevel(this.level!.successMessage);
  }

  /** Shared ending for training and story levels: stars, score, celebration, progress. */
  private finishLevel(message: string): void {
    const { level } = this;
    if (!level) return;
    this.timer?.remove();
    this.holdWasActive = false;
    const isTraining = level.kind === "training";
    const isLast = this.levelIndex === RIVER_LEVELS.length - 1;

    this.cloud.setMode("happy");
    this.fish.machine.enter(isLast ? "celebrate" : "success");
    this.celebrate(isLast);
    if (isLast) this.audio.playSfx("levelComplete");

    const stars = isTraining ? 3 : this.progress.wrongTries === 0 ? 3 : this.progress.wrongTries <= 2 ? 2 : 1;
    if (!isTraining) {
      this.streak += 1;
      this.score += 100 + this.streak * 10 + this.progress.timeRemainingSeconds;
    }
    this.progress = {
      ...this.progress,
      status: "success",
      holdProgress: 1,
      score: this.score,
      streak: this.streak,
      stars,
      feedback: message,
    };
    this.emitProgress();
    analytics.track({ name: "correct_match", gameId: RIVER_GAME_ID, levelId: level.id });
    analytics.track({ name: "level_completed", gameId: RIVER_GAME_ID, levelId: level.id, stars, score: this.score });
  }

  /** Natural, soft celebration — sparkles, drifting leaves, water glints — never arcade confetti. */
  private celebrate(big: boolean): void {
    const { width } = this.scale;
    const x = this.cloud.x;
    const y = this.cloud.y;
    this.burst.emit(x, y, { count: big ? 60 : 30, tint: [0x9be7ff, 0xffffff, 0xfff2a8], speed: [90, 300], gravity: 90, life: [1, 1.8] });
    this.burst.emit(x, y, {
      texture: "droplet",
      count: 16,
      tint: 0x9be7ff,
      speed: [60, 200],
      gravity: 420,
      angle: [-Math.PI * 0.9, -Math.PI * 0.1],
      additive: false,
      scale: [0.7, 1.1],
      life: [0.9, 1.4],
    });
    if (big) {
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(i * 250, () => {
          this.burst.emit(Phaser.Math.Between(width * 0.15, width * 0.85), this.scale.height * 0.35, {
            count: 14,
            tint: [0xb6ff8a, 0xfff2a8, 0xffffff, 0xff9ecb],
            speed: [40, 160],
            gravity: 70,
            life: [1.2, 2],
          });
        });
      }
    }
    this.env.flashLight();
  }

  private emitSteam(x: number, y: number, count: number): void {
    this.burst.emit(x, y, {
      texture: "puff",
      count,
      tint: [0xffffff, 0xd8e4ee],
      speed: [30, 110],
      angle: [-Math.PI * 0.85, -Math.PI * 0.15],
      gravity: -50,
      life: [1, 1.9],
      scale: [0.7, 1.2],
      endScale: 2.2,
      additive: false,
      spread: 50,
    });
  }

  private tickTimer(): void {
    const level = this.level;
    if (!level?.timed || this.progress.status !== "playing" || !this.handSeen || this.paused) return;
    // Stepping out of the camera's view stops the clock — it isn't the child's fault.
    if (!this.context.motion.body().visible) return;

    const remaining = Math.max(0, this.progress.timeRemainingSeconds - 1);
    this.progress = { ...this.progress, timeRemainingSeconds: remaining };
    if (remaining === 0) {
      this.timer?.remove();
      this.stream.setFlowing(false);
      this.audio.playSfx("fail");
      this.cloud.setMode("fail");
      this.fish.machine.enter("fail");
      analytics.track({ name: "level_failed", gameId: RIVER_GAME_ID, levelId: level.id });
      this.progress = { ...this.progress, status: "failed", feedback: "Nice try! Let’s go again." };
    }
    this.emitProgress();
  }

  /** Slow machines get thinner particles and shimmer; tracking and gameplay are never touched. */
  private trackPerformance(deltaMs: number): void {
    this.fpsAverage = this.fpsAverage * 0.95 + (1000 / Math.max(deltaMs, 1)) * 0.05;
    this.lowFpsFor = this.fpsAverage < 42 ? this.lowFpsFor + deltaMs : Math.max(0, this.lowFpsFor - deltaMs);
    const wanted = this.lowFpsFor > 2500 ? 0.4 : this.lowFpsFor === 0 ? 1 : this.quality;
    if (wanted !== this.quality) {
      this.quality = wanted;
      this.stream.setQuality(wanted);
      this.burst.quality = wanted;
      this.env.setQuality(wanted);
    }
  }

  private targetViews(): RiverTarget[] {
    return [...this.views.map((v) => v.view), ...this.props.values()];
  }

  private blankProgress(level: RiverLevelConfig, index: number): GameProgress {
    return {
      status: "idle",
      holdProgress: 0,
      score: this.score ?? 0,
      streak: this.streak ?? 0,
      timeRemainingSeconds: level.timeLimitSeconds,
      levelId: level.id,
      levelTitle: level.title,
      headline: level.headline,
      timed: level.timed,
      tutorial: level.kind === "training",
      levelIndex: index,
      totalLevels: RIVER_LEVELS.length,
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
    this.stream.destroy();
    this.burst.destroy();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
