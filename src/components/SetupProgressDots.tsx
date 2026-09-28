import { motion } from "framer-motion";
import styles from "./SetupProgressDots.module.css";

interface SetupProgressDotsProps {
  activeCount: number;
  total: number;
}

export function SetupProgressDots({ activeCount, total }: SetupProgressDotsProps) {
  const dots = Array.from({ length: total }, (_, index) => index);

  return (
    <div className={styles.row} aria-hidden="true">
      {dots.map((index) => {
        const isActive = index < activeCount;
        return (
          <motion.span
            key={index}
            className={styles.dot}
            data-active={isActive}
            animate={{ scale: isActive ? 1.05 : 1 }}
            initial={false}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
