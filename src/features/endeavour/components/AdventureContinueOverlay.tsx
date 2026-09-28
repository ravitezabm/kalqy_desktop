import { motion, useReducedMotion } from "framer-motion";
import type { Adventure } from "../types/endeavour";
import styles from "./AdventureContinueOverlay.module.css";

interface AdventureContinueOverlayProps {
  adventure: Adventure;
  onContinue: (adventure: Adventure) => void;
}

/**
 * Appears only for an in_progress adventure, styled as part of the world
 * rather than a modal (see PROMPT section 9).
 */
export function AdventureContinueOverlay({ adventure, onContinue }: AdventureContinueOverlayProps) {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <motion.div
      className={styles.overlay}
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <img className={styles.thumb} src={adventure.islandImage} alt="" />
      <div className={styles.body}>
        <p className={styles.eyebrow}>Continue adventure</p>
        <p className={styles.title}>{adventure.title}</p>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} style={{ width: `${adventure.progress}%` }} />
        </span>
      </div>
      <button type="button" className={styles.button} onClick={() => onContinue(adventure)}>
        Continue
      </button>
    </motion.div>
  );
}
