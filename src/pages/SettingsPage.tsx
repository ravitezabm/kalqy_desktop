import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AppShell } from "../layouts/AppShell";
import { SettingsCategoryCard } from "../features/settings/components/SettingsCategoryCard";
import { ParentAppCard } from "../features/settings/components/ParentAppCard";
import { ParentAppModal } from "../features/settings/components/ParentAppModal";
import { SettingsInfoModal } from "../features/settings/components/SettingsInfoModal";
import { SETTINGS_CATEGORIES, SETTINGS_MODALS, APP_VERSION } from "../features/settings/data/settingsConfig";
import { useFullscreenSync } from "../features/settings/hooks/useFullscreenSync";
import { useSettings } from "../context/SettingsContext";
import { useOnboarding } from "../context/OnboardingContext";
import { profileRepository } from "../features/profile/services/profileRepository";
import type { Profile } from "../types/profile";
import type { SettingsRowContext } from "../features/settings/types";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettings();
  const { parent, activeProfileId } = useOnboarding();
  const reduceMotion = Boolean(useReducedMotion());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [parentAppOpen, setParentAppOpen] = useState(false);
  const [openModalId, setOpenModalId] = useState<string | null>(null);

  useFullscreenSync(settings.fullscreen);

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

  const context = useMemo<SettingsRowContext>(
    () => ({
      settings,
      navigate,
      openModal: setOpenModalId,
      parentName: parent.name || null,
      activeProfileName: profile?.name ?? null,
    }),
    [settings, navigate, parent.name, profile]
  );

  const activeModal = useMemo(
    () => SETTINGS_MODALS.find((modal) => modal.id === openModalId) ?? null,
    [openModalId]
  );

  const openLegalModal = useCallback((id: "privacy" | "terms") => setOpenModalId(id), []);

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
        </header>

        <motion.div
          className={styles.categories}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {SETTINGS_CATEGORIES.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: reduceMotion ? 0 : index * 0.05, ease: "easeOut" }}
            >
              <SettingsCategoryCard category={category} context={context} />
            </motion.div>
          ))}
        </motion.div>

        <ParentAppCard onOpen={() => setParentAppOpen(true)} />

        <footer className={styles.footer}>
          <button type="button" className={styles.footerLink} onClick={() => openLegalModal("privacy")}>
            Privacy Policy
          </button>
          <span className={styles.footerDot} aria-hidden="true">
            ·
          </span>
          <button type="button" className={styles.footerLink} onClick={() => openLegalModal("terms")}>
            Terms
          </button>
          <span className={styles.footerDot} aria-hidden="true">
            ·
          </span>
          <span className={styles.footerVersion}>Kalqy v{APP_VERSION}</span>
        </footer>
      </div>

      <ParentAppModal open={parentAppOpen} onClose={() => setParentAppOpen(false)} />
      <SettingsInfoModal modal={activeModal} context={context} onClose={() => setOpenModalId(null)} />
    </AppShell>
  );
}
