import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Play, Star, Sparkles } from "lucide-react";
import type { Adventure } from "../types/endeavour";
import styles from "./AdventureIsland.module.css";

interface AdventureIslandProps {
  adventure: Adventure;
  highlighted: boolean;
  justUnlocked: boolean;
  reduceMotion: boolean;
  onSelect: (adventure: Adventure) => void;
}

function accessibleLabel(adventure: Adventure): string {
  switch (adventure.status) {
    case "completed":
      return `${adventure.title}. Completed. ${adventure.stars} star${adventure.stars === 1 ? "" : "s"}.`;
    case "in_progress":
      return `${adventure.title}. In progress, ${adventure.progress}% complete.`;
    case "available":
      return `${adventure.title}. Available to play.`;
    case "locked":
    default:
      return `${adventure.title}. Locked.`;
  }
}

const PARTICLE_COUNT = 8;

/**
 * The one and only island renderer — every adventure, regardless of title or
 * art, goes through this component (see PROMPT section 5). All visual
 * differences come from `adventure` data, never from id/title conditionals.
 */
export function AdventureIsland({ adventure, highlighted, justUnlocked, reduceMotion, onSelect }: AdventureIslandProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const locked = adventure.status === "locked";

  return (
    <button
      type="button"
      className={`${styles.island} ${locked ? styles.locked : ""} ${highlighted ? styles.highlighted : ""}`}
      style={{ left: `${adventure.position.x}%`, top: `${adventure.position.y}%` }}
      onClick={() => onSelect(adventure)}
      aria-label={accessibleLabel(adventure)}
      data-status={adventure.status}
    >
      {highlighted && !reduceMotion && (
        <span className={styles.particles} aria-hidden="true">
          {Array.from({ length: PARTICLE_COUNT }).map((_, index) => (
            <span
              key={index}
              className={styles.particle}
              style={{ ["--i" as string]: index, ["--accent" as string]: adventure.theme.accent }}
            />
          ))}
        </span>
      )}

      <motion.div
        className={styles.artWrap}
        whileHover={reduceMotion ? undefined : { scale: 1.14 }}
        whileFocus={reduceMotion ? undefined : { scale: 1.14 }}
        whileTap={reduceMotion ? undefined : { scale: 1.06 }}
        transition={{ type: "spring", stiffness: 340, damping: 20 }}
      >
        <span className={styles.hoverGlow} style={{ ["--accent" as string]: adventure.theme.accent }} aria-hidden="true" />
        {highlighted && <span className={styles.glow} aria-hidden="true" />}

        <motion.div
          className={styles.bobber}
          animate={
            reduceMotion
              ? undefined
              : adventure.status === "available" || adventure.status === "in_progress"
                ? { y: [0, -6, 0] }
                : undefined
          }
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className={styles.orderBadge} aria-hidden="true">
            {adventure.order}
          </span>

          {!imageFailed ? (
            <img
              className={styles.artwork}
              src={adventure.islandImage}
              alt=""
              loading={highlighted ? "eager" : "lazy"}
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className={styles.fallback} style={{ background: adventure.theme.accent }} aria-hidden="true">
              {adventure.title.charAt(0)}
            </span>
          )}

          {locked && (
            <span className={styles.lockOverlay} aria-hidden="true">
              <Lock size={22} strokeWidth={2.2} />
            </span>
          )}

          {adventure.status === "available" && (
            <span className={styles.playOverlay} aria-hidden="true">
              <Play size={22} strokeWidth={0} fill="currentColor" />
            </span>
          )}

          {justUnlocked && (
            <motion.span
              className={styles.newBadge}
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.6, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Sparkles size={13} strokeWidth={2.4} aria-hidden="true" />
              New!
            </motion.span>
          )}
        </motion.div>
      </motion.div>

      <span className={styles.sign}>
        <span className={styles.signTitle}>{adventure.title}</span>
        <span className={styles.signSubtitle}>{adventure.subtitle}</span>

        {adventure.status === "completed" && (
          <span className={styles.stars} aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <Star key={n} size={13} strokeWidth={0} fill={n <= adventure.stars ? "#ffb020" : "#e4e2ee"} />
            ))}
          </span>
        )}

        {adventure.status === "in_progress" && (
          <span className={styles.progressTrack} aria-hidden="true">
            <span className={styles.progressFill} style={{ width: `${adventure.progress}%` }} />
          </span>
        )}

        {locked && adventure.requiredAdventureId && (
          <span className={styles.lockedHint}>Locked</span>
        )}
      </span>

      {highlighted && (
        <span className={styles.cta}>
          {adventure.status === "in_progress" ? "Continue" : "Play Now"}
        </span>
      )}
    </button>
  );
}
