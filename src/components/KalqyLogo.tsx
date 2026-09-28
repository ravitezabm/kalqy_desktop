import { motion } from "framer-motion";
import styles from "./KalqyLogo.module.css";

interface KalqyLogoProps {
  size?: "md" | "lg";
}

const LETTERS: { char: string; colorVar: string }[] = [
  { char: "k", colorVar: "var(--color-yellow)" },
  { char: "a", colorVar: "var(--color-green)" },
  { char: "l", colorVar: "var(--color-pink)" },
  { char: "q", colorVar: "var(--color-pink)" },
  { char: "y", colorVar: "var(--color-yellow)" },
];

export function KalqyLogo({ size = "lg" }: KalqyLogoProps) {
  return (
    <motion.div
      className={styles.logo}
      data-size={size}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {LETTERS.map((letter, index) => (
        <span
          key={`${letter.char}-${index}`}
          className={styles.letter}
          style={{ color: letter.colorVar }}
        >
          {letter.char}
        </span>
      ))}
    </motion.div>
  );
}
