import type { ReactNode } from "react";
import styles from "./InfoCard.module.css";

interface InfoCardProps {
  icon: ReactNode;
  children: ReactNode;
  decoration?: ReactNode;
}

export function InfoCard({ icon, children, decoration }: InfoCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.text}>{children}</div>
      {decoration && (
        <span className={styles.decoration} aria-hidden="true">
          {decoration}
        </span>
      )}
    </div>
  );
}
