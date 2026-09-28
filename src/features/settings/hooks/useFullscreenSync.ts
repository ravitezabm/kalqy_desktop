import { useEffect } from "react";

/**
 * Keeps the actual OS window fullscreen state in sync with the Fullscreen
 * toggle. Silently no-ops outside a Tauri window (e.g. a plain browser tab)
 * rather than throwing.
 */
export function useFullscreenSync(fullscreen: boolean) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        if (!cancelled) await win.setFullscreen(fullscreen);
      } catch {
        // Not running inside a Tauri window — nothing to sync.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fullscreen]);
}
