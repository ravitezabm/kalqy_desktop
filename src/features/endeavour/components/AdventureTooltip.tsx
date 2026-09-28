import { motion } from "framer-motion";
import type { Adventure } from "../types/endeavour";
import styles from "./AdventureTooltip.module.css";

interface AdventureTooltipProps {
  adventure: Adventure;
  requiredTitle: string | null;
}

/** A lightweight explanation shown on clicking a locked island — never a modal. */
export function AdventureTooltip({ adventure, requiredTitle }: AdventureTooltipProps) {
  return (
    <motion.div
      className={styles.tooltip}
      style={{ left: `${adventure.position.x}%`, top: `${adventure.position.y}%` }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.18 }}
      role="status"
    >
      {requiredTitle ? `Complete ${requiredTitle} to unlock` : "This adventure isn't ready yet"}
    </motion.div>
  );
}
