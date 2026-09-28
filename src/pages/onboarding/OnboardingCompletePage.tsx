import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CenteredScreen } from "../../layouts/CenteredScreen";
import { KalqyLogo } from "../../components/KalqyLogo";
import { useOnboarding } from "../../context/OnboardingContext";
import styles from "./OnboardingCompletePage.module.css";

const REDIRECT_DELAY_MS = 1400;

export function OnboardingCompletePage() {
  const navigate = useNavigate();
  const { completed } = useOnboarding();
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    if (!completed) {
      navigate("/parent/onboarding/child-photo", { replace: true });
      return;
    }

    const timer = setTimeout(() => {
      navigate("/parent/onboarding/setup", { replace: true });
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [completed, navigate]);

  return (
    <CenteredScreen>
      <motion.div
        className={styles.stack}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <KalqyLogo size="md" />

        <motion.div
          className={styles.checkCircle}
          initial={{ scale: reduceMotion ? 1 : 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
          >
            <motion.path
              d="M4 12.5l5 5L20 7"
              stroke="#ffffff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.div>

        <motion.h1
          className={styles.heading}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.5 }}
        >
          You&rsquo;re all set!
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.6 }}
        >
          Your Kalqy profile is ready.
        </motion.p>
      </motion.div>
    </CenteredScreen>
  );
}
