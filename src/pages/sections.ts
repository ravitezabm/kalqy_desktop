import { Globe2, Bell, LifeBuoy, Gamepad2 } from "lucide-react";

export interface SectionConfig {
  path: string;
  title: string;
  description: string;
  icon: typeof Globe2;
  /** Route param to surface in the subtitle (e.g. which game was opened). */
  paramKey?: string;
  paramLabel?: string;
  /** When set, renders a real mailto: link instead of just the back button. */
  contactEmail?: string;
}

/**
 * Placeholder destinations for sections that exist in navigation but aren't
 * built yet. One widget renders all of them — see SectionPlaceholderPage.
 * Reports and Store are deliberately not part of the product.
 */
export const SECTIONS: SectionConfig[] = [
  {
    path: "/world",
    title: "World",
    description: "The wider Kalqy world map is coming soon.",
    icon: Globe2,
  },
  {
    path: "/games/:gameId",
    title: "Game",
    description: "This game will launch here once the game runtime is wired up.",
    icon: Gamepad2,
    paramKey: "gameId",
    paramLabel: "Game",
  },
  {
    path: "/notifications",
    title: "Notifications",
    description: "Updates about progress, rewards and reminders.",
    icon: Bell,
  },
  {
    path: "/support",
    title: "Support",
    description: "Help articles are coming soon. In the meantime, write to us directly:",
    icon: LifeBuoy,
    contactEmail: "support@kalqy.in",
  },
];
