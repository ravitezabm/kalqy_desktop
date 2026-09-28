import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CenteredScreen } from "../layouts/CenteredScreen";
import { KalqyLogo } from "../components/KalqyLogo";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { BottomBadge } from "../components/BottomBadge";
import styles from "./SplashPage.module.css";

const SPLASH_DURATION_MS = 2200;

export function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className={styles.wrapper}>
      <CenteredScreen>
        <div className={styles.stack}>
          <KalqyLogo />

          <div className={styles.loadingGroup}>
            <LoadingIndicator />
            <motion.p
              className={styles.status}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Getting started
            </motion.p>
          </div>
        </div>

        <div className={styles.badgeSlot}>
          <BottomBadge label="AI-Powered Learning Revolution" />
        </div>
      </CenteredScreen>
    </div>
  );
}
