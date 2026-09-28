import { CenteredScreen } from "../layouts/CenteredScreen";
import { KalqyLogo } from "../components/KalqyLogo";

export function ParentOnboardingPage() {
  return (
    <CenteredScreen>
      <KalqyLogo />
      <p style={{ marginTop: 24, fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>
        Parent onboarding
      </p>
      <p style={{ marginTop: 8, fontSize: 14, color: "var(--color-text-muted)" }}>
        Mobile onboarding completed successfully.
      </p>
    </CenteredScreen>
  );
}
