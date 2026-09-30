import Phaser from "phaser";
import type { GameContext, GameProgress } from "../../engine/core/KalqyGame";
import type { AudioManager } from "../../engine/audio/AudioManager";
import type { StoryScene } from "../../engine/game/StoryGame";
import { createRng, type Rng } from "../../engine/content/random";
import { AtlasCharacter } from "../../engine/entities/AtlasCharacter";
import { BodyLaneController } from "../../engine/mechanics/BodyLaneController";
import { CharacterReactionManager, type ReactionEvent, type ReactionTable } from "../../engine/mechanics/CharacterReactionManager";
import { CollectionGoal } from "../../engine/mechanics/collection/CollectionGoal";
import { ScoreManager, type CatchOutcome } from "../../engine/mechanics/collection/ScoreManager";
import { FallingObjectManager, type FallingEntry } from "../../engine/mechanics/falling-objects/FallingObjectManager";
import { ObjectSpawner, type SpawnConfig } from "../../engine/mechanics/falling-objects/ObjectSpawner";
import { DirectionalMovementController } from "../../engine/mechanics/movement/DirectionalMovementController";
import { LaneLesson, LANE_STEP_POSITION, type LaneStep } from "../../engine/mechanics/movement/LaneLesson";
import { FloatingText } from "../../engine/vfx/FloatingText";
import { ParallaxSystem } from "../../engine/vfx/ParallaxSystem";
import { ParticleBurst } from "../../engine/vfx/ParticleBurst";
import { analytics } from "../../features/games/services/analytics";
import { MARKET_BODY_CONFIG } from "./bodyConfig";
import { MARKET_LEVELS, SAFE_FALLBACK_LEVEL, validateMarketLevel, type MarketLevelConfig } from "./config/levels.config";
import { FRUIT_REGISTRY } from "./objects";

export const MARKET_GAME_ID = "market-catch";

// Layout, in the 1280x720 game space.
const W = 1280;
const H = 720;
/** The kid walks on the market path; the HUD panels sit to either side, so play stays in the middle. */
const PLAYER_MIN = W * 0.24;
const PLAYER_MAX = W * 0.76;
const KID_HEIGHT = 262;
const FEET_Y = 572;
/** Fruit meets the kid here: the rim of the basket. */
const CATCH_Y = FEET_Y - KID_HEIGHT * 0.46;
const CATCH_WIDTH = 160;
const MISS_Y = FEET_Y + 48;
const PLAYER_SPEED = 620;

const DEPTH = { bg: 0, shadow: 5, friend: 6, kid: 8, fruit: 12, vfx: 20, flash: 30, guide: 34, text: 36, popup: 40 };

type Role = "kid" | "lion" | "turtle";
const REACTIONS: ReactionTable<Role> = {
  correctCatch: { kid: "happy", lion: "happy" },
  wrongCatch: { kid: "fail", lion: "fail" },
  hazardCatch: { kid: "fail", lion: "fail", turtle: "fail" },
  levelComplete: { kid: "happy", lion: "happy", turtle: "happy" },
  storyComplete: { kid: "celebrate", lion: "celebrate", turtle: "celebrate" },
};

const PRAISE = ["Nice!", "Great catch!", "Yum!", "Super!", "Well done!"];
const LESSON_TEXT: Record<LaneStep, string> = { left: "Move LEFT!", right: "Move RIGHT!", center: "Come back to the MIDDLE" };
const LESSON_HINT: Record<LaneStep, string> = { left: "Move your body to the left", right: "Now move to the right", center: "Come back to the middle" };

/**
 * The Market Catch scene. Reads only `context.motion.body()`. One scene runs
 * the tutorial and all ten levels — `startLevelAt` swaps the level's goal,
 * spawner and scoring without reloading Phaser. Everything about a level
 * comes from MARKET_LEVELS; the only branching here is training vs. play.
 */
export class MarketCatchGame extends Phaser.Scene implements StoryScene {
  private parallax = new ParallaxSystem();
  private burst!: ParticleBurst;
  private popups!: FloatingText;
  private guide!: Phaser.GameObjects.Graphics;
  private lessonText!: Phaser.GameObjects.Text;
  private flash!: Phaser.GameObjects.Rectangle;
  private ghost!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;

