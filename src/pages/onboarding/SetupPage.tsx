import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { KalqyLogo } from "../../components/KalqyLogo";
import { SetupProgressDots } from "../../components/SetupProgressDots";
import { PrimaryButton } from "../../components/PrimaryButton";
import styles from "./SetupPage.module.css";

type SetupStatus = "initializing" | "ready" | "error";

const TOTAL_DOTS = 8;
const DOT_TIMINGS_MS = [0, 500, 900, 1200, 1500, 1800, 2100, 2400];
const HEADING_DELAY_MS = 900;
const SUBTITLE_DELAY_MS = 1100;
const MIN_VISUAL_DURATION_MS = 3200;

/**
 * Placeholder for real dashboard initialization (fetching data, warming
 * caches, persisting the finished onboarding profile, etc). No backend or
 * persistence layer exists yet in this prototype, so this simulates a short
 * async init — replace the body with the real call when one exists.
 */
async function initializeDashboard(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
}

export function SetupPage() {
  const navigate = useNavigate();
  const reduceMotion = Boolean(useReducedMotion());

  const [activeDots, setActiveDots] = useState(0);
  const [showHeading, setShowHeading] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [status, setStatus] = useState<SetupStatus>("initializing");
  const [retryToken, setRetryToken] = useState(0);

  const handleRetry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let navigated = false;

    setStatus("initializing");
    setActiveDots(0);
    setShowHeading(false);
    setShowSubtitle(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    DOT_TIMINGS_MS.forEach((delay, index) => {
      timers.push(setTimeout(() => setActiveDots(index + 1), delay));
    });
    timers.push(setTimeout(() => setShowHeading(true), HEADING_DELAY_MS));
    timers.push(setTimeout(() => setShowSubtitle(true), SUBTITLE_DELAY_MS));

    const minVisualDelay = new Promise<void>((resolve) => {
      timers.push(setTimeout(resolve, MIN_VISUAL_DURATION_MS));
    });

    Promise.all([initializeDashboard(), minVisualDelay])
      .then(() => {
        if (cancelled || navigated) return;
        navigated = true;
        navigate("/profile-selection", { replace: true });
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [navigate, retryToken]);

  if (status === "error") {
    return (
      <div className={styles.page}>
        <div className={styles.logoSlot}>
          <KalqyLogo size="md" />
        </div>
        <div className={styles.centerContent} role="alert">
          <h1 className={styles.heading}>Something went wrong</h1>
          <p className={styles.subtitle}>Please try again.</p>
          <PrimaryButton variant="purple" onClick={handleRetry}>
            Try again
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.logoSlot}
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <KalqyLogo size="md" />
      </motion.div>

      <div className={styles.centerContent}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <SetupProgressDots activeCount={activeDots} total={TOTAL_DOTS} />
        </motion.div>

        <div aria-live="polite" className={styles.textGroup}>
          {showHeading && (
            <motion.h1
              className={styles.heading}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              Getting things ready
            </motion.h1>
          )}
          {showSubtitle && (
            <motion.p
              className={styles.subtitle}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              Please wait while we setup the
              <br />
              dashboard
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
