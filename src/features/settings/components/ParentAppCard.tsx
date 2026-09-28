import { Smartphone } from "lucide-react";
import styles from "./ParentAppCard.module.css";

interface ParentAppCardProps {
  onOpen: () => void;
}

export function ParentAppCard({ onOpen }: ParentAppCardProps) {
  return (
    <section className={styles.card}>
      <span className={styles.iconSlot} aria-hidden="true">
        <Smartphone size={24} strokeWidth={1.8} />
      </span>

      <div className={styles.text}>
        <h2 className={styles.title}>Manage Kalqy from your phone</h2>
        <p className={styles.subtitle}>
          Screen time, learning goals, reports, permissions and more.
        </p>
      </div>

      <button type="button" className={styles.button} onClick={onOpen}>
        Open Parent App →
      </button>
    </section>
  );
}
