import { motion, useReducedMotion } from "framer-motion";
import styles from "./OnboardingProgress.module.css";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  orientation?: "vertical" | "horizontal";
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
  orientation = "vertical",
}: OnboardingProgressProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const steps = Array.from({ length: totalSteps }, (_, index) => index + 1);

  return (
    <div
      className={styles.track}
      data-orientation={orientation}
      role="group"
      aria-label={`Onboarding progress, step ${currentStep} of ${totalSteps}`}
    >
      {steps.map((step) => {
        const isActive = step === currentStep;
        return (
          <motion.span
            key={step}
            className={styles.dot}
            data-active={isActive}
            aria-hidden="true"
            initial={isActive ? { opacity: 0, scale: reduceMotion ? 1 : 0.6 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}
