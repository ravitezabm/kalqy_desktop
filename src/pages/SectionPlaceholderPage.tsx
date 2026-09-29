import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../layouts/AppShell";
import { profileRepository } from "../features/profile/services/profileRepository";
import { useOnboarding } from "../context/OnboardingContext";
import type { Profile } from "../types/profile";
import type { SectionConfig } from "./sections";
import styles from "./SectionPlaceholderPage.module.css";

export function SectionPlaceholderPage({ config }: { config: SectionConfig }) {
  const navigate = useNavigate();
  const params = useParams();
  const { activeProfileId } = useOnboarding();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!activeProfileId) return;

    profileRepository.getProfile(activeProfileId).then((result) => {
      if (!cancelled) setProfile(result);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  const Icon = config.icon;
  const paramValue = config.paramKey ? params[config.paramKey] : undefined;

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <div className={styles.card}>
          <span className={styles.icon}>
            <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <h1 className={styles.title}>{config.title}</h1>
          {paramValue && (
            <p className={styles.param}>
              {config.paramLabel}: <strong>{paramValue}</strong>
            </p>
          )}
          <p className={styles.description}>{config.description}</p>
          {config.contactEmail && (
            <a className={styles.contactLink} href={`mailto:${config.contactEmail}`}>
              {config.contactEmail}
            </a>
          )}
          <button type="button" className={styles.backButton} onClick={() => navigate("/home")}>
            Back to Home
          </button>
        </div>
      </div>
    </AppShell>
  );
}
