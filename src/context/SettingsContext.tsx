import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type GraphicsQuality = "low" | "medium" | "high";

export interface SettingsState {
  soundEffects: boolean;
  music: boolean;
  language: string;
  fullscreen: boolean;
  graphicsQuality: GraphicsQuality;
  subtitles: boolean;
  reduceAnimations: boolean;
  largerUI: boolean;
}

export interface SettingsContextValue extends SettingsState {
  setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

const initialState: SettingsState = {
  soundEffects: true,
  music: true,
  language: "en",
  fullscreen: false,
  graphicsQuality: "high",
  subtitles: false,
  reduceAnimations: false,
  largerUI: false,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(initialState);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...state,
      setSetting: (key, settingValue) => setState((prev) => ({ ...prev, [key]: settingValue })),
    }),
    [state]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
