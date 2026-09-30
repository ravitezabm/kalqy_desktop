import { useEffect } from "react";

/**
 * Keeps the actual OS window fullscreen state in sync with the Fullscreen
 * toggle. Silently no-ops outside a Tauri window (e.g. a plain browser tab)
 * rather than throwing.
 */
let hasBeenFullscreen = false;

export function useFullscreenSync(fullscreen: boolean) {
  useEffect(() => {
    // The window already starts windowed; forcing setFullscreen(false) on mount
    // only makes the native window re-layout (visible flash on Windows).
    if (!fullscreen && !hasBeenFullscreen) return;
    if (fullscreen) hasBeenFullscreen = true;
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
