import bottomEnvironment from "../../../assets/dashboard/bottom-environment.webp";
import styles from "./BottomEnvironment.module.css";

/**
 * Purely decorative foreground layer pinned to the bottom of the page — it
 * sits behind the real content (see HomePage's stacking order) so it never
 * pushes anything down or sits above a clickable element.
 */
export function BottomEnvironment() {
  return (
    <div className={styles.env} aria-hidden="true">
      <img className={styles.image} src={bottomEnvironment} alt="" loading="lazy" decoding="async" />
    </div>
  );
}
