import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { KalqyLogo } from "../components/KalqyLogo";
import { PatternBackground } from "../components/PatternBackground";
import { MobileConnectCard } from "../components/MobileConnectCard";
import { ContinueButton } from "../components/ContinueButton";
import { InfoCard } from "../components/InfoCard";
import { useAuth } from "../context/AuthContext";
import {
  createOnboardingSession,
  subscribeToSessionStatus,
  mobileConnectDevTools,
} from "../services/mobileConnectService";
import type { OnboardingSession } from "../types/mobileConnect";
import styles from "./MobileConnectPage.module.css";

const NAVIGATE_DELAY_MS = 500;

const headerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

function LearningIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l9 4.5-9 4.5-9-4.5L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6 10v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function MobileConnectPage() {
  const navigate = useNavigate();
  const { email } = useAuth();

  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [connectUrl, setConnectUrl] = useState<string>("");
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasNavigatedRef = useRef(false);

  const stopPolling = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  const startSession = useCallback(async () => {
    stopPolling();
    hasNavigatedRef.current = false;

    const { session: newSession, connectUrl: newConnectUrl } = await createOnboardingSession(
      email || "anonymous-parent"
    );
    setSession(newSession);
    setConnectUrl(newConnectUrl);

    unsubscribeRef.current = subscribeToSessionStatus(newSession.sessionId, (updated) => {
      setSession(updated);
      if (updated.status === "completed" || updated.status === "expired") {
        stopPolling();
      }
    });
  }, [email, stopPolling]);

  useEffect(() => {
    startSession();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create exactly once per mount
  }, []);

  useEffect(() => {
    if (session?.status === "completed" && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      const timer = setTimeout(() => {
        navigate("/parent/onboarding/profile", { replace: true });
      }, NAVIGATE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [session?.status, navigate]);

  const handleExpire = useCallback(() => {
    stopPolling();
    setSession((prev) => (prev ? { ...prev, status: "expired" } : prev));
  }, [stopPolling]);

  const handleRegenerate = useCallback(() => {
    startSession();
  }, [startSession]);

  const handleContinue = useCallback(() => {
    navigate("/parent/onboarding/profile");
  }, [navigate]);

  const isDev = import.meta.env.DEV;

  return (
    <div className={styles.page}>
      <PatternBackground opacity={0.02} />

      <div className={styles.topBar}>
        <KalqyLogo size="md" />
      </div>

      <div className={styles.centerColumn}>
        <motion.div className={styles.header} initial="hidden" animate="visible" variants={headerVariants}>
          <h1 className={styles.heading}>
            Hi <span className={styles.pink}>Parent</span>
          </h1>
          <p className={styles.description}>
            This part helps us understand your child better their habits, strengths and everything we
            need to support them in the best way possible
          </p>
        </motion.div>

        {session && connectUrl && (
          <MobileConnectCard
            connectUrl={connectUrl}
            status={session.status}
            expiresAt={session.expiresAt}
            onExpire={handleExpire}
            onRegenerate={handleRegenerate}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ContinueButton
            mobileCompleted={session?.status === "completed"}
            onContinue={handleContinue}
          />
        </motion.div>

        <motion.div
          className={styles.infoSlot}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <InfoCard icon="i" decoration={<LearningIcon />}>
            You can complete the onboarding in the app
            <br />
            This page will automatically continue to the next screen
            <br />
            when you finish it on mobile
          </InfoCard>
        </motion.div>

        {isDev && session && (
          <div className={styles.devPanel}>
            <span className={styles.devLabel}>Dev tools</span>
            <button
              type="button"
              className={styles.devButton}
              onClick={() => mobileConnectDevTools.simulateMobileConnect(session.sessionId)}
            >
              Simulate Connect
            </button>
            <button
              type="button"
              className={styles.devButton}
              onClick={() => mobileConnectDevTools.simulateMobileComplete(session.sessionId)}
            >
              Simulate Complete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
