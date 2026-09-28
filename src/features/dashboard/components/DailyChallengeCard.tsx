import { Clock, Trophy, Star } from "lucide-react";
import { useCountdown } from "../hooks/useCountdown";
import type { DailyChallenge } from "../types/dashboard";
import styles from "./DailyChallengeCard.module.css";

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  onPlay: (challenge: DailyChallenge) => void;
}

export function DailyChallengeCard({ challenge, onPlay }: DailyChallengeCardProps) {
  const countdown = useCountdown(challenge.expiresAt);

  const target = Math.max(1, challenge.target);
  const progress = Math.min(Math.max(0, challenge.progress), target);
  const percent = Math.round((progress / target) * 100);

  return (
    <section className={styles.card} aria-labelledby="daily-challenge-title">
      <header className={styles.header}>
        <h3 className={styles.title} id="daily-challenge-title">
          Daily Challenge
        </h3>
        <span className={styles.timer} data-expired={countdown.expired}>
          <Clock size={14} strokeWidth={2} aria-hidden="true" />
          <span aria-live="off">{countdown.expired ? "Expired" : countdown.label}</span>
        </span>
      </header>

      <div className={styles.body}>
        <span className={styles.trophy} aria-hidden="true">
          <Trophy size={26} strokeWidth={1.8} />
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
        <div className={styles.reward}>
          <span className={styles.rewardLabel}>Reward</span>
          <span className={styles.rewardValue}>
            <Star size={18} strokeWidth={1.8} fill="#f2c230" color="#f2c230" aria-hidden="true" />
            {challenge.reward.amount} {challenge.reward.type}
          </span>
        </div>

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
