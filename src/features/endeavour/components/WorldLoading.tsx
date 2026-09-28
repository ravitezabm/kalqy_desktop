import styles from "./WorldLoading.module.css";

const PLACEHOLDER_POSITIONS = [
  { x: 21, y: 32 },
  { x: 42, y: 27 },
  { x: 63, y: 34 },
  { x: 40, y: 68 },
  { x: 63, y: 73 },
];

/**
 * The background is already visible while this renders (see EndeavourPage) —
 * this only stands in for islands still loading, never a full-page spinner.
 */
export function WorldLoading() {
  return (
    <div role="status" aria-label="Loading your adventure map">
      {PLACEHOLDER_POSITIONS.map((position, index) => (
        <span
          key={index}
          className={styles.skeleton}
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        />
      ))}
    </div>
  );
}
