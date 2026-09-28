import styles from "./WorldError.module.css";

interface WorldErrorProps {
  onRetry: () => void;
}

export function WorldError({ onRetry }: WorldErrorProps) {
  return (
    <div className={styles.error} role="alert">
      <p className={styles.title}>Your adventure map couldn&rsquo;t load.</p>
      <button type="button" className={styles.button} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
