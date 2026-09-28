import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { SettingsContextValue, SettingsState } from "../../context/SettingsContext";

export interface SettingsRowContext {
  settings: SettingsContextValue;
  navigate: (path: string) => void;
  openModal: (id: string) => void;
  parentName: string | null;
  activeProfileName: string | null;
}

interface BaseRow {
  id: string;
  icon: LucideIcon;
  label: string;
  description?: string;
}

export interface ToggleRow extends BaseRow {
  kind: "toggle";
  key: keyof Pick<
    SettingsState,
    "soundEffects" | "music" | "fullscreen" | "subtitles" | "reduceAnimations" | "largerUI"
  >;
}

export interface SelectRowOption {
  value: string;
  label: string;
}

export interface SelectRow extends BaseRow {
  kind: "select";
  key: keyof Pick<SettingsState, "language" | "graphicsQuality">;
  options: SelectRowOption[];
}

export interface InfoRow extends BaseRow {
  kind: "info";
  /** Computed at render time — e.g. the active profile's name. */
  getValue: (ctx: SettingsRowContext) => string;
}

export interface ActionRow extends BaseRow {
  kind: "action";
  onSelect: (ctx: SettingsRowContext) => void;
}

export type SettingsRowConfig = ToggleRow | SelectRow | InfoRow | ActionRow;

export interface SettingsCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  rows: SettingsRowConfig[];
}

export interface SettingsModalConfig {
  id: string;
  title: string;
  render: (ctx: SettingsRowContext) => ReactNode;
}
