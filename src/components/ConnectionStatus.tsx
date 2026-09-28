import { motion, useReducedMotion } from "framer-motion";
import type { OnboardingSessionStatus } from "../types/mobileConnect";
import styles from "./ConnectionStatus.module.css";

interface ConnectionStatusProps {
  status: OnboardingSessionStatus;
}

const COPY: Record<OnboardingSessionStatus, string> = {
  waiting: "Waiting for your mobile device…",
  connected: "Mobile connected",
  completed: "You're all set!",
  expired: "QR code expired",
};

function StatusIcon({ status, reduceMotion }: { status: OnboardingSessionStatus; reduceMotion: boolean }) {
  if (status === "waiting") {
    return (
      <motion.span
        className={styles.pulseDot}
        animate={reduceMotion ? { opacity: [1, 0.5, 1] } : { opacity: [1, 0.4, 1], scale: [1, 1.15, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  if (status === "connected" || status === "completed") {
    return (
      <motion.svg
        className={styles.checkIcon}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
      >
        <path
          d="M4 12.5l5 5L20 7"
          stroke="#3aa86d"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#e0455f" strokeWidth="2" />
      <path d="M12 8v5" stroke="#e0455f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.1" fill="#e0455f" />
    </svg>
  );
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <div className={styles.row} data-status={status} role="status" aria-live="polite">
      <StatusIcon status={status} reduceMotion={reduceMotion} />
      <span className={styles.text}>{COPY[status]}</span>
    </div>
  );
}
