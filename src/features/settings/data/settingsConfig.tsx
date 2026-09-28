import {
  UserCircle,
  Smile,
  RefreshCcw,
  Volume2,
  Music2,
  Globe,
  Maximize,
  MonitorCog,
  Captions,
  Zap,
  Type,
  LifeBuoy,
  MessageSquareWarning,
  Info,
} from "lucide-react";
import type { SettingsCategory, SettingsModalConfig } from "../types";

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

export const GRAPHICS_QUALITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const APP_VERSION = "1.0.0";

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: "account",
    title: "Account",
    icon: UserCircle,
    rows: [
      {
        id: "parent-account",
        kind: "info",
        icon: UserCircle,
        label: "Parent account",
        getValue: (ctx) => ctx.parentName ?? "Not set",
      },
      {
        id: "child-profile",
        kind: "info",
        icon: Smile,
        label: "Child profile",
        getValue: (ctx) => ctx.activeProfileName ?? "No profile selected",
      },
      {
        id: "switch-child",
        kind: "action",
        icon: RefreshCcw,
        label: "Switch child",
        description: "Choose a different profile",
        onSelect: (ctx) => ctx.navigate("/profile-selection"),
      },
    ],
  },
  {
    id: "game-preferences",
    title: "Game Preferences",
    icon: Volume2,
    rows: [
      { id: "sound-effects", kind: "toggle", icon: Volume2, label: "Sound effects", key: "soundEffects" },
      { id: "music", kind: "toggle", icon: Music2, label: "Music", key: "music" },
      {
        id: "language",
        kind: "select",
        icon: Globe,
        label: "Language",
        key: "language",
        options: LANGUAGE_OPTIONS,
      },
      { id: "fullscreen", kind: "toggle", icon: Maximize, label: "Fullscreen", key: "fullscreen" },
      {
        id: "graphics-quality",
        kind: "select",
        icon: MonitorCog,
        label: "Graphics quality",
        key: "graphicsQuality",
        options: GRAPHICS_QUALITY_OPTIONS,
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    icon: Captions,
    rows: [
      { id: "subtitles", kind: "toggle", icon: Captions, label: "Subtitles", key: "subtitles" },
      {
        id: "reduce-animations",
        kind: "toggle",
        icon: Zap,
        label: "Reduce animations",
        key: "reduceAnimations",
      },
      { id: "larger-ui", kind: "toggle", icon: Type, label: "Larger UI", key: "largerUI" },
    ],
  },
  {
    id: "help",
    title: "Help",
    icon: LifeBuoy,
    rows: [
      {
        id: "help-support",
        kind: "action",
        icon: LifeBuoy,
        label: "Help & Support",
        onSelect: (ctx) => ctx.openModal("help-support"),
      },
      {
        id: "report-problem",
        kind: "action",
        icon: MessageSquareWarning,
        label: "Report a problem",
        onSelect: (ctx) => ctx.openModal("report-problem"),
      },
      {
        id: "about",
        kind: "action",
        icon: Info,
        label: "About Kalqy",
        onSelect: (ctx) => ctx.openModal("about"),
      },
    ],
  },
];

const SUPPORT_EMAIL = "support@kalqy.in";

export const SETTINGS_MODALS: SettingsModalConfig[] = [
  {
    id: "help-support",
    title: "Help & Support",
    render: () => (
      <p>
        Need a hand? Reach the Kalqy team any time at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We usually reply within a day.
      </p>
    ),
  },
  {
    id: "report-problem",
    title: "Report a problem",
    render: () => (
      <p>
        Spotted something not working right? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with what happened — a screenshot
        helps us fix it faster.
      </p>
    ),
  },
  {
    id: "about",
    title: "About Kalqy",
    render: () => (
      <>
        <p>Kalqy is an AI-powered learning playground for curious kids.</p>
        <p>Version {APP_VERSION}</p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    render: () => <p>Our full privacy policy will appear here.</p>,
  },
  {
    id: "terms",
    title: "Terms of Service",
    render: () => <p>Our full terms of service will appear here.</p>,
  },
];
