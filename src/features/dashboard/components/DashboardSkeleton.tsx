import styles from "./DashboardSkeleton.module.css";

const STAT_PLACEHOLDERS = [0, 1, 2, 3];
const CARD_PLACEHOLDERS = [0, 1, 2, 3];

export function DashboardSkeleton() {
  return (
    <div className={styles.wrap} role="status" aria-label="Loading your world">
      <div className={styles.headerRow}>
        <span className={`${styles.block} ${styles.greeting}`} />
        <span className={`${styles.block} ${styles.search}`} />
      </div>

      <span className={`${styles.block} ${styles.hero}`} />

      <div className={styles.statsRow}>
        {STAT_PLACEHOLDERS.map((index) => (
          <span key={index} className={`${styles.block} ${styles.stat}`} />
        ))}
      </div>

      <div className={styles.cardsRow}>
        {CARD_PLACEHOLDERS.map((index) => (
          <span key={index} className={`${styles.block} ${styles.card}`} />
        ))}
        <span className={`${styles.block} ${styles.challenge}`} />
      </div>
    </div>
  );
}
