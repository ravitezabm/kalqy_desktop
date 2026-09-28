import styles from "./MobileAppIcon.module.css";

interface MobileAppIconProps {
  size?: number;
}

export function MobileAppIcon({ size = 96 }: MobileAppIconProps) {
  return (
    <div className={styles.icon} style={{ width: size, height: size }} aria-hidden="true">
      <span className={styles.k}>K</span>
      <span className={styles.starTop} />
      <span className={styles.starBottom} />
      <span className={styles.dot} />
    </div>
  );
}
