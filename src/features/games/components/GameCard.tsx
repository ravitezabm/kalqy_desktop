import { memo, useState } from "react";
import { Play } from "lucide-react";
import { labelFor } from "../types/taxonomy";
import type { Game } from "../types/game";
import styles from "./GameCard.module.css";

const VISIBLE_BADGES = 2;

export type GameCardVariant = "compact" | "library";

interface GameCardProps {
  game: Game;
  variant?: GameCardVariant;
  onLaunch: (game: Game) => void;
}

function clampProgress(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function GameCardComponent({ game, variant = "library", onLaunch }: GameCardProps) {
  const [showAllBadges, setShowAllBadges] = useState(false);
  const progress = clampProgress(game.progress);

  // Badges are derived from the game's own taxonomy, never hardcoded.
  const badgeIds = variant === "library" ? [...game.subjects, ...game.skills] : [];
  const visibleBadges = showAllBadges ? badgeIds : badgeIds.slice(0, VISIBLE_BADGES);
  const hiddenCount = badgeIds.length - visibleBadges.length;

  return (
    <article
      className={styles.card}
      data-variant={variant}
      style={{ ["--card-accent" as string]: game.accent ?? "#6d3fc7" }}
    >
      <button
        type="button"
        className={styles.surface}
        onClick={() => onLaunch(game)}
        disabled={!game.playable}
        aria-label={`Play ${game.title}${game.level ? `, level ${game.level}` : ""}, ${progress}% complete`}
      >
        <span className={styles.media}>
          {game.image ? (
            <img className={styles.image} src={game.image} alt="" loading="lazy" />
          ) : (
            <span className={styles.imageFallback} aria-hidden="true" />
          )}
        </span>

        {variant === "compact" && (
          <span className={styles.compactTop}>
            <span className={styles.title}>{game.title}</span>
            <span className={styles.subtitle}>{labelFor(game.subjects[0] ?? "")}</span>
          </span>
        )}

        <span className={styles.playButton} aria-hidden="true">
          <Play size={16} strokeWidth={2.6} fill="currentColor" />
        </span>

        <span className={styles.bottom}>
          {variant === "library" && <span className={styles.title}>{game.title}</span>}

          {variant === "library" && badgeIds.length > 0 && (
            <span className={styles.badges}>
              {visibleBadges.map((id) => (
                <span key={id} className={styles.badge}>
                  {labelFor(id)}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span
                  className={styles.badgeMore}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowAllBadges(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      setShowAllBadges(true);
                    }
                  }}
                  aria-label={`Show ${hiddenCount} more tags for ${game.title}`}
                >
                  +{hiddenCount}
                </span>
              )}
            </span>
          )}

          <span className={styles.progressRow}>
            {game.level !== undefined && <span className={styles.level}>Level {game.level}</span>}
            <span className={styles.progressTrack}>
              <span className={styles.progressFill} style={{ width: `${progress}%` }} />
            </span>
            <span className={styles.progressValue}>{progress}%</span>
          </span>
        </span>
      </button>
    </article>
  );
}

export const GameCard = memo(GameCardComponent);
