import { Clock, Trophy, Star } from "lucide-react";
import { useCountdown } from "../hooks/useCountdown";
import type { DailyChallenge } from "../types/dashboard";
import styles from "./DailyChallengeCard.module.css";

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  onPlay: (challenge: DailyChallenge) => void;
}

/** Renders inside <ChallengeBoard> — no background/frame of its own. */
export function DailyChallengeCard({ challenge, onPlay }: DailyChallengeCardProps) {
  const countdown = useCountdown(challenge.expiresAt);

  const target = Math.max(1, challenge.target);
  const progress = Math.min(Math.max(0, challenge.progress), target);
  const percent = Math.round((progress / target) * 100);

  return (
    <section className={styles.card} aria-label="Daily Challenge">
      <header className={styles.header}>
        <span className={styles.timer} data-expired={countdown.expired}>
          <Clock size={12} strokeWidth={2.2} aria-hidden="true" />
          <span aria-live="off">{countdown.expired ? "Expired" : countdown.label}</span>
        </span>
      </header>

      <div className={styles.body}>
        <span className={styles.trophy} aria-hidden="true">
          <Trophy size={18} strokeWidth={1.8} />
        </span>

        <div className={styles.details}>
          <p className={styles.goal}>{challenge.title}</p>
          <div className={styles.progressRow}>
            <span className={styles.progressTrack}>
              <span className={styles.progressFill} style={{ width: `${percent}%` }} />
            </span>
            <span className={styles.progressValue}>
              {progress} / {target}
            </span>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <span className={styles.rewardValue}>
          <Star size={14} strokeWidth={1.8} fill="#f2c230" color="#f2c230" aria-hidden="true" />
          {challenge.reward.amount} {challenge.reward.type}
        </span>

        <button
          type="button"
          className={styles.playButton}
          onClick={() => onPlay(challenge)}
          disabled={countdown.expired}
        >
          {countdown.expired ? "Come back tomorrow" : "Play Now"}
        </button>
      </footer>
    </section>
  );
}
