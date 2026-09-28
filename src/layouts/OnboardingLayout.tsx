import type { ReactNode } from "react";
import { KalqyLogo } from "../components/KalqyLogo";
import { PatternBackground } from "../components/PatternBackground";
import { OnboardingProgress } from "../components/OnboardingProgress";
import styles from "./OnboardingLayout.module.css";

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  backLabel?: string;
}

export function OnboardingLayout({
  children,
  currentStep,
  totalSteps,
  onBack,
  backLabel = "Back",
}: OnboardingLayoutProps) {
  return (
    <div className={styles.page}>
      <PatternBackground opacity={0.02} />

      <div className={styles.topBar}>
        <KalqyLogo size="md" />
        {onBack && (
          <button type="button" className={styles.backLink} onClick={onBack}>
            ← {backLabel}
          </button>
        )}
      </div>

      <div className={styles.progressMobile}>
        <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} orientation="horizontal" />
      </div>

      <div className={styles.body}>
        <div className={styles.content}>{children}</div>

        <div className={styles.progressDesktop}>
          <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} orientation="vertical" />
        </div>
      </div>
    </div>
  );
}