  private kid!: AtlasCharacter;
  private lion!: AtlasCharacter;
  private turtle!: AtlasCharacter;
  private reactions = new CharacterReactionManager<Role>(REACTIONS);
  private catcher!: Phaser.Physics.Arcade.Image;
  private fallers!: FallingObjectManager;

  private lane = new BodyLaneController();
  private mover = new DirectionalMovementController((PLAYER_MIN + PLAYER_MAX) / 2, { minX: PLAYER_MIN, maxX: PLAYER_MAX, maxSpeed: PLAYER_SPEED });

  private level: MarketLevelConfig | null = null;
  private levelIndex = 0;
  private goal: CollectionGoal | null = null;
  private spawner: ObjectSpawner | null = null;
  private scoring = new ScoreManager();
  private rng: Rng = createRng();
  private lesson: LaneLesson | null = null;
  private trainingPhase: "lane" | "catch" = "lane";
  private trainingApple: FallingEntry | null = null;
  private trainingRetry: Phaser.Time.TimerEvent | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;

  private handSeen = false;
  private bodyWasVisible = false;
  private paused = false;
  private ending = false;
  private worldRunning = true;
  private kidReactMs = 0;
  private sizeScale = 1;

  /** Score/streak at the start of the current level — a retry goes back to these. */
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
    super("MarketCatchGame");
    this.progress = this.blankProgress(MARKET_LEVELS[startIndex], startIndex);
  }

  create(): void {
    this.buildEnvironment();

    this.shadow = this.add.image(0, FEET_Y, "shadow").setDepth(DEPTH.shadow).setAlpha(0.7).setDisplaySize(190, 46);
    this.lion = new AtlasCharacter(this, 262, 562, 176, {
      idle: { key: "lion-idle", texture: "lionIdle" },
      happy: { key: "lion-win", texture: "lionWin" },
      fail: { key: "lion-fail", texture: "lionFail" },
    }).setDepth(DEPTH.friend);
    this.turtle = new AtlasCharacter(this, 1128, 552, 236, {
      idle: { key: "turtle-idle", texture: "turtleIdle" },
      happy: { key: "turtle-win", texture: "turtleWin" },
      fail: { key: "turtle-fail", texture: "turtleFail" },
    }).setDepth(DEPTH.friend);
    this.kid = new AtlasCharacter(this, this.mover.x, FEET_Y, KID_HEIGHT, {
      idle: { key: "kid-idle", texture: "kidLeft" },
      movingLeft: { key: "kid-left", texture: "kidLeft" },
      movingRight: { key: "kid-right", texture: "kidRight" },
      happy: { key: "kid-win", texture: "kidWin" },
      fail: { key: "kid-fail", texture: "kidFail" },
      celebrate: { key: "kid-win", texture: "kidWin" },
    }).setDepth(DEPTH.kid);
    this.reactions.register("kid", this.kid.machine);
    this.reactions.register("lion", this.lion.machine);
    this.reactions.register("turtle", this.turtle.machine);

    // The catcher is an invisible physics strip at the basket's rim that follows the kid.
    this.catcher = this.physics.add.image(this.mover.x, CATCH_Y, "spark").setVisible(false);
    const catcherBody = this.catcher.body as Phaser.Physics.Arcade.Body;
    catcherBody.setAllowGravity(false);
    catcherBody.setImmovable(true);
    catcherBody.setSize(CATCH_WIDTH, 30, true);

    this.fallers = new FallingObjectManager(this, FRUIT_REGISTRY, { poolSize: 12, depth: DEPTH.fruit, gravity: 0, missY: MISS_Y });
    this.fallers.bindCatcher(this.catcher);
    this.fallers.onCatch = (entry) => this.handleCatch(entry);
    this.fallers.onMiss = (entry) => this.handleMiss(entry);

    this.burst = new ParticleBurst(this, DEPTH.vfx);
    this.popups = new FloatingText(this, DEPTH.popup);
    this.flash = this.add.rectangle(W / 2, H / 2, W + 40, H + 24, 0xff6a3a, 0).setDepth(DEPTH.flash);
    this.guide = this.add.graphics().setDepth(DEPTH.guide);
    this.ghost = this.add.image(0, FEET_Y, "kidLeft", "frame_000").setOrigin(0.5, 1).setDepth(DEPTH.guide).setTint(0x9be7ff).setAlpha(0.42).setVisible(false);
    this.ghost.setScale(KID_HEIGHT / this.ghost.height);
    this.lessonText = this.add
      .text(W / 2, H * 0.34, "", {
        fontFamily: '"Baloo 2", "Nunito", system-ui, sans-serif',
        fontSize: "58px",
        fontStyle: "800",
        color: "#ffffff",
        stroke: "#5a2e0a",
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
          playerX: this.mover.x,
          catchY: CATCH_Y,
          score: this.scoring.score,
          streak: this.scoring.streak,
          goals: this.goal?.rows(),
          phase: this.trainingPhase,
          objects: this.fallers.liveEntries().map((e) => ({ id: e.definition?.id, role: e.role, x: e.image.x, y: e.image.y })),
        }),
        /** Drops one specific object straight above `x` — lets a test hit every catch case on demand. */
        drop: (objectId: string, x: number) => this.fallers.spawn({ objectId, role: "distractor", x, y: CATCH_Y - 160, vy: 260, spin: 0, scale: 1 }, this.sizeScale),
      };
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.startLevelAt(this.startIndex);
  }

  private buildEnvironment(): void {
    // The market picture is one flat image, so it only drifts a few pixels — no fake depth.
    const bg = this.add.image(W / 2, H / 2, "background").setDepth(DEPTH.bg);
    bg.setScale(Math.max((W + 30) / bg.width, (H + 18) / bg.height));
    this.parallax.add(bg, 10);
    // A soft warm wash ties the characters and fruit into the scene's light.
    this.add.rectangle(W / 2, H / 2, W + 40, H + 24, 0xffd28a, 0.06).setDepth(1);
  }

  startLevelAt(index: number): void {
    let level = MARKET_LEVELS[index];
    const problems = validateMarketLevel(level, FRUIT_REGISTRY, (key) => this.textures.exists(key));
    if (problems.length > 0) {
      // A malformed level must never crash the game: play a safe one instead.
      console.error(`Invalid level ${level.id}, using a safe fallback:`, problems);
      level = SAFE_FALLBACK_LEVEL;
    }

    this.level = level;
    this.levelIndex = index;
    this.sizeScale = level.sizeScale;

    // Clear the previous level completely.
    this.fallers.clear(false);
    this.trainingRetry?.remove();
    this.trainingRetry = null;
    this.trainingApple = null;
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0);

    this.goal = new CollectionGoal(
      level.goal.targets.map((target) => ({
        rule: { type: "objectId", objectId: target.objectId },
        count: target.count,
        label: target.label,
        iconUrl: FRUIT_REGISTRY.get(target.objectId)?.visual.iconUrl,
      }))
    );
    this.scoring = new ScoreManager(level.scoring, this.carryScore, this.carryStreak);
    this.rng = createRng();
    this.spawner = this.buildSpawner(level);

    this.lane = new BodyLaneController({ deadZone: MARKET_BODY_CONFIG.deadZone, movementSensitivity: 1.7 });
    this.lane.reset();
    this.mover.reset((PLAYER_MIN + PLAYER_MAX) / 2);
    this.kid.setX(this.mover.x);

    this.lesson = level.training ? new LaneLesson(level.training.steps, level.training.holdMs) : null;
    this.trainingPhase = "lane";
    this.ending = false;
    this.handSeen = false;
    this.kidReactMs = 0;
    this.reactions.reset();
    this.guide.clear();
    this.ghost.setVisible(false);
    this.lessonText.setVisible(level.kind === "training");

    this.timer?.remove();
    this.timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickTimer() });

    this.progress = { ...this.blankProgress(level, index), status: "playing", score: this.scoring.score, streak: this.scoring.streak };
    this.progress = { ...this.progress, holdProgress: 0, goals: this.goal.rows() };
    if (level.training) this.progress.hint = LESSON_HINT[level.training.steps[0]];
    this.emitProgress();
    analytics.track({ name: "level_started", gameId: MARKET_GAME_ID, levelId: level.id });
  }

  getProgress(): GameProgress {
    return this.progress;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (this.timer) this.timer.paused = paused;
  }

  update(_time: number, deltaMs: number): void {
    const body = this.context.motion.body();
    this.trackPerformance(deltaMs);

    this.parallax.update(deltaMs, body.visible ? { x: (body.center().x - 0.5) * 2, y: 0 } : null);
    this.burst.update(deltaMs);
    this.kid.update(deltaMs);
    this.lion.update(deltaMs);
    this.turtle.update(deltaMs);
    this.reactions.update(deltaMs);

    if (!this.level || this.paused) {
      this.setWorldRunning(false);
      return;
    }

    if (this.progress.status === "playing") {
      if (body.visible) {
        if (!this.handSeen) {
          this.handSeen = true;
          this.progress = { ...this.progress, waitingForHand: false };
        } else if (!this.bodyWasVisible) {
          analytics.track({ name: "tracking_recovered", gameId: MARKET_GAME_ID });
        }
        if (!this.bodyWasVisible) this.audio.playSfx("handDetected");
      } else if (this.bodyWasVisible && this.handSeen) {
        analytics.track({ name: "tracking_lost", gameId: MARKET_GAME_ID });
      }
      this.bodyWasVisible = body.visible;
    }

    const active = this.handSeen && body.visible && this.progress.status === "playing";
    const position = this.lane.update(body, deltaMs);

    // Steer: the body picks a target, the kid accelerates toward it. Out of view, or once the level is
    // over, the kid just glides to a stop.
    if (active) this.mover.setTarget(PLAYER_MIN + position * (PLAYER_MAX - PLAYER_MIN));
    else this.mover.hold();
    const x = this.mover.update(deltaMs);
    this.kid.setX(x);
    this.kid.setMoveDirection(this.mover.facing());
    this.shadow.x = x;
    this.catcher.x = x;
    (this.catcher.body as Phaser.Physics.Arcade.Body).updateFromGameObject();

    // A happy/sad reaction never pins the kid in place: walking cuts it short.
    this.kidReactMs += deltaMs;
    if (this.mover.facing() !== "none" && this.kidReactMs > 350 && this.kid.machine.state !== "moving") this.kid.machine.release();

    this.setWorldRunning(active);
    this.fallers.update(deltaMs, !active);
    if (!active) {
      this.drawGuide();
      this.emitProgress();
      return;
    }

    if (this.level.kind === "training") this.updateTraining(deltaMs, position);
    else this.updatePlay(deltaMs);
  }

  private setWorldRunning(running: boolean): void {
    if (running === this.worldRunning) return;
    this.worldRunning = running;
    if (running) this.physics.world.resume();
    else this.physics.world.pause();
  }

  private buildSpawner(level: MarketLevelConfig): ObjectSpawner {
    const s = level.spawning;
    const config: SpawnConfig = {
      spawnIntervalMs: s.spawnIntervalMs,
      fallSpeed: s.fallSpeed,
      maxObjects: s.maxObjects,
      minX: PLAYER_MIN,
      maxX: PLAYER_MAX,
      spawnY: s.spawnY ?? [70, 70],
      minSeparation: 170,
      wantedRatio: s.wantedRatio,
      hazardRatio: s.hazardRatio,
      guaranteeWantedMs: s.guaranteeWantedMs,
      spin: 38,
    };
    return new ObjectSpawner(config, { wanted: level.goal.targets.map((t) => t.objectId), distractors: level.distractors, hazards: level.hazards }, this.rng);
  }

  // ---- play ---------------------------------------------------------------

  private updatePlay(deltaMs: number): void {
    if (this.ending || !this.spawner || !this.goal || !this.level) return;
    const live = this.fallers.liveEntries();
    const inFlight = new Map<string, number>();
    for (const entry of live) if (entry.role === "wanted" && entry.definition) inFlight.set(entry.definition.id, (inFlight.get(entry.definition.id) ?? 0) + 1);

    // A goal object only counts as "needed" while it still advances something and isn't already on its way.
    const neededIds = this.level.goal.targets
      .map((target, i) => ({ id: target.objectId, open: this.goal!.remaining(i) - (inFlight.get(target.objectId) ?? 0) }))
      .filter((t) => t.open > 0)
      .map((t) => t.id);

    const request = this.spawner.update(deltaMs, {
      active: live.map((e) => ({ x: e.image.x, y: e.image.y })),
      playerX: this.mover.x,
      playerSpeed: PLAYER_SPEED,
      catchY: CATCH_Y,
      catchHalfWidth: CATCH_WIDTH / 2,
      neededIds,
    });
    if (request) this.fallers.spawn(request, this.sizeScale);
    this.drawGuide();
  }

  private handleCatch(entry: FallingEntry): void {
    const definition = entry.definition;
    if (!definition || !this.goal || !this.level || this.progress.status !== "playing") return;
    const image = entry.image;
    const x = image.x;
    const y = image.y;

    const result = this.goal.record(definition);
    const outcome: CatchOutcome = result.accepted ? "correct" : definition.behavior.hazard ? "hazard" : result.matched ? "extra" : "wrong";
    const previousStreak = this.scoring.streak;
    const points = this.scoring.apply(outcome);
    this.fallers.retire(entry);
    analytics.track({ name: "object_caught", gameId: MARKET_GAME_ID, levelId: this.level.id, objectId: definition.id, outcome });

    let message: string | null = null;
    switch (outcome) {
      case "correct": {
        this.audio.playSfx("fruitCatch");
        if (this.scoring.streak > previousStreak && this.scoring.streak % 3 === 0) this.audio.playSfx("streakUp");
        this.fireReaction("correctCatch");
        this.tweens.add({ targets: image, x: this.kid.x, y: CATCH_Y + 26, scale: image.scale * 0.3, alpha: 0, duration: 190, ease: "Quad.easeIn", onComplete: () => this.fallers.release(entry) });
        this.burst.emit(x, CATCH_Y, { count: 16, tint: [0xfff2a8, 0xffffff, 0xffc04d], speed: [70, 240], gravity: 140, life: [0.5, 1] });
        if (this.level.kind === "story") this.popups.show(x, y - 30, `+${points}`, "#ffe066");
        message = result.targetDone ? `${this.level.goal.targets[result.targetIndex].label} done!` : this.rng.pick(PRAISE);
        break;
      }
      case "extra":
        this.audio.playSfx("correct");
        this.tweens.add({ targets: image, x: this.kid.x, y: CATCH_Y + 26, scale: image.scale * 0.3, alpha: 0, duration: 190, onComplete: () => this.fallers.release(entry) });
        message = "We have enough of those!";
        break;
      case "wrong":
        this.audio.playSfx("wrongFruit");
        this.fireReaction("wrongCatch");
        this.popAway(entry, 0xffb380);
        this.flashScreen(0xff8a4a, 0.16);
        if (points !== 0) this.popups.show(x, y - 30, `${points}`, "#ffb08a");
        message = this.level.wrongHint ?? "Try another one!";
        break;
      case "hazard":
        this.audio.playSfx("rottenFruit");
        this.fireReaction("hazardCatch");
        this.popAway(entry, 0x9bb35a);
        this.flashScreen(0xff5a3a, 0.2);
        this.burst.emit(x, CATCH_Y, { texture: "puff", count: 6, tint: [0x8a9a4a, 0x6b5a2a], speed: [30, 120], gravity: -30, life: [0.5, 1], scale: [0.4, 0.7], endScale: 1.1, additive: false, spread: 26 });
        this.popups.show(x, y - 30, `${points}`, "#ff9a7a");
        message = "Yuck! That one is rotten!";
        break;
    }

    this.progress = {
      ...this.progress,
      score: this.scoring.score,
      streak: this.scoring.streak,
      wrongTries: this.scoring.mistakes,
      holdProgress: this.goal.progress(),
      goals: this.goal.rows(),
    };
    if (message) this.flashMessage(message, outcome === "correct" ? 1400 : 2200);
    this.emitProgress();
    analytics.track({ name: outcome === "correct" ? "correct_match" : "wrong_match", gameId: MARKET_GAME_ID, levelId: this.level.id });

    if (result.allDone) this.completeLevel();
  }

  /** A wrong/rotten catch bounces off the basket and fades — gentle, never scary. */
  private popAway(entry: FallingEntry, tint: number): void {
    const image = entry.image;
    image.setTint(tint);
    const side = image.x < this.kid.x ? -1 : 1;
    this.tweens.add({ targets: image, x: image.x + side * 70, y: image.y - 50, angle: side * 90, alpha: 0, duration: 420, ease: "Quad.easeOut", onComplete: () => this.fallers.release(entry) });
  }

  private handleMiss(entry: FallingEntry): void {
    const image = entry.image;
    const rotten = entry.definition?.behavior.hazard ?? false;
    // Fruit that lands on the ground is just a soft puff — missing is never punished.
    this.burst.emit(image.x, MISS_Y - 10, {
      texture: "puff",
      count: rotten ? 5 : 4,
      tint: rotten ? [0x8a7a3a, 0x6b5a2a] : [0xfff0d0, 0xe9d2a0],
      speed: [20, 90],
      angle: [-Math.PI * 0.9, -Math.PI * 0.1],
      life: [0.4, 0.8],
      scale: [0.3, 0.6],
      endScale: 1,
      additive: false,
    });
    if (entry === this.trainingApple) this.respawnTrainingApple();
  }

  private completeLevel(): void {
    if (this.ending || !this.level) return;
    this.ending = true;
    this.timer?.remove();
    // Nothing new spawns; what is still falling fades out safely.
    this.time.delayedCall(250, () => this.fallers.clear(true));
    this.finishLevel(this.level.kind === "training" ? "Great catch!" : this.levelIndex === MARKET_LEVELS.length - 1 ? "Market Master!" : "Level complete!");
  }

  private finishLevel(message: string): void {
    const level = this.level;
    if (!level) return;
    const isTraining = level.kind === "training";
    const isLast = this.levelIndex === MARKET_LEVELS.length - 1;

    if (!isTraining) this.scoring.add(50 + this.progress.timeRemainingSeconds);
    this.carryScore = this.scoring.score;
    this.carryStreak = this.scoring.streak;

    this.fireReaction(isLast ? "storyComplete" : "levelComplete");
    this.audio.playSfx(isLast ? "levelComplete" : "success");
    if (isLast) this.audio.playSfx("levelComplete");
    this.celebrate(isLast);

    const mistakes = this.scoring.mistakes;
    const stars = isTraining ? 3 : mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    this.lessonText.setVisible(false);
    this.guide.clear();
    this.ghost.setVisible(false);
    this.progress = {
      ...this.progress,
      status: "success",
      holdProgress: 1,
      score: this.scoring.score,
      streak: this.scoring.streak,
      stars,
      feedback: message,
      goals: this.goal?.rows(),
    };
    this.emitProgress();
    analytics.track({ name: "level_completed", gameId: MARKET_GAME_ID, levelId: level.id, stars, score: this.scoring.score });
  }

  /** Soft, warm celebration — sparkles and drifting petals of light, no arcade confetti. */
  private celebrate(big: boolean): void {
    const x = this.kid.x;
    this.burst.emit(x, FEET_Y - KID_HEIGHT * 0.6, { count: big ? 60 : 34, tint: [0xfff2a8, 0xffffff, 0xffc04d, 0xff9ecb], speed: [90, 320], gravity: 120, life: [1, 1.9] });
    const rounds = big ? 7 : 3;
    for (let i = 0; i < rounds; i++) {
      this.time.delayedCall(i * 260, () => {
        this.burst.emit(Phaser.Math.Between(W * 0.2, W * 0.8), H * 0.3, {
          count: big ? 16 : 10,
          tint: [0xb6ff8a, 0xfff2a8, 0xffffff, 0xff9ecb, 0xffb35a],
          speed: [40, 170],
          gravity: 80,
          life: [1.2, 2],
        });
      });
    }
    this.flashScreen(0xfff2b0, 0.22);
  }

  // ---- training -----------------------------------------------------------

  private updateTraining(deltaMs: number, position: number): void {
    if (!this.lesson || this.ending) return;

    if (this.trainingPhase === "lane") {
      const result = this.lesson.update(position, deltaMs);
      this.progress = { ...this.progress, holdProgress: result.holdProgress };
      this.drawGuide(result);
      if (result.stepCompleted) {
        this.audio.playSfx("correct");
        this.burst.emit(this.kid.x, FEET_Y - 160, { count: 18, tint: [0xfff2a8, 0xffffff, 0xffc04d], speed: [80, 240] });
        if (result.done) {
          this.trainingPhase = "catch";
          this.progress = { ...this.progress, holdProgress: 0, hint: "Catch the falling apple!", feedback: "Great moves!" };
          this.spawnTrainingApple();
        } else {
          const next = this.lesson.steps[this.lesson.currentIndex];
          this.progress = { ...this.progress, holdProgress: 0, hint: LESSON_HINT[next], feedback: "Great!" };
        }
        this.time.delayedCall(1200, () => {
          if (this.progress.feedback === "Great!" || this.progress.feedback === "Great moves!") this.flashMessage(null, 0);
        });
      }
    } else {
      this.drawGuide();
    }
    this.emitProgress();
  }

  /** One slow apple, dropped a little to the side so the child has to move to catch it. */
  private spawnTrainingApple(): void {
    if (this.ending) return;
    const side = this.kid.x > (PLAYER_MIN + PLAYER_MAX) / 2 ? -1 : 1;
    const x = Phaser.Math.Clamp(this.kid.x + side * Phaser.Math.Between(140, 210), PLAYER_MIN + 20, PLAYER_MAX - 20);
    this.trainingApple = this.fallers.spawn({ objectId: "apple_fresh", role: "wanted", x, y: -60, vy: 115, spin: 18, scale: 1 }, this.sizeScale);
  }

  private respawnTrainingApple(): void {
    this.trainingApple = null;
    this.trainingRetry?.remove();
    this.trainingRetry = this.time.delayedCall(900, () => this.spawnTrainingApple());
  }

  /**
   * The move lesson: a glowing ghost kid demonstrates the move, a pulsing
   * ring marks where to stand, a big arrow shows the way, the instruction
   * is spelled out, and dots show the lesson's progress.
   */
  private drawGuide(lesson?: { step: LaneStep; inZone: boolean; holdProgress: number }): void {
    const g = this.guide;
    g.clear();
    const level = this.level;
    if (!level?.training || this.ending || this.progress.status !== "playing") {
      this.lessonText.setVisible(false);
      this.ghost.setVisible(false);
      return;
    }
    const steps = level.training.steps;
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 260);
    const xFor = (p: number) => PLAYER_MIN + p * (PLAYER_MAX - PLAYER_MIN);
    this.lessonText.setVisible(true);

    if (this.trainingPhase === "lane") {
      const index = this.lesson?.currentIndex ?? 0;
      const step = lesson?.step ?? steps[index];
      const inZone = lesson?.inZone ?? false;
      const targetX = xFor(LANE_STEP_POSITION[step]);
      const homeX = (PLAYER_MIN + PLAYER_MAX) / 2;
      const color = inZone ? 0x8dff9a : 0x9be7ff;

      // Goal ring on the path where the kid should end up.
      g.lineStyle(7, color, 0.55 + 0.35 * pulse);
      g.strokeEllipse(targetX, FEET_Y + 4, 170 + pulse * 10, 44 + pulse * 3);
      g.fillStyle(color, 0.14 + 0.1 * pulse);
      g.fillEllipse(targetX, FEET_Y + 4, 170, 44);

      // Ghost demonstration loop: walk from the middle to the ring, hold, repeat.
      const cycle = (this.time.now / 2400) % 1;
      const move = Phaser.Math.Easing.Sine.InOut(Math.min(1, cycle / 0.55));
      const from = step === "center" ? targetX + (this.mover.x < homeX ? -200 : 200) : homeX;
      const ghostX = Phaser.Math.Linear(from, targetX, move);
      this.ghost.setVisible(true).setPosition(ghostX, FEET_Y).setAlpha(inZone ? 0.18 : 0.42);

      // Big arrow pointing the way, pulsing.
      const dir = Math.sign(targetX - (step === "center" ? from : homeX)) || 1;
      const ax = (step === "center" ? from : homeX) + dir * 120;
      const nudge = dir * pulse * 22;
      g.lineStyle(20, 0x4a2608, 0.5);
      this.arrow(g, ax + nudge, FEET_Y - KID_HEIGHT * 0.55, dir, 3);
      g.lineStyle(14, 0xffffff, 0.95);
      this.arrow(g, ax + nudge, FEET_Y - KID_HEIGHT * 0.55, dir, 0);

      // Progress ring above the kid while the pose is held.
      if ((lesson?.holdProgress ?? 0) > 0) {
        g.lineStyle(12, 0xffd166, 0.95);
        g.beginPath();
        g.arc(this.kid.x, FEET_Y - KID_HEIGHT - 28, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (lesson?.holdProgress ?? 0));
        g.strokePath();
      }

      // Lesson dots: done / current / to do.
      steps.forEach((_, i) => {
        const dx = W / 2 + (i - (steps.length - 1) / 2) * 36;
        g.fillStyle(i < index ? 0x8dff9a : i === index ? 0xffd166 : 0xffffff, i === index ? 1 : 0.55);
        g.fillCircle(dx, H * 0.27, i === index ? 11 + pulse * 3 : 9);
      });
      this.lessonText.setText(LESSON_TEXT[step]).setAlpha(0.88 + 0.12 * pulse);
      return;
    }

    // Catch step: highlight the apple and point the kid toward it.
    this.ghost.setVisible(false);
    const apple = this.trainingApple?.live ? this.trainingApple.image : null;
    if (apple) {
      g.lineStyle(8, 0xffd166, 0.6 + 0.35 * pulse);
      g.strokeCircle(apple.x, apple.y, 74 + pulse * 8);
      const dir = Math.sign(apple.x - this.kid.x);
      if (Math.abs(apple.x - this.kid.x) > 70) {
        const ax = this.kid.x + dir * 100;
        const nudge = dir * pulse * 20;
        g.lineStyle(20, 0x4a2608, 0.5);
        this.arrow(g, ax + nudge, FEET_Y - KID_HEIGHT * 0.55, dir, 3);
        g.lineStyle(14, 0xffffff, 0.95);
        this.arrow(g, ax + nudge, FEET_Y - KID_HEIGHT * 0.55, dir, 0);
      }
    }
    this.lessonText.setText("Catch the apple!").setAlpha(0.88 + 0.12 * pulse);
  }

  private arrow(g: Phaser.GameObjects.Graphics, x: number, y: number, dir: number, grow: number): void {
    g.lineBetween(x - dir * grow, y, x + dir * (100 + grow), y);
    g.lineBetween(x + dir * 100, y, x + dir * 64, y - 34 - grow);
    g.lineBetween(x + dir * 100, y, x + dir * 64, y + 34 + grow);
  }

  // ---- helpers ------------------------------------------------------------

  private fireReaction(event: ReactionEvent): void {
    this.reactions.fire(event);
    this.kidReactMs = 0;
  }

  private flashScreen(color: number, alpha: number): void {
    this.tweens.killTweensOf(this.flash);
    this.flash.setFillStyle(color, 1).setAlpha(alpha);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 420, ease: "Sine.easeOut" });
  }

  /** A short message in the HUD bar; clears itself unless a newer one replaced it. */
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

  private tickTimer(): void {
    const level = this.level;
    if (!level?.timed || this.progress.status !== "playing" || !this.handSeen || this.paused || this.ending) return;
    // Out of view stops the clock — it isn't the child's fault.
    if (!this.context.motion.body().visible) return;

    const remaining = Math.max(0, this.progress.timeRemainingSeconds - 1);
    this.progress = { ...this.progress, timeRemainingSeconds: remaining };
    if (remaining > 0 && remaining <= 5) this.audio.playSfx("timerWarning");
    if (remaining === 0) {
      this.timer?.remove();
      this.ending = true;
      this.fallers.clear(true);
      this.audio.playSfx("fail");
      this.fireReaction("wrongCatch");
      analytics.track({ name: "level_failed", gameId: MARKET_GAME_ID, levelId: level.id });
      this.progress = { ...this.progress, status: "failed", feedback: "Nice try! Let’s go again." };
    }
    this.emitProgress();
  }

  /** Slow machines get thinner particles; tracking and gameplay are never touched. */
  private trackPerformance(deltaMs: number): void {
    this.fpsAverage = this.fpsAverage * 0.95 + (1000 / Math.max(deltaMs, 1)) * 0.05;
    this.lowFpsFor = this.fpsAverage < 42 ? this.lowFpsFor + deltaMs : Math.max(0, this.lowFpsFor - deltaMs);
    this.burst.quality = this.lowFpsFor > 2500 ? 0.4 : 1;
  }

  private blankProgress(level: MarketLevelConfig, index: number): GameProgress {
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
      totalLevels: MARKET_LEVELS.length,
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
    this.trainingRetry?.remove();
    this.fallers.destroy();
    this.burst.destroy();
    this.popups.destroy();
    this.kid.destroy();
    this.lion.destroy();
    this.turtle.destroy();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.reactions.reset();
    this.worldRunning = true;
  }
}
