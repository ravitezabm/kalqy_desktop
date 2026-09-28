import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { AppShell } from "../layouts/AppShell";
import { WorldMap } from "../features/endeavour/components/WorldMap";
import { useEndeavourWorld } from "../features/endeavour/hooks/useEndeavourWorld";
import { useOnboarding } from "../context/OnboardingContext";
import { profileRepository } from "../features/profile/services/profileRepository";
import type { Adventure } from "../features/endeavour/types/endeavour";
import type { Profile } from "../types/profile";
import styles from "./EndeavourPage.module.css";

export function EndeavourPage() {
  const navigate = useNavigate();
  const { activeProfileId } = useOnboarding();
  const [profile, setProfile] = useState<Profile | null>(null);
  const reduceMotion = Boolean(useReducedMotion());

  const { world, adventures, status, activeAdventureId, justUnlockedId, clearJustUnlocked, retry } =
    useEndeavourWorld(activeProfileId);

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

  useEffect(() => {
    if (!justUnlockedId) return;
    const timeout = window.setTimeout(clearJustUnlocked, 1200);
    return () => window.clearTimeout(timeout);
  }, [justUnlockedId, clearJustUnlocked]);

  const handleSelectAdventure = useCallback(
    (adventure: Adventure) => {
      navigate(adventure.route);
    },
    [navigate]
  );

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>Endeavour</h1>
            <p className={styles.subtitle}>Explore, learn and grow through every adventure</p>
          </div>

          {profile && (
            <div className={styles.profileChip}>
              <img className={styles.avatar} src={profile.image} alt="" />
              <span className={styles.greeting}>Hello, {profile.name}!</span>
            </div>
          )}
        </header>

        <div className={styles.mapWrap}>
          <WorldMap
            world={world}
            adventures={adventures}
            status={status}
            activeAdventureId={activeAdventureId}
            justUnlockedId={justUnlockedId}
            reduceMotion={reduceMotion}
            onRetry={retry}
            onSelectAdventure={handleSelectAdventure}
          />
        </div>
      </div>
    </AppShell>
  );
}
