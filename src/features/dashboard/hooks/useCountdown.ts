import { useEffect, useState } from "react";

const TICK_MS = 1000;

export interface Countdown {
  msRemaining: number;
  expired: boolean;
  /** "12h 30m" while over an hour out, then "45m 12s", then "0s". */
  label: string;
}

function format(msRemaining: number): string {
  if (msRemaining <= 0) return "0s";

  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function remainingFrom(expiresAt: string): number {
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return 0;
  return Math.max(0, expiry - Date.now());
}

/** Derives a live countdown from an ISO timestamp — never a fixed string. */
export function useCountdown(expiresAt: string | undefined): Countdown {
  const [msRemaining, setMsRemaining] = useState(() =>
    expiresAt ? remainingFrom(expiresAt) : 0
  );

  useEffect(() => {
    if (!expiresAt) {
      setMsRemaining(0);
      return;
    }

    setMsRemaining(remainingFrom(expiresAt));

    const interval = setInterval(() => {
      const next = remainingFrom(expiresAt);
      setMsRemaining(next);
      if (next <= 0) clearInterval(interval);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return {
    msRemaining,
    expired: msRemaining <= 0,
    label: format(msRemaining),
  };
}
