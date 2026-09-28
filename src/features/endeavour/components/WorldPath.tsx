import { Fragment } from "react";
import type { Adventure } from "../types/endeavour";
import styles from "./WorldPath.module.css";

interface WorldPathProps {
  adventures: Adventure[];
}

/**
 * One lightweight SVG connecting islands in order — a completed segment
 * (both ends unlocked) renders brighter, everything ahead stays muted so the
 * path itself communicates progression. See PROMPT section 20.
 */
export function WorldPath({ adventures }: WorldPathProps) {
  if (adventures.length < 2) return null;
  const ordered = [...adventures].sort((a, b) => a.order - b.order);

  return (
    <svg className={styles.path} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {ordered.slice(1).map((adventure, index) => {
        const prev = ordered[index];
        const segmentDone = prev.status === "completed";
        return (
          <Fragment key={adventure.id}>
            <line
              x1={prev.position.x}
              y1={prev.position.y}
              x2={adventure.position.x}
              y2={adventure.position.y}
              className={segmentDone ? styles.segmentDone : styles.segment}
              vectorEffect="non-scaling-stroke"
            />
          </Fragment>
        );
      })}
    </svg>
  );
}
