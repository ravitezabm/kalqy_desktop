import type { ReactNode } from "react";
import styles from "./OnboardingQuestion.module.css";

interface OnboardingQuestionProps {
  heading: ReactNode;
  description?: ReactNode;
}

export function OnboardingQuestion({ heading, description }: OnboardingQuestionProps) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>{heading}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
