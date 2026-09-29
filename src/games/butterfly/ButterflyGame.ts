import Phaser from "phaser";
import type { GameContext, GameProgress } from "../../engine/core/KalqyGame";
import type { AudioManager } from "../../engine/audio/AudioManager";
import { ParallaxSystem } from "../../engine/vfx/ParallaxSystem";
import { Butterfly } from "./entities/Butterfly";
import { ButterflyTrail } from "./entities/ButterflyTrail";
import { playCelebration } from "./effects";
import { FLOWER_COLORS } from "./config/levels.config";
import { FlowerTarget } from "./entities/FlowerTarget";
import { PlacementSystem } from "./systems/PlacementSystem";
import { isMatch } from "./systems/MatchingSystem";
import { analytics } from "../../features/games/services/analytics";
import { validateLevel, type ButterflyLevelConfig } from "./config/levels.config";

export const BUTTERFLY_GAME_ID = "butterfly-meadow";
const KID_TARGET_HEIGHT = 330;

const KID_STATES = {
  idle: { atlas: "kidIdle", anim: "kid-idle" },
  win: { atlas: "kidWin", anim: "kid-win" },
  fail: { atlas: "kidFail", anim: "kid-fail" },
} as const;

export interface LevelStart {
  config: ButterflyLevelConfig;
  index: number;
  total: number;
}

/**
 * Phaser scene for Butterfly. Knows nothing about MediaPipe or the camera —
 * only ever reads `context.motion.hand("primary")` (PROMPT sections 99/98).
 * Progress is pushed to the React HUD through a callback given at
 * construction (no scene-lookup needed, so it can't race Phaser's boot).
 * One scene serves every level: `startLevel` swaps the targets/butterfly.
 */
export class ButterflyGame extends Phaser.Scene {
  private butterfly!: Butterfly;
  private kid!: Phaser.GameObjects.Sprite;
  private kidShadow!: Phaser.GameObjects.Image;
  private trail!: ButterflyTrail;
  private parallax = new ParallaxSystem();

  private targets: FlowerTarget[] = [];
  private correctTarget: FlowerTarget | null = null;
  private level: LevelStart | null = null;
  private placements = new Map<string, PlacementSystem>();

  private handWasVisible = false;
  private holdWasActive = false;
  private timer: Phaser.Time.TimerEvent | null = null;
  private guide!: Phaser.GameObjects.Graphics;
  private handSeen = false;
  private paused = false;
  private celebrating = false;

  private score = 0;
  private streak = 0;
  private progress: GameProgress;

  constructor(
    private readonly context: GameContext,
    private readonly audio: AudioManager,
    private readonly onProgress: (progress: GameProgress) => void,
    private readonly initial: LevelStart
  ) {
    super("ButterflyGame");
    this.progress = this.blankProgress(initial);
  }

  create(): void {
    const { width, height } = this.scale;

    // Layers, back to front. Every layer is over-scaled by more than its
    // parallax strength so its edge never shows (PROMPT section 36).
    const background = this.add.image(width / 2, height / 2, "background").setDepth(0);
    background.setScale(Math.max((width + 40) / background.width, (height + 24) / background.height));
    this.parallax.add(background, 14);

    // Reference layout: the tree's trunk ends ~60% down and its crown runs off
    // the top-left, covering ~40% of the width.
    const tree = this.add.image(-50, -90, "tree").setOrigin(0, 0).setDepth(30);
    tree.setScale((width * 0.44) / tree.width);
    this.parallax.add(tree, 42);

    const foreground = this.add.image(width / 2, height + 30, "foreground").setOrigin(0.5, 1).setDepth(31);
    foreground.setScale((width + 180) / foreground.width);
    this.parallax.add(foreground, 84);

    this.kidShadow = this.add.image(width * 0.35, height * 0.83 - 4, "shadow").setDepth(11).setAlpha(0.8);
    this.kidShadow.setDisplaySize(KID_TARGET_HEIGHT * 0.62, KID_TARGET_HEIGHT * 0.2);
    this.parallax.add(this.kidShadow, 26);

    this.kid = this.add.sprite(width * 0.35, height * 0.83, KID_STATES.idle.atlas).setOrigin(0.5, 1).setDepth(12);
    this.parallax.add(this.kid, 26);
    this.playKid("idle");

    this.butterfly = new Butterfly(this, width / 2, height / 2, this.initial.config.butterfly.colorId);
    this.butterfly.setDepth(40);
    this.trail = new ButterflyTrail(this, 38);
    this.guide = this.add.graphics().setDepth(35);

    this.startLevel(this.initial);
  }

