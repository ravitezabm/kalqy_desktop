import styles from "./WorldBackground.module.css";

interface WorldBackgroundProps {
  src: string;
}

/**
 * The world background is one independent, cached image — islands are never
 * baked into it (see PROMPT sections 4 and 14). Rendered eagerly since it's
 * always the first thing the child should see.
 */
export function WorldBackground({ src }: WorldBackgroundProps) {
  return <img className={styles.background} src={src} alt="" fetchPriority="high" decoding="async" />;
}
