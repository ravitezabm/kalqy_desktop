import { motion } from "framer-motion";
import styles from "./IllustrationPanel.module.css";

interface IllustrationPanelProps {
  src?: string;
  alt?: string;
}

const EDGE_ID = "kalqy-illustration-edge";

export function IllustrationPanel({ src, alt = "" }: IllustrationPanelProps) {
  return (
    <motion.div
      className={styles.panel}
      data-mode={src ? "image" : "placeholder"}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {!src && (
        <svg
          className={styles.edge}
          viewBox="0 0 100 800"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            id={EDGE_ID}
            d="M100,0
               C60,40 100,90 70,140
               C40,190 100,230 75,280
               C50,330 100,380 70,430
               C40,480 100,520 75,570
               C50,620 100,660 70,710
               C40,760 100,780 100,800
               L0,800 L0,0 Z"
          />
        </svg>
      )}

      {src ? (
        <img className={styles.image} src={src} alt={alt} />
      ) : (
        <div className={styles.placeholder} role="img" aria-label="Kalqy illustration placeholder">
          <div className={styles.placeholderGlyphs}>
            <span className={styles.dotYellow} />
            <span className={styles.dotPink} />
            <span className={styles.dotGreen} />
          </div>
          <p className={styles.placeholderLabel}>Artwork slot</p>
        </div>
      )}
    </motion.div>
  );
}
