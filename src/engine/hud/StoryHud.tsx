import { Timer, Flame, Star, Footprints, Brain, Lightbulb, Pause } from "lucide-react";
import type { GameProgress } from "../core/KalqyGame";
import styles from "./StoryHud.module.css";

export interface HudGoal {
  id: string;
  label: string;
  value: number;
  target: number;
  /** Picture instead of an icon (level goals such as "Apples"). */
  image?: string;
}

interface StoryHudProps {
  progress: GameProgress;
  /** Top-center title, e.g. "Level 2 · Follow the butterfly!". */
  headline: string;
  /** Shown in the title card and hold bar when the player isn't being tracked. */
  lostHint: string;
  /** Hold-bar message while nothing is happening yet. */
  idleMessage: string;
  playerName: string;
  avatar: string | null;
  goals: HudGoal[];
  tip: string;
  trackingLost: boolean;
  /** Games without a hold bar / goals panel (e.g. drag-and-drop) turn them off. */
  showGoals?: boolean;
  showHoldBar?: boolean;
  onPause: () => void;
  onExit: () => void;
}

const GOAL_ICONS = { move: Footprints, brain: Brain, streak: Star } as const;
const GOAL_COLORS = { move: "#4caf50", brain: "#ff9f1c", streak: "#8b5cf6" } as const;

/** Glass-panel HUD rendered as a DOM overlay above the Phaser canvas — shared by every story game. */
export function StoryHud({ progress, headline, lostHint, idleMessage, playerName, avatar, goals, tip, trackingLost, showGoals = true, showHoldBar = true, onPause, onExit }: StoryHudProps) {
  const holdPercent = Math.round(progress.holdProgress * 100);
  const message = trackingLost
    ? lostHint
    : progress.feedback ?? (holdPercent > 0 ? "Great! Keep going!" : idleMessage);

  return (
    <div className={styles.hud}>
      <div className={`${styles.panel} ${styles.player}`}>
        {avatar && <img className={styles.avatar} src={avatar} alt="" />}
        <div className={styles.playerText}>
          <span className={styles.playerName}>{playerName}</span>
          <span className={styles.stat}>
            <Star size={16} fill="#ffd166" color="#ffd166" aria-hidden="true" />
            {progress.score}
          </span>
        </div>
      </div>

      <div className={`${styles.panel} ${styles.instruction}`}>
        <strong>
          {headline}
        </strong>
        {!trackingLost && progress.goals?.some((goal) => goal.image) && (
          <span className={styles.targets} aria-hidden="true">
            {progress.goals.map((goal) => {
              const left = Math.max(0, goal.target - goal.value);
              return (
                <span key={goal.id} className={`${styles.targetChip} ${left === 0 ? styles.targetDone : ""}`}>
                  <img src={goal.image} alt="" />
                  <b>{left === 0 ? "✓" : `×${left}`}</b>
                </span>
              );
            })}
          </span>
        )}
        <span>{trackingLost ? lostHint : !showHoldBar ? (progress.feedback ?? progress.hint) : progress.hint}</span>
      </div>

      <div className={styles.topRight}>
        <div className={`${styles.panel} ${styles.metric}`}>
          <Timer size={20} aria-hidden="true" />
          <strong>{progress.timed === false ? "--" : progress.timeRemainingSeconds}</strong>
          <span>sec</span>
        </div>
        <div className={`${styles.panel} ${styles.metric}`}>
          <Flame size={20} color="#ff9f43" aria-hidden="true" />
          <strong>{progress.streak}</strong>
          <span>streak</span>
        </div>
        <button type="button" className={styles.pause} onClick={onPause} aria-label="Pause">
          <Pause size={18} fill="currentColor" aria-hidden="true" />
        </button>
        <button type="button" className={styles.exit} onClick={onExit}>
          Exit
        </button>
      </div>

      {showGoals && !progress.tutorial && (
      <div className={`${styles.panel} ${styles.goals}`}>
        <strong className={styles.goalsTitle}>Today&rsquo;s Goal</strong>
        {(progress.goals ?? goals).map((goal) => {
          const key = goal.id as keyof typeof GOAL_ICONS;
          const Icon = GOAL_ICONS[key] ?? Star;
          return (
            <div key={goal.id} className={styles.goal}>
              {"image" in goal && goal.image ? (
                <img className={styles.goalImage} src={goal.image} alt="" />
              ) : (
                <span className={styles.goalIcon} style={{ background: GOAL_COLORS[key] ?? "#8b5cf6" }}>
                  <Icon size={18} aria-hidden="true" />
                </span>
              )}
              <span className={styles.goalText}>
                <span>{goal.label}</span>
                <strong>
                  {Math.min(goal.value, goal.target)}/{goal.target}
                </strong>
              </span>
            </div>
          );
        })}
      </div>
      )}

      {!progress.tutorial && (
      <div className={`${styles.panel} ${styles.tip}`}>
        <span className={styles.tipTitle}>
          <Lightbulb size={20} color="#ffd166" aria-hidden="true" />
          <strong>Tip</strong>
        </span>
        <span>{tip}</span>
      </div>
      )}

      {showHoldBar && (
      <div className={`${styles.panel} ${styles.hold}`} role="progressbar" aria-valuenow={holdPercent} aria-valuemin={0} aria-valuemax={100}>
        <span>{message}</span>
        <span className={styles.trackWrap}>
          <span className={styles.track}>
            <span className={styles.fill} style={{ width: `${holdPercent}%` }} />
          </span>
          {[0, 50, 100].map((mark) => (
            <Star
              key={mark}
              className={styles.markStar}
              style={{ left: `${mark}%` }}
              size={22}
              fill={holdPercent >= mark && (mark > 0 || holdPercent > 0) ? "#ffd166" : "rgba(255,255,255,0.35)"}
              color="#ffffff"
              aria-hidden="true"
            />
          ))}
        </span>
      </div>
      )}
    </div>
  );
}