  /** Loads a level (or reloads the same one for a retry). */
  startLevel(start: LevelStart): void {
    const problems = validateLevel(start.config);
    if (problems.length > 0) {
      // A malformed config must never crash the game (PROMPT section 104).
      console.error(`Invalid level ${start.config.id}:`, problems);
      return;
    }

    this.level = start;
    const { width, height } = this.scale;
    const { config } = start;

    this.targets.forEach((target) => {
      this.parallax.remove(target);
      target.destroy();
    });
    this.targets = config.targets.map((t) => {
      const target = new FlowerTarget(this, t.x * width, t.y * height, t.id, t.colorId, t.scale, config.mechanics.interactionRadius);
      target.setDepth(10 + t.y);
      this.parallax.add(target, 26);
      return target;
    });
    this.correctTarget = this.targets.find((t) => isMatch(config.butterfly.colorId, t.colorId)) ?? null;
    this.targets.forEach((t) => t.setHighlighted(config.highlightCorrect && t === this.correctTarget));

    this.butterfly.setColorId(config.butterfly.colorId);
    this.trail.setColor(FLOWER_COLORS[config.butterfly.colorId]);
    this.trail.clear();
    this.butterfly.setAngle(0);
    this.placements = new Map(this.targets.map((t) => [t.targetId, new PlacementSystem(config.mechanics.holdDurationMs)]));
    this.holdWasActive = false;
    this.handSeen = false;
    this.guide.clear();
    this.celebrating = false;

    this.timer?.remove();
    this.timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickTimer() });

    this.playKid("idle");
    this.progress = { ...this.blankProgress(start), status: "playing", score: this.score, streak: this.streak };
    this.emitProgress();
    analytics.track({ name: "level_started", gameId: BUTTERFLY_GAME_ID, levelId: config.id });
  }

  getProgress(): GameProgress {
    return this.progress;
  }

  /** Freezes gameplay (timer, hold, movement) without tearing anything down. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (this.timer) this.timer.paused = paused;
  }

  update(_time: number, deltaMs: number): void {
    const { width, height } = this.scale;
    const hand = this.context.motion.hand("primary");
    this.parallax.update(
      deltaMs,
      hand.visible ? { x: (hand.position.x - 0.5) * 2, y: (hand.position.y - 0.5) * 2 } : null
    );

    if (this.progress.status !== "playing") this.trail.update(deltaMs, this.butterfly.x, this.butterfly.y, this.celebrating);

    if (this.paused || this.progress.status !== "playing" || !this.level || !this.correctTarget) return;

    if (hand.visible) {
      if (!this.handSeen) {
        this.handSeen = true;
        this.progress = { ...this.progress, waitingForHand: false };
      } else if (!this.handWasVisible) {
        analytics.track({ name: "tracking_recovered", gameId: BUTTERFLY_GAME_ID });
      }
      if (!this.handWasVisible) this.audio.playSfx("handDetected");
      this.butterfly.flyTo(
        Phaser.Math.Linear(this.butterfly.x, hand.position.x * width, 0.22),
        Phaser.Math.Linear(this.butterfly.y, hand.position.y * height, 0.22),
        deltaMs / 1000
      );
    } else {
      if (this.handWasVisible && this.handSeen) analytics.track({ name: "tracking_lost", gameId: BUTTERFLY_GAME_ID });
      this.butterfly.settle();
    }
    this.handWasVisible = hand.visible;
    this.trail.update(deltaMs, this.butterfly.x, this.butterfly.y, hand.visible);

    const correct = this.correctTarget;
    let progress = 0;
    let completed = false;
    let wrongCompleted: FlowerTarget | null = null;

    // Every flower runs its own 3-second hold ring; only the matching one wins.
    for (const target of this.targets) {
      const distance = Phaser.Math.Distance.Between(this.butterfly.x, this.butterfly.y, target.headX, target.headY);
      const result = this.placements.get(target.targetId)!.update(distance, target.interactionRadius, deltaMs);
      target.update(deltaMs / 1000, result.progress);
      progress = Math.max(progress, result.progress);
      if (result.completed) {
        if (target === correct) completed = true;
        else wrongCompleted = target;
      }
    }
    if (wrongCompleted && !completed) this.handleWrong(wrongCompleted);
    this.drawGuide(this.placements.get(correct.targetId) ? progress : 0);

    const holding = progress > 0;
    if (holding && !this.holdWasActive) this.audio.playSfx("holdStart");
    this.holdWasActive = holding;

    this.progress = { ...this.progress, holdProgress: progress };
    if (completed) this.handleSuccess();
    else this.emitProgress();
  }

  /** A full hold on the wrong flower: shake it, flash red, and reset the streak — never ends the level. */
  private handleWrong(target: FlowerTarget): void {
    target.playWrong();
    this.playKid("fail", () => this.playKid("idle"));
    analytics.track({ name: "wrong_match", gameId: BUTTERFLY_GAME_ID, levelId: this.progress.levelId });
    this.audio.playSfx("encourage");
    this.streak = 0;
    this.progress = {
      ...this.progress,
      holdProgress: 0,
      wrongTries: this.progress.wrongTries + 1,
      streak: 0,
      feedback: "Oops, try another flower!",
    };
    this.time.delayedCall(2000, () => {
      if (this.progress.feedback === "Oops, try another flower!") {
        this.progress = { ...this.progress, feedback: null };
        this.emitProgress();
      }
    });
    this.emitProgress();
  }

  private handleSuccess(): void {
    this.correctTarget?.playBloom();
    this.audio.playSfx("success");
    analytics.track({ name: "correct_match", gameId: BUTTERFLY_GAME_ID, levelId: this.progress.levelId });
    this.playKid("win", () => this.playKid("idle"));
    this.celebrate();
    this.timer?.remove();

    const stars = this.progress.wrongTries === 0 ? 3 : this.progress.wrongTries <= 2 ? 2 : 1;
    this.streak += 1;
    this.score += 100 + this.streak * 10 + this.progress.timeRemainingSeconds;
    this.progress = {
      ...this.progress,
      status: "success",
      holdProgress: 1,
      score: this.score,
      streak: this.streak,
      stars,
      feedback: "Wonderful!",
    };
    this.emitProgress();
    analytics.track({
      name: "level_completed",
      gameId: BUTTERFLY_GAME_ID,
      levelId: this.progress.levelId,
      stars,
      score: this.score,
    });
  }

  /** Butterfly loops around the flower, confetti bursts, and the kid bounces. */
  private celebrate(): void {
    const target = this.correctTarget;
    if (!target) return;
    const cx = target.headX;
    const cy = target.headY;
    playCelebration(this, cx, cy, FLOWER_COLORS[this.level?.config.butterfly.colorId ?? "red"]);

    this.celebrating = true;
    const orbit = { t: 0 };
    const startAngle = Math.atan2(this.butterfly.y - cy, this.butterfly.x - cx);
    this.tweens.add({
      targets: orbit,
      t: 1,
      duration: 1500,
      ease: "Sine.easeInOut",
      onComplete: () => (this.celebrating = false),
      onUpdate: () => {
        const angle = startAngle + orbit.t * Math.PI * 4;
        const radius = 70 + Math.sin(orbit.t * Math.PI) * 60;
        const nx = cx + Math.cos(angle) * radius;
        const ny = cy + Math.sin(angle) * radius * 0.6;
        this.butterfly.flyTo(nx, ny, 0.016);
      },
    });

    const base = this.kid.scaleY;
    const hop = { k: 0 };
    this.tweens.add({
      targets: hop,
      k: 1,
      duration: 260,
      yoyo: true,
      repeat: 2,
      ease: "Quad.easeOut",
      onUpdate: () => this.kid.setScale(base * (1 - hop.k * 0.05), base * (1 + hop.k * 0.08)),
      onComplete: () => this.kid.setScale(base),
    });
  }

  private tickTimer(): void {
    if (this.progress.status !== "playing" || !this.handSeen || this.paused) return;
    const remaining = Math.max(0, this.progress.timeRemainingSeconds - 1);
    this.progress = { ...this.progress, timeRemainingSeconds: remaining };
    if (remaining === 0) {
      this.timer?.remove();
      this.audio.playSfx("fail");
      analytics.track({ name: "level_failed", gameId: BUTTERFLY_GAME_ID, levelId: this.progress.levelId });
      this.playKid("fail", () => this.playKid("idle"));
      this.progress = { ...this.progress, status: "failed", feedback: "Nice try! Let's go again." };
    }
    this.emitProgress();
  }

  /**
   * Training only: a dotted trail flowing from the butterfly to the correct
   * flower, like the reference — teaches "fly it over there" without words.
   */
  private drawGuide(holdProgress: number): void {
    this.guide.clear();
    if (!this.level?.config.highlightCorrect || !this.correctTarget || holdProgress > 0.05) return;

    const from = new Phaser.Math.Vector2(this.butterfly.x, this.butterfly.y);
    const to = new Phaser.Math.Vector2(this.correctTarget.headX, this.correctTarget.headY);
    const dots = 14;
    const phase = (this.time.now / 900) % 1;
    for (let i = 0; i < dots; i++) {
      const t = (i + phase) / dots;
      const p = from.clone().lerp(to, t);
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI);
      this.guide.fillStyle(0x9dff8a, 0.25 + 0.6 * pulse);
      this.guide.fillCircle(p.x, p.y, 3 + 4 * pulse);
    }
  }

  /** Swaps the one kid sprite between the idle / win / fail sheets. */
  private playKid(state: keyof typeof KID_STATES, onComplete?: () => void): void {
    const { atlas, anim } = KID_STATES[state];
    this.kid.setTexture(atlas, "frame_000");
    const frame = this.textures.getFrame(atlas, "frame_000");
    this.kid.setScale(KID_TARGET_HEIGHT / frame.height);

    this.kid.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    this.kid.play(anim);
    if (onComplete) this.kid.once(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);
  }

  private blankProgress(start: LevelStart): GameProgress {
    return {
      status: "idle",
      holdProgress: 0,
      score: this.score ?? 0,
      streak: this.streak ?? 0,
      timeRemainingSeconds: start.config.timeLimitSeconds,
      levelId: start.config.id,
      levelTitle: start.config.title,
      levelIndex: start.index,
      totalLevels: start.total,
      hint: start.config.hint,
      wrongTries: 0,
      stars: 0,
      feedback: null,
      waitingForHand: true,
    };
  }

  private emitProgress(): void {
    this.onProgress(this.progress);
  }
}
