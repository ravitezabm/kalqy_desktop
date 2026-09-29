import { useEffect, useState } from "react";
import styles from "./DebugOverlay.module.css";

interface DebugAction {
  label: string;
  run: () => void;
}

interface DebugOverlayProps {
  readStats: () => string[];
  actions: DebugAction[];
}

/**
 * Development-only diagnostics (PROMPT sections 27/92): toggled with the
 * backtick key and never rendered in a production build.
 */
export function DebugOverlay({ readStats, actions }: DebugOverlayProps) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "`") setOpen((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const tick = () => setLines(readStats());
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [open, readStats]);

  if (!import.meta.env.DEV || !open) return null;

  return (
    <div className={styles.panel}>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
      <div className={styles.actions}>
        {actions.map((action) => (
          <button key={action.label} type="button" onClick={action.run}>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
