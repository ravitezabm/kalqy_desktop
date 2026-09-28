import { motion } from "framer-motion";
import type { ReactNode } from "react";
import styles from "./SocialButton.module.css";

interface SocialButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  "aria-label"?: string;
}

export function SocialButton({ icon, label, onClick, ...rest }: SocialButtonProps) {
  return (
    <motion.button
      type="button"
      className={styles.button}
      whileHover={{ borderColor: "var(--color-text-muted)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={onClick}
      {...rest}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </motion.button>
  );
}
