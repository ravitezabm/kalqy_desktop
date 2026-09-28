import { motion } from "framer-motion";
import styles from "./BottomBadge.module.css";

interface BottomBadgeProps {
  label: string;
}

export function BottomBadge({ label }: BottomBadgeProps) {
  return (
    <motion.div
      className={styles.badge}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className={styles.dot} />
      <span className={styles.label}>{label}</span>
    </motion.div>
  );
}
