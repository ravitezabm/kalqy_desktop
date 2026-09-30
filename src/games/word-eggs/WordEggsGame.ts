import Phaser from "phaser";
import type { GameContext, GameProgress } from "../../engine/core/KalqyGame";
import type { AudioManager } from "../../engine/audio/AudioManager";
import type { StoryScene } from "../../engine/game/StoryGame";
import { CharacterStateMachine } from "../../engine/mechanics/CharacterStateMachine";
import { PickAndPlaceEngine, type DropZone, type HandInput, type PickItem, type PickPlaceEvent } from "../../engine/mechanics/pick-place/PickAndPlaceEngine";
import { OneEuroFilter2D } from "../../engine/motion/smoothing/OneEuroFilter";
import { OPTION_SKINS } from "../../engine/content/skins/EggSkin";
import type { OptionSkinStyle } from "../../engine/content/skins/OptionSkin";
import { createRng } from "../../engine/content/random";
import { PhysicsOptionController } from "../../engine/physics/PhysicsOptionController";
import { HandCursor } from "../../engine/vfx/HandCursor";
import { ParallaxSystem } from "../../engine/vfx/ParallaxSystem";
import { ParticleBurst } from "../../engine/vfx/ParticleBurst";
import { analytics } from "../../features/games/services/analytics";
import { buildRound, type Round } from "./RoundBuilder";
import { WORD_EGGS_LEVELS, validateWordEggsLevel, type DragGesture, type WordEggsLevelConfig } from "./config/levels.config";
import { NestView } from "./entities/NestView";

export const WORD_EGGS_GAME_ID = "word-eggs";

const W = 1280;
const H = 720;

// Where the tree art (right-aligned, wider than the screen) puts the branch.
const TREE_WIDTH = 1500;
const TREE_LEFT = 1440 - TREE_WIDTH;
/** Measured on tree.png: branch top edge as a fraction of the tree's height, by fraction of its width. */
const BRANCH_TOP: [number, number][] = [
  [0.03, 0.461], [0.08, 0.447], [0.15, 0.42], [0.25, 0.405], [0.35, 0.41], [0.45, 0.4], [0.55, 0.396], [0.62, 0.4], [0.72, 0.388],
];

const NEST_ROW_CENTER = 470;
const NEST_ROW_WIDTH = 770;
const BIRD_X = 1020;

const FLOOR_Y = 690;
const EGG_TEXTURE_HEIGHT = 250;
const EGG_BASE_HEIGHT = 150;
const PLAY_LEFT = 300;
const PLAY_RIGHT = 1060;

const ENCOURAGEMENT = ["Try again!", "Look carefully!", "Almost!"];
const PRAISE = ["Great!", "Nice!", "You found it!"];

interface EggView {
  item: PickItem;
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;
  baseScale: number;
}

/**
 * The Word Eggs scene. Reads only `context.motion.hand("primary")`. It turns a
 * Round (word, answer, distractors) into nests + eggs and hands all the
 * drag/drop rules to the subject-blind PickAndPlaceEngine; this class is just
 * presentation — the tree, nests, bird, eggs, physics and effects.
 */
export class WordEggsGame extends Phaser.Scene implements StoryScene {
  private parallax = new ParallaxSystem();
  private burst!: ParticleBurst;
  private cursor!: HandCursor;
  private ghost!: HandCursor;
  private guide!: Phaser.GameObjects.Graphics;
  private lessonText!: Phaser.GameObjects.Text;
  private light!: Phaser.GameObjects.Rectangle;
  private bird!: Phaser.GameObjects.Sprite;
  private readonly birdState = new CharacterStateMachine();
  private treeHeight = 0;

  private level: WordEggsLevelConfig | null = null;
  private round: Round | null = null;
  private engine: PickAndPlaceEngine | null = null;
  private physicsCtl: PhysicsOptionController | null = null;
  private eggs: EggView[] = [];
  private nests: NestView[] = [];
  private promptEggs: Phaser.GameObjects.Image[] = [];
  private slotNest: NestView | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  private ambient = 0;

