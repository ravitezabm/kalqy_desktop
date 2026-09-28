import type { ReactNode } from "react";
import { PatternBackground } from "../components/PatternBackground";
import styles from "./CenteredScreen.module.css";

interface CenteredScreenProps {
  children: ReactNode;
}

export function CenteredScreen({ children }: CenteredScreenProps) {
  return (
    <div className={styles.screen}>
      <PatternBackground />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
