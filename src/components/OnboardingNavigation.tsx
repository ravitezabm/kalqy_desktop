import { PrimaryButton } from "./PrimaryButton";
import styles from "./OnboardingNavigation.module.css";

interface OnboardingNavigationProps {
  nextLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function OnboardingNavigation({
  nextLabel = "Next",
  disabled = false,
  loading = false,
}: OnboardingNavigationProps) {
  return (
    <div className={styles.wrap}>
      <PrimaryButton type="submit" variant="purple" disabled={disabled} loading={loading}>
        {nextLabel}
      </PrimaryButton>
    </div>
  );
}
