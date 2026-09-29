import styles from "./DecorativeBackground.module.css";

/**
 * A handful of soft organic blobs behind the dashboard content — plain
 * radial-gradient shapes (no images, no SVGs, no blur filters), so this
 * costs almost nothing to paint. Purely decorative: it never intercepts
 * clicks and every real section sits above it (see HomePage's z-index).
 */
export function DecorativeBackground() {
  return (
    <div className={styles.layer} aria-hidden="true">
      <span className={`${styles.blob} ${styles.cream}`} />
      <span className={`${styles.blob} ${styles.peach}`} />
      <span className={`${styles.blob} ${styles.blue}`} />
      <span className={`${styles.blob} ${styles.mint}`} />
      <span className={`${styles.blob} ${styles.rightMint}`} />
      <span className={styles.yellowOval} />

      <span className={styles.leaf} style={{ top: "14%", left: "38%", transform: "rotate(-18deg)" }} />
      <span className={styles.leaf} style={{ top: "58%", right: "20%", transform: "rotate(24deg) scale(0.8)" }} />

      <span className={styles.dot} style={{ width: 10, height: 10, top: "20%", right: "24%" }} />
      <span className={styles.dot} style={{ width: 7, height: 7, top: "8%", left: "6%" }} />
      <span className={styles.dot} style={{ width: 6, height: 6, top: "66%", right: "10%" }} />
    </div>
  );
}
