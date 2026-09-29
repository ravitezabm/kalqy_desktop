import type { ReactNode } from "react";
import boardFrame from "../../../assets/dashboard/challenge-board.webp";
import styles from "./ChallengeBoard.module.css";

interface ChallengeBoardProps {
  title: string;
  children: ReactNode;
}

/**
 * The wooden board PNG is only the decorative shell — it never carries text.
 * `title` sits directly on the printed name-plank (its position was measured
 * against the artwork's own pixels — the plank is solid wood roughly from
 * 10-55% width and 12-27% height, see ChallengeBoard.module.css), while the
 * rest of the content sits in the cream area below it (see PROMPT section 13).
 */
export function ChallengeBoard({ title, children }: ChallengeBoardProps) {
  return (
    <div className={styles.board}>
      <img className={styles.frame} src={boardFrame} alt="" aria-hidden="true" />
      <h3 className={styles.plankTitle}>{title}</h3>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
