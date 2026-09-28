import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { KalqyLogo } from "../components/KalqyLogo";
import { PatternBackground } from "../components/PatternBackground";
import { ProfileTile } from "../components/profile/ProfileTile";
import { PROFILES } from "../types/profile";
import { getCenterSlot, getOuterSlot, getOrbitRingGeometry } from "../utils/profileOrbit";
import { useOnboarding } from "../context/OnboardingContext";
import styles from "./ProfileSelectionPage.module.css";

const TRANSITION_LOCK_MS = 800;
const DEFAULT_CENTER_ID = "jayraj";

export function ProfileSelectionPage() {
  const navigate = useNavigate();
  const { setActiveProfileId } = useOnboarding();
  const reduceMotion = Boolean(useReducedMotion());

  const [centerId, setCenterId] = useState(DEFAULT_CENTER_ID);
  const [hasSelected, setHasSelected] = useState(false);
  const transitioningRef = useRef(false);

  const centerIndex = PROFILES.findIndex((profile) => profile.id === centerId);
  const centerProfile = PROFILES[centerIndex];
  const totalOuter = PROFILES.length - 1;
  const ring = getOrbitRingGeometry();

  const selectProfile = useCallback(
    (id: string) => {
      if (transitioningRef.current) return;

      // Clicking the profile that is already centred enters their home;
      // clicking any other profile rotates the orbit to bring them forward.
      if (id === centerId) {
        setActiveProfileId(id);
        navigate("/home");
        return;
      }

      transitioningRef.current = true;
      setCenterId(id);
      setActiveProfileId(id);
      setHasSelected(true);

      setTimeout(() => {
        transitioningRef.current = false;
      }, TRANSITION_LOCK_MS);
    },
    [centerId, navigate, setActiveProfileId]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (transitioningRef.current) return;

      const delta = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (centerIndex + delta + PROFILES.length) % PROFILES.length;
      selectProfile(PROFILES[nextIndex].id);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [centerIndex, selectProfile]);

  const headingKey = hasSelected ? centerProfile.id : "initial";
  const headingText = hasSelected ? `WELCOME ${centerProfile.name}` : "Who’s Going to play ?";

  return (
    <div className={styles.page}>
      <PatternBackground opacity={0.02} />
      <div className={styles.blobPink} aria-hidden="true" />
      <div className={styles.blobPurple} aria-hidden="true" />

      <div className={styles.topBar}>
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <KalqyLogo size="md" />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.p
            key={headingKey}
            className={styles.heading}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {headingText}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className={styles.stage}>
        <div className={styles.orbitField}>
          <div
            className={styles.orbitRingOuter}
            style={{
              left: `${ring.centerLeft}%`,
              top: `${ring.centerTop}%`,
              width: `${ring.outerDiameterPercent}%`,
              height: `${ring.outerDiameterPercent}%`,
            }}
            aria-hidden="true"
          />
          <div
            className={styles.orbitRingInner}
            style={{
              left: `${ring.centerLeft}%`,
              top: `${ring.centerTop}%`,
              width: `${ring.innerDiameterPercent}%`,
              height: `${ring.innerDiameterPercent}%`,
            }}
            aria-hidden="true"
          />

          {PROFILES.map((profile) => {
            const isCenter = profile.id === centerId;
            const slot = isCenter
              ? getCenterSlot()
              : getOuterSlot(
                  (PROFILES.indexOf(profile) - centerIndex + PROFILES.length) % PROFILES.length,
                  totalOuter
                );

            return (
              <ProfileTile
                key={profile.id}
                profile={profile}
                leftPercent={slot.leftPercent}
                topPercent={slot.topPercent}
                sizePercent={slot.sizePercent}
                zIndex={slot.zIndex}
                isCenter={isCenter}
                onSelect={selectProfile}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
