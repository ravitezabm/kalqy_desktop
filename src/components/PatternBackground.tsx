import styles from "./PatternBackground.module.css";

interface PatternBackgroundProps {
  opacity?: number;
}

const PATTERN_ID = "kalqy-hex-pattern";

export function PatternBackground({ opacity = 0.035 }: PatternBackgroundProps) {
  return (
    <svg
      className={styles.pattern}
      style={{ opacity }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={PATTERN_ID}
          width="84"
          height="96"
          patternUnits="userSpaceOnUse"
          patternTransform="scale(1)"
        >
          <path
            d="M42 0 L84 24 L84 72 L42 96 L0 72 L0 24 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${PATTERN_ID})`} />
    </svg>
  );
}
