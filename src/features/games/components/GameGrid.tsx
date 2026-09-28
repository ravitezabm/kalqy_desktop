import { motion, useReducedMotion } from "framer-motion";
import { GameCard } from "./GameCard";
import type { GameCardVariant } from "./GameCard";
import type { Game } from "../types/game";
import styles from "./GameGrid.module.css";

const STAGGER_STEP_S = 0.04;
const MAX_STAGGER_S = 0.3;

interface GameGridProps {
  games: Game[];
  onLaunch: (game: Game) => void;
  variant?: GameCardVariant;
  emptyTitle?: string;
  emptyText?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function GameGrid({
  games,
  onLaunch,
  variant = "library",
  emptyTitle = "No games match these filters yet.",
  emptyText = "Try removing a filter or two to see more adventures.",
  emptyActionLabel,
  onEmptyAction,
}: GameGridProps) {
  const reduceMotion = Boolean(useReducedMotion());

  if (games.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>{emptyTitle}</p>
        <p className={styles.emptyText}>{emptyText}</p>
        {emptyActionLabel && onEmptyAction && (
          <button type="button" className={styles.emptyCta} onClick={onEmptyAction}>
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.grid} data-variant={variant}>
      {games.map((game, index) => (
        <motion.div
          key={game.id}
          layout={!reduceMotion}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10, scale: reduceMotion ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.24,
            // Cap the stagger so a large catalogue never crawls in.
            delay: reduceMotion ? 0 : Math.min(index * STAGGER_STEP_S, MAX_STAGGER_S),
            ease: "easeOut",
          }}
        >
          <GameCard game={game} variant={variant} onLaunch={onLaunch} />
        </motion.div>
      ))}
    </div>
  );
}