  private handFilter = new OneEuroFilter2D({ minCutoff: 1.6, beta: 0.06 });
  private handSeen = false;
  private handWasVisible = false;
  private paused = false;
  private lastWord: string | undefined;
  private playCounter = 0;

  private score = 0;
  private streak = 0;
  private progress: GameProgress;

  constructor(
    private readonly context: GameContext,
    private readonly audio: AudioManager,
    private readonly onProgress: (progress: GameProgress) => void,
    private readonly startIndex: number,
    /** Fixed seed for reproducing a bad level (dev: ?seed=123). Production passes undefined. */
    private readonly seed?: number
  ) {
    super("WordEggsGame");
    this.progress = this.blankProgress(WORD_EGGS_LEVELS[startIndex], startIndex);
  }

  create(): void {
    this.buildEnvironment();
    this.buildBird();

    this.burst = new ParticleBurst(this, 60);
    this.guide = this.add.graphics().setDepth(44);
    this.lessonText = this.add
      .text(W / 2, 470, "", {
        fontFamily: '"Baloo 2", "Nunito", system-ui, sans-serif',
        fontSize: "46px",
        fontStyle: "800",
        color: "#ffffff",
        stroke: "#3a2a10",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setVisible(false);
    this.ghost = new HandCursor(this, true).setDepth(46).setVisible(false);
    this.cursor = new HandCursor(this).setDepth(50).setVisible(false);
    this.light = this.add.rectangle(W / 2, H / 2, W + 40, H + 24, 0xfff2b0, 0).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);

    if (import.meta.env.DEV) {
      // Dev-only window for automated tests: where everything is, in game pixels.
      (window as unknown as { __kalqyDebug?: unknown }).__kalqyDebug = {
        state: () => ({
          word: this.round?.word,
          missingIndex: this.round?.missingIndex,
          levelId: this.level?.id,
          seed: this.round?.seed,
          zone: this.engine?.zones[0] && { x: this.engine.zones[0].x, y: this.engine.zones[0].y },
          eggs: this.eggs.map((e) => ({ value: e.item.option.value, correct: e.item.option.correct, x: e.item.x, y: e.item.y, state: e.item.state })),
        }),
      };
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.startLevelAt(this.startIndex);
  }

  private buildEnvironment(): void {
    const cover = (img: Phaser.GameObjects.Image) => img.setScale(Math.max((W + 60) / img.width, (H + 36) / img.height));

    const bg = cover(this.add.image(W / 2, H / 2, "background").setDepth(0));
    this.parallax.add(bg, 12);

    const tree = this.add.image(TREE_LEFT, 0, "tree").setOrigin(0, 0).setDepth(4);
    tree.setScale(TREE_WIDTH / tree.width);
    this.treeHeight = tree.displayHeight;

    const leaf = this.add.image(-30, -30, "leafTopLeft").setOrigin(0, 0).setDepth(32);
    leaf.setScale(430 / leaf.width);
    this.parallax.add(leaf, 34);

    // This art is cropped hard on its left edge, so that edge goes off-screen.
    const middle = this.add.image(-24, H + 10, "rightBushMiddle").setOrigin(0, 1).setDepth(6);
    middle.setScale(470 / middle.width);
    this.parallax.add(middle, 30);

    const leftBush = cover(this.add.image(W / 2, H / 2, "leftBush").setDepth(31));
    this.parallax.add(leftBush, 56);

    const rightBush = this.add.image(W + 100, H + 40, "rightBush").setOrigin(1, 1).setDepth(31);
    rightBush.setScale(300 / rightBush.width);
    this.parallax.add(rightBush, 72);
  }

  /** Y of the branch's top edge at screen x. */
  private branchTop(x: number): number {
    const fx = (x - TREE_LEFT) / TREE_WIDTH;
    const pts = BRANCH_TOP;
    let frac = pts[pts.length - 1][1];
    if (fx <= pts[0][0]) frac = pts[0][1];
    else {
      for (let i = 1; i < pts.length; i++) {
        if (fx <= pts[i][0]) {
          const t = (fx - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
          frac = Phaser.Math.Linear(pts[i - 1][1], pts[i][1], t);
          break;
        }
      }
    }
    return frac * this.treeHeight;
  }

  private buildBird(): void {
    this.bird = this.add.sprite(BIRD_X, this.branchTop(BIRD_X) + 10, "birdIdle", "frame_000").setOrigin(0.5, 0.97).setDepth(8);
    this.birdState.onChange((state) => this.playBird(state === "happy" || state === "success" || state === "celebrate" ? "win" : state === "fail" ? "sad" : "idle"));
    this.playBird("idle");

    // Quiet life: a slow breath and a tiny bob, on top of the frame animation.
    this.tweens.add({ targets: this.bird, scaleY: { from: 1, to: 1.015 }, duration: 1900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private playBird(kind: "idle" | "win" | "sad"): void {
    const atlas = kind === "idle" ? "birdIdle" : kind === "win" ? "birdWin" : "birdSad";
    const heights = { idle: 172, win: 186, sad: 178 };
    const frameHeight = { idle: 310, win: 330, sad: 361 };
    this.bird.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    this.bird.setTexture(atlas, "frame_000");
    this.bird.setScale(heights[kind] / frameHeight[kind]);
    this.bird.play(`bird-${kind}`);
    if (kind !== "idle") this.bird.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.birdState.reset());
  }

  startLevelAt(index: number): void {
    const level = WORD_EGGS_LEVELS[index];
    const problems = validateWordEggsLevel(level);
    if (problems.length > 0) {
      console.error(`Invalid level ${level.id}:`, problems);
      return;
    }
    this.teardownLevel();
    this.level = level;
    this.playCounter += 1;

    const seed = this.seed !== undefined ? this.seed + index * 1000 + this.playCounter : undefined;
    this.round = buildRound(level, seed, this.lastWord);
    this.lastWord = this.round.word;

    this.buildNests(this.round);
    this.buildEggs(level, this.round);

    this.handSeen = false;
    this.birdState.reset();
    this.guide.clear();
    this.lessonText.setVisible(level.kind === "training");
    this.ghost.setVisible(false);

    this.timer?.remove();
    this.timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickTimer() });

    this.progress = { ...this.blankProgress(level, index), status: "playing", score: this.score, streak: this.streak };
    this.emitProgress();
    analytics.track({ name: "level_started", gameId: WORD_EGGS_GAME_ID, levelId: level.id });
  }

  private buildNests(round: Round): void {
    const n = round.prompt.length;
    const spacing = Phaser.Math.Clamp(NEST_ROW_WIDTH / n, 130, 178);
    const width = spacing * 0.94;
    const startX = NEST_ROW_CENTER - ((n - 1) * spacing) / 2;
    const rng = createRng(round.seed);

    round.prompt.items.forEach((item, i) => {
      const x = startX + i * spacing;
      const nest = new NestView(this, x, this.branchTop(x) + 26, width, 9);
      this.nests.push(nest);
      if (item.kind === "missing") {
        nest.setEmpty(true);
        this.slotNest = nest;
      } else {
        const palette = this.level!.skin.palette;
        const egg = this.makeEggImage(item.content, palette[(i + rng.int(0, palette.length - 1)) % palette.length]);
        egg.setPosition(nest.eggX, nest.eggY).setDepth(10);
        egg.setScale((nest.width * 0.8) / EGG_TEXTURE_HEIGHT);
        this.promptEggs.push(egg);
      }
    });
  }

  private makeEggImage(content: { type: "text" | "number" | "shape" | "sprite" | "icon"; value: string | number }, colors: Pick<OptionSkinStyle, "primaryColor" | "secondaryColor">): Phaser.GameObjects.Image {
    const skin = OPTION_SKINS[this.level?.skin.id ?? "egg"];
    const rendered = skin.render(this.textures, content, colors);
    return this.add.image(0, 0, rendered.textureKey);
  }

  private buildEggs(level: WordEggsLevelConfig, round: Round): void {
    const rng = createRng(round.seed ^ 0x9e3779b9);
    const count = round.options.length;
    const spacing = count > 1 ? Math.min(190, 640 / (count - 1)) : 0;
    const startX = 700 - ((count - 1) * spacing) / 2;
    const skin = OPTION_SKINS[level.skin.id];
    const displayHeight = EGG_BASE_HEIGHT * level.skin.scale;
    const baseScale = displayHeight / EGG_TEXTURE_HEIGHT;
    const bodyRadius = 82;

    this.physicsCtl = new PhysicsOptionController(this, {
      enabled: level.physics.enabled,
      gravity: level.physics.gravity,
      bounce: level.physics.bounce,
      drag: level.physics.drag,
      bounds: { left: PLAY_LEFT, right: PLAY_RIGHT, top: 0, floor: FLOOR_Y },
    });

    const palette = level.skin.palette;
    const shuffled = rng.shuffle(palette);
    const items: PickItem[] = [];
    round.options.forEach((option, i) => {
      const colors = shuffled[i % shuffled.length];
      const rendered = skin.render(this.textures, option, colors);
      const x = startX + i * spacing + rng.int(-level.physics.spawnJitter, level.physics.spawnJitter);
      const y = 430 + rng.int(-30, 40);

      const sprite = this.physics.add.sprite(x, y, rendered.textureKey).setScale(baseScale).setDepth(20);
      sprite.setAngle(rng.int(-14, 14));
      this.physicsCtl!.add(sprite, bodyRadius);
      (sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(rng.int(-40, 40));

      const shadow = this.add.image(x, FLOOR_Y, "shadow").setDepth(19).setAlpha(0.6);
      const halo = this.add.image(x, y, "spark").setTint(0xfff0a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(19).setAlpha(0);
      halo.setDisplaySize(displayHeight * 1.5, displayHeight * 1.5);

      const item: PickItem = {
        id: option.id,
        option,
        x,
        y,
        radius: (displayHeight * 0.52) * level.interaction.pickRadiusScale + 18,
        homeX: x,
        homeY: y,
        state: "ground",
        offsetX: 0,
        offsetY: 0,
      };
      items.push(item);
      this.eggs.push({ item, sprite, shadow, halo, baseScale });
    });

    const slot = round.prompt.items[round.missingIndex];
    const zones: DropZone[] =
      slot.kind === "missing" && this.slotNest
        ? [
            {
              id: slot.id,
              x: this.slotNest.eggX,
              y: this.slotNest.eggY,
              dropRadius: level.interaction.dropRadius,
              magnetRadius: level.interaction.magnetRadius,
              expected: slot.expected,
            },
          ]
        : [];

    this.engine = new PickAndPlaceEngine(items, zones, {
      confidenceThreshold: 0.5,
      dragFollow: 0.42,
      magnetStrength: level.interaction.magnetStrength,
      handLostGraceMs: 500,
      returnDurationMs: 430,
    });
  }

  getProgress(): GameProgress {
    return this.progress;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (this.timer) this.timer.paused = paused;
    if (paused) {
      this.physics.world.pause();
      this.tweens.pauseAll();
    } else {
      this.physics.world.resume();
      this.tweens.resumeAll();
    }
  }

  update(_time: number, deltaMs: number): void {
    const hand = this.context.motion.hand("primary");
    const cursorPoint = this.palmToScreen(hand, deltaMs);

    this.parallax.update(deltaMs, hand.visible ? { x: (cursorPoint.x / W - 0.5) * 2, y: 0 } : null);
    this.burst.update(deltaMs);
    this.ambientSparks(deltaMs);
    this.nests.forEach((n) => n.update(deltaMs / 1000));

    this.cursor.setVisible(hand.visible && !this.paused);
    if (hand.visible) {
      this.cursor.setPosition(cursorPoint.x, cursorPoint.y);
      this.cursor.setGesture(hand.gesture);
    }
    if (this.paused || !this.level || !this.engine) return;

    if (hand.visible) {
      if (!this.handSeen) {
        this.handSeen = true;
        this.progress = { ...this.progress, waitingForHand: false };
      } else if (!this.handWasVisible) {
        analytics.track({ name: "tracking_recovered", gameId: WORD_EGGS_GAME_ID });
      }
    } else if (this.handWasVisible && this.handSeen) {
      analytics.track({ name: "tracking_lost", gameId: WORD_EGGS_GAME_ID });
    }
    this.handWasVisible = hand.visible;

    this.syncGroundEggsFromPhysics();

    const playing = this.progress.status === "playing" && this.handSeen;
    const input: HandInput = {
      visible: playing && hand.visible,
      confidence: hand.confidence,
      x: cursorPoint.x,
      y: cursorPoint.y,
      grabbing: this.isGrabbing(hand.gesture, this.level.interaction.dragGesture),
    };
    const events = this.engine.update(input, deltaMs);
    events.forEach((event) => this.handleEvent(event));

    this.applyViews(deltaMs);
    this.updateZoneGlow();
    // Training always shows the guide; other levels show it as a hint after 3 missed tries.
    const guided = this.level.kind === "training" || this.progress.wrongTries >= 3;
    if (guided) {
      this.lessonText.setVisible(true);
      this.drawTrainingGuide(deltaMs);
    }

    if (this.progress.status === "playing") this.emitProgress();
  }

  /** Smoothed palm position in game pixels — the hand's reachable range is stretched to fill the screen. */
  private palmToScreen(hand: ReturnType<MotionEngineHand>, deltaMs: number): { x: number; y: number } {
    if (!hand.visible) return this.lastPoint;
    const wrist = hand.landmark("wrist");
    const knuckle = hand.landmark("middleMCP");
    const px = (wrist.x + knuckle.x) / 2;
    const py = (wrist.y + knuckle.y) / 2;
    const smoothed = this.handFilter.filter(px, py, Math.max(deltaMs / 1000, 1 / 120));
    this.lastPoint = {
      x: Phaser.Math.Clamp((smoothed.x - 0.12) / 0.76, 0, 1) * W,
      y: Phaser.Math.Clamp((smoothed.y - 0.1) / 0.72, 0, 1) * H,
    };
    return this.lastPoint;
  }

  private lastPoint = { x: W / 2, y: H / 2 };

  private isGrabbing(gesture: "open" | "pinch" | "fist", want: DragGesture): boolean {
    if (want === "grab") return gesture === "fist";
    if (want === "pinch") return gesture === "pinch";
    return gesture !== "open";
  }

  /** Loose eggs are driven by physics; the engine just needs to know where they are. */
  private syncGroundEggsFromPhysics(): void {
    for (const egg of this.eggs) {
      if (egg.item.state === "ground") {
        egg.item.x = egg.sprite.x;
        egg.item.y = egg.sprite.y;
      }
    }
  }

  /** Pushes engine-controlled eggs onto their sprites and dresses the loose ones. */
  private applyViews(deltaMs: number): void {
    const hovered = this.engine?.hovered ?? null;
    for (const egg of this.eggs) {
      const { item, sprite, shadow, halo } = egg;
      const engineOwns = item.state !== "ground";
      if (engineOwns) sprite.setPosition(item.x, item.y);

      const dragging = item.state === "dragging";
      const target = dragging ? 1.14 : hovered === item.id ? 1.07 : 1;
      const scale = Phaser.Math.Linear(sprite.scaleX / egg.baseScale, target, 0.25) * egg.baseScale;
      if (item.state !== "placed") sprite.setScale(scale);
      sprite.setDepth(dragging ? 40 : item.state === "placed" ? 10 : 20);

      // Drag feels alive: a gentle tilt with motion.
      if (dragging) sprite.angle = Phaser.Math.Linear(sprite.angle, Phaser.Math.Clamp((item.x - sprite.x) * 0.6 + (sprite.body as Phaser.Physics.Arcade.Body).velocity.x * 0.01, -10, 10), 0.2);

      shadow.setVisible(item.state !== "placed");
      shadow.setPosition(sprite.x, FLOOR_Y + 2);
      const lift = Phaser.Math.Clamp((FLOOR_Y - sprite.y) / 400, 0, 1);
      shadow.setAlpha(0.65 - lift * 0.4).setDisplaySize(sprite.displayWidth * (1 - lift * 0.3) * 1.05, 26);

      const glow = dragging ? 0.55 : hovered === item.id ? 0.4 : 0;
      halo.setPosition(sprite.x, sprite.y).setAlpha(Phaser.Math.Linear(halo.alpha, glow, 0.2));
      void deltaMs;
    }
  }

  private updateZoneGlow(): void {
    if (!this.slotNest) return;
    const approach = this.engine?.approach();
    this.slotNest.setAttraction(approach ? approach.amount : 0);
  }

  private handleEvent(event: PickPlaceEvent): void {
    switch (event.type) {
      case "picked": {
        const egg = this.viewOf(event.item);
        this.physicsCtl?.setSimulated(egg.sprite, false);
        this.audio.playSfx("eggPickup");
        this.burst.emit(egg.sprite.x, egg.sprite.y, { count: 6, tint: [0xfff2a8, 0xffffff], speed: [30, 110], life: [0.3, 0.6], scale: [0.2, 0.4] });
        analytics.track({ name: "option_picked", gameId: WORD_EGGS_GAME_ID, levelId: this.progress.levelId });
        break;
      }
      case "dropped":
        this.audio.playSfx("eggDrop");
        analytics.track({ name: "option_dropped", gameId: WORD_EGGS_GAME_ID, levelId: this.progress.levelId });
        break;
      case "correct":
        this.handleCorrect(event.item, event.zone);
        break;
      case "incorrect":
        this.handleWrong(event.item);
        break;
      case "returned": {
        const egg = this.viewOf(event.item);
        egg.sprite.setAngle(Phaser.Math.Between(-10, 10));
        this.physicsCtl?.drop(egg.sprite, event.item.x, event.item.y - 6);
        break;
      }
      case "handLost":
        analytics.track({ name: "tracking_lost", gameId: WORD_EGGS_GAME_ID });
        break;
      default:
        break;
    }
  }

  private viewOf(item: PickItem): EggView {
    return this.eggs.find((e) => e.item === item)!;
  }

  private handleCorrect(item: PickItem, zone: DropZone): void {
    const egg = this.viewOf(item);
    const nest = this.slotNest!;
    nest.setEmpty(false);
    this.timer?.remove();

    // Settle into the nest: shrink to fit, drop in, small bounce.
    const fit = (nest.width * 0.8) / EGG_TEXTURE_HEIGHT;
    egg.sprite.setDepth(10);
    egg.halo.setAlpha(0);
    this.tweens.add({ targets: egg.sprite, x: zone.x, y: zone.y, scale: fit, angle: 0, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: egg.sprite, scaleY: fit * 1.12, scaleX: fit * 0.92, duration: 140, yoyo: true, delay: 260 });
    nest.celebrate(this);
    this.burst.emit(zone.x, zone.y, { count: 30, tint: [0xfff2a8, 0xffffff, 0xffb6e6, 0xb6f0ff], speed: [90, 320], gravity: 160, life: [0.9, 1.6] });

    // The finished word ripples: every egg hops in turn.
    const row = [...this.promptEggs, egg.sprite].sort((a, b) => a.x - b.x);
    row.forEach((piece, i) => {
      const base = piece === egg.sprite ? fit : piece.scaleX;
      this.tweens.add({ targets: piece, scale: base * 1.18, duration: 160, yoyo: true, delay: 420 + i * 110, ease: "Quad.easeOut" });
    });

    this.audio.playSfx("correct");
    this.time.delayedCall(250, () => this.audio.playSfx("success"));
    this.time.delayedCall(520, () => this.audio.playSfx("bloom"));
    this.time.delayedCall(300, () => this.audio.playSfx("birdChirp"));
    this.birdState.enter("happy");
    this.tweens.add({ targets: this.bird, y: this.bird.y - 16, duration: 170, yoyo: true, repeat: 2, ease: "Quad.easeOut" });
    this.light.setAlpha(0.22);
    this.tweens.add({ targets: this.light, alpha: 0, duration: 1100 });

    analytics.track({ name: "correct_answer", gameId: WORD_EGGS_GAME_ID, levelId: this.progress.levelId });
    this.finishLevel(item, zone);
  }

  private finishLevel(_item: PickItem, zone: DropZone): void {
    const level = this.level!;
    const isTraining = level.kind === "training";
    const isLast = this.progress.levelIndex === WORD_EGGS_LEVELS.length - 1;
    const stars = isTraining ? 3 : this.progress.wrongTries === 0 ? 3 : this.progress.wrongTries <= 2 ? 2 : 1;

    let gained = 0;
    if (!isTraining) {
      this.streak += 1;
      gained = 100 + this.streak * 10 + this.progress.timeRemainingSeconds;
      this.score += gained;
      this.flyScore(zone.x, zone.y - 40, gained);
    }
    if (isLast) this.audio.playSfx("levelComplete");

    this.progress = {
      ...this.progress,
      status: "success",
      score: this.score,
      streak: this.streak,
      stars,
      feedback: Phaser.Utils.Array.GetRandom(PRAISE),
    };
    this.lessonText.setVisible(false);
    this.guide.clear();
    this.ghost.setVisible(false);
    this.emitProgress();
    analytics.track({ name: "level_completed", gameId: WORD_EGGS_GAME_ID, levelId: level.id, stars, score: this.score });
  }

  /** "+110" rises from the nest and flies to the score in the top-left. */
  private flyScore(x: number, y: number, amount: number): void {
    const text = this.add
      .text(x, y, `+${amount}`, { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: "44px", fontStyle: "800", color: "#ffe27a", stroke: "#5a3a00", strokeThickness: 7 })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({ targets: text, y: y - 60, duration: 500, ease: "Quad.easeOut" });
    this.tweens.add({ targets: text, x: 110, y: 82, scale: 0.6, alpha: 0.2, delay: 700, duration: 700, ease: "Cubic.easeIn", onComplete: () => text.destroy() });
  }

  private handleWrong(item: PickItem): void {
    const egg = this.viewOf(item);
    analytics.track({ name: "incorrect_answer", gameId: WORD_EGGS_GAME_ID, levelId: this.progress.levelId });
    this.audio.playSfx("encourage");
    this.audio.playSfx("birdSad");
    this.birdState.enter("fail");

    // A gentle shake and a soft orange tint — the egg is never removed.
    egg.sprite.setTint(0xffb380);
    this.time.delayedCall(550, () => egg.sprite.clearTint());
    this.tweens.add({ targets: egg.sprite, angle: { from: -12, to: 12 }, duration: 70, yoyo: true, repeat: 4, onComplete: () => (egg.sprite.angle = 0) });
    this.burst.emit(egg.sprite.x, egg.sprite.y, { count: 8, tint: [0xffb380, 0xffffff], speed: [40, 140], gravity: 200, life: [0.4, 0.8], scale: [0.25, 0.5] });

    const message = Phaser.Utils.Array.GetRandom(ENCOURAGEMENT);
    this.progress = { ...this.progress, wrongTries: this.progress.wrongTries + 1, feedback: message };
    this.time.delayedCall(2200, () => {
      if (this.progress.feedback === message) {
        this.progress = { ...this.progress, feedback: null };
        this.emitProgress();
      }
    });
    this.emitProgress();
  }

  /** Training: a ghost hand shows the whole move — grab the egg, carry it along the dotted path, let go. */
  private drawTrainingGuide(deltaMs: number): void {
    const correct = this.eggs.find((e) => e.item.option.correct);
    const zone = this.engine?.zones[0];
    const g = this.guide;
    g.clear();
    if (!correct || !zone || this.progress.status !== "playing") return;

    const dragging = correct.item.state === "dragging";
    const held = this.engine?.dragging !== null;
    const from = { x: correct.sprite.x, y: correct.sprite.y };
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 260);

    // Dotted path egg → nest, flowing toward the nest.
    const phase = (this.time.now / 1100) % 1;
    const start = dragging ? { x: correct.item.x, y: correct.item.y } : from;
    for (let i = 0; i < 16; i++) {
      const t = (i + phase) / 16;
      const x = Phaser.Math.Linear(start.x, zone.x, t);
      const y = Phaser.Math.Linear(start.y, zone.y, t) - Math.sin(t * Math.PI) * 60;
      g.fillStyle(0xfff2a8, 0.25 + 0.6 * Math.sin(t * Math.PI));
      g.fillCircle(x, y, 4 + 4 * Math.sin(t * Math.PI));
    }

    // Animated arrow over the nest.
    g.lineStyle(10, 0xffffff, 0.85);
    const ay = zone.y - 120 + pulse * 14;
    g.lineBetween(zone.x, ay - 40, zone.x, ay);
    g.lineBetween(zone.x, ay, zone.x - 18, ay - 20);
    g.lineBetween(zone.x, ay, zone.x + 18, ay - 20);

    // Ghost hand loops through: reach → grab → carry → release.
    if (held) {
      this.ghost.setVisible(false);
    } else {
      const cycle = (this.time.now / 4200) % 1;
      const reach = Phaser.Math.Clamp(cycle / 0.18, 0, 1);
      const carry = Phaser.Math.Easing.Sine.InOut(Phaser.Math.Clamp((cycle - 0.3) / 0.5, 0, 1));
      const x = Phaser.Math.Linear(from.x, zone.x, carry);
      const y = Phaser.Math.Linear(from.y, zone.y, carry) - Math.sin(carry * Math.PI) * 60 + (1 - reach) * 60;
      this.ghost.setVisible(true).setPosition(x, y + 20).setAlpha(0.35 + 0.4 * reach * (cycle < 0.92 ? 1 : 0.3));
      this.ghost.setGesture(cycle > 0.2 && cycle < 0.82 ? "fist" : "open");
    }

    this.lessonText.setText(held ? (this.engine!.approach() ? "Let go!" : "Drag it to the empty nest") : "Pick up the egg");
    this.lessonText.setAlpha(0.88 + 0.12 * pulse);
    void deltaMs;
  }

  private ambientSparks(deltaMs: number): void {
    this.ambient += deltaMs;
    if (this.ambient < 700) return;
    this.ambient = 0;
    this.burst.emit(Phaser.Math.Between(60, W - 60), Phaser.Math.Between(180, 560), {
      count: 1,
      tint: 0xfff0a0,
      speed: [6, 18],
      angle: [-Math.PI * 0.8, -Math.PI * 0.2],
      life: [3, 5],
      scale: [0.18, 0.32],
      endScale: 0.05,
    });
  }

  private tickTimer(): void {
    const level = this.level;
    if (!level?.timed || this.progress.status !== "playing" || !this.handSeen || this.paused) return;
    if (!this.context.motion.hand("primary").visible) return;

    const remaining = Math.max(0, this.progress.timeRemainingSeconds - 1);
    this.progress = { ...this.progress, timeRemainingSeconds: remaining };
    if (remaining === 0) {
      this.timer?.remove();
      this.audio.playSfx("fail");
      this.audio.playSfx("birdSad");
      this.birdState.enter("fail");
      analytics.track({ name: "level_failed", gameId: WORD_EGGS_GAME_ID, levelId: level.id });
      this.progress = { ...this.progress, status: "failed", feedback: "Nice try! Let’s go again." };
    }
    this.emitProgress();
  }

  private teardownLevel(): void {
    this.engine?.reset();
    this.engine = null;
    this.eggs.forEach((e) => {
      this.physicsCtl?.remove(e.sprite);
      e.sprite.destroy();
      e.shadow.destroy();
      e.halo.destroy();
    });
    this.eggs = [];
    this.nests.forEach((n) => n.destroy());
    this.nests = [];
    this.promptEggs.forEach((e) => e.destroy());
    this.promptEggs = [];
    this.slotNest = null;
    this.physicsCtl?.destroy();
    this.physicsCtl = null;
    this.tweens.killAll();
    this.handFilter.reset();
  }

  private blankProgress(level: WordEggsLevelConfig, index: number): GameProgress {
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
      levelIndex: index,
      totalLevels: WORD_EGGS_LEVELS.length,
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
    this.teardownLevel();
    this.burst.destroy();
    this.time.removeAllEvents();
  }
}

type MotionEngineHand = GameContext["motion"]["hand"];
