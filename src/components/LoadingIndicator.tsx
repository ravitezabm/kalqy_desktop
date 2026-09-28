import { motion } from "framer-motion";
import styles from "./LoadingIndicator.module.css";

interface LoadingIndicatorProps {
  size?: number;
  color?: string;
  delay?: number;
}

export function LoadingIndicator({ size = 28, color = "var(--color-yellow)", delay = 0.4 }: LoadingIndicatorProps) {
  return (
    <motion.div
      className={styles.ring}
      style={{ width: size, height: size, borderTopColor: color, borderRightColor: color }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, rotate: 360 }}
      transition={{
        opacity: { duration: 0.5, delay },
        rotate: {
          duration: 1.1,
          repeat: Infinity,
          ease: "linear",
        },
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
