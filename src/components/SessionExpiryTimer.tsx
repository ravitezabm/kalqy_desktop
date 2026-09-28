import { useEffect, useRef, useState } from "react";
import styles from "./SessionExpiryTimer.module.css";

interface SessionExpiryTimerProps {
  expiresAt: number;
  active: boolean;
  onExpire: () => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SessionExpiryTimer({ expiresAt, active, onExpire }: SessionExpiryTimerProps) {
  const [remainingMs, setRemainingMs] = useState(() => expiresAt - Date.now());
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    hasExpiredRef.current = false;
    setRemainingMs(expiresAt - Date.now());

    if (!active) return;

    const intervalId = setInterval(() => {
      const next = expiresAt - Date.now();
      setRemainingMs(next);

      if (next <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        clearInterval(intervalId);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt, active, onExpire]);

  if (!active) return null;

  return <p className={styles.timer}>QR expires in {formatRemaining(remainingMs)}</p>;
}
