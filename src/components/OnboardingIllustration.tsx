import { motion, useReducedMotion } from "framer-motion";
import styles from "./OnboardingIllustration.module.css";

interface OnboardingIllustrationProps {
  src?: string;
  alt: string;
  maxWidth?: number;
}

export function OnboardingIllustration({ src, alt, maxWidth = 500 }: OnboardingIllustrationProps) {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <motion.div
      className={styles.wrap}
      style={{ maxWidth }}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {src ? (
        <img className={styles.image} src={src} alt={alt} />
      ) : (
        <div className={styles.placeholder} role="img" aria-label={alt}>
          <span className={styles.placeholderLabel}>Illustration slot</span>
        </div>
      )}
    </motion.div>
  );
}
