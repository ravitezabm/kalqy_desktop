import { motion } from "framer-motion";
import { MobileAppIcon } from "./MobileAppIcon";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { ConnectionStatus } from "./ConnectionStatus";
import { SessionExpiryTimer } from "./SessionExpiryTimer";
import type { OnboardingSessionStatus } from "../types/mobileConnect";
import styles from "./MobileConnectCard.module.css";

interface MobileConnectCardProps {
  connectUrl: string;
  status: OnboardingSessionStatus;
  expiresAt: number;
  onExpire: () => void;
  onRegenerate: () => void;
}

export function MobileConnectCard({
  connectUrl,
  status,
  expiresAt,
  onExpire,
  onRegenerate,
}: MobileConnectCardProps) {
  const isExpired = status === "expired";

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.left}>
        <MobileAppIcon />
      </div>

      <div className={styles.middle}>
        <h3>Continue this onboarding on your mobile</h3>
        <p>Scan the QR code to open our mobile app and complete this part.</p>
        <p>You can come back here anytime to continue</p>
      </div>

      <div className={styles.divider} />

      <div className={styles.right}>
        {isExpired ? (
          <div className={styles.expiredSlot}>
            <ConnectionStatus status={status} />
            <button type="button" className={styles.regenerateButton} onClick={onRegenerate}>
              Generate a new QR code
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className={styles.qrGroup}
          >
            <QRCodeDisplay value={connectUrl} />
            <ConnectionStatus status={status} />
            <SessionExpiryTimer
              expiresAt={expiresAt}
              active={status === "waiting" || status === "connected"}
              onExpire={onExpire}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
