import type { ReactNode } from "react";
import { PatternBackground } from "../components/PatternBackground";
import { IllustrationPanel } from "../components/IllustrationPanel";
import styles from "./AuthSplitLayout.module.css";

interface AuthSplitLayoutProps {
  children: ReactNode;
  topSlot?: ReactNode;
  illustrationSrc?: string;
  illustrationAlt?: string;
}

export function AuthSplitLayout({
  children,
  topSlot,
  illustrationSrc,
  illustrationAlt,
}: AuthSplitLayoutProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.left}>
        <PatternBackground />
        <div className={styles.leftContent}>
          {topSlot && <div className={styles.topRow}>{topSlot}</div>}
          <div className={styles.centerArea}>
            <div className={styles.leftInner}>{children}</div>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <IllustrationPanel src={illustrationSrc} alt={illustrationAlt} />
      </div>
    </div>
  );
}
