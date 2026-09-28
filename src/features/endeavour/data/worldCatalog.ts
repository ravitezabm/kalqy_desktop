import type { Adventure, EndeavourWorld } from "../types/endeavour";

/**
 * Static content only — the part of an adventure that never changes per
 * profile (art, position, order, unlock dependency). Per-profile fields
 * (status/progress/stars/bestScore/playCount) are computed at read time by
 * endeavourRepository, the same way a real backend would join a progress
 * table onto a content table.
 */
export type AdventureDefinition = Omit<
  Adventure,
  "status" | "progress" | "stars" | "bestScore" | "playCount"
>;

export const WORLD: EndeavourWorld = {
  id: "kalqy-world",
  name: "Kalqy World",
  backgroundImage: "/assets/world/world-background.png",
  version: 1,
};

/**
 * Development data standing in for GET /api/endeavour/world. Nothing in the
 * UI is built around there being five adventures, or around any adventure
 * name/asset existing — adding adventure_06 here is the only change needed
 * to extend the world.
 */
export const ADVENTURE_DEFINITIONS: AdventureDefinition[] = [
  {
    id: "adventure_01",
    slug: "butterfly-adventure",
    order: 1,
    title: "Butterfly Adventure",
    subtitle: "Follow • Catch • Learn",
    islandImage: "/assets/world/islands/butterfly-adventure.png",
    position: { x: 21, y: 32 },
    requiredAdventureId: null,
    route: "/games/butterfly-meadow",
    theme: { accent: "#4aa3e8" },
  },
  {
    id: "adventure_02",
    slug: "river-adventure",
    order: 2,
    title: "River Adventure",
    subtitle: "Trace • Explore • Discover",
    islandImage: "/assets/world/islands/river-adventure.png",
    position: { x: 42, y: 27 },
    requiredAdventureId: "adventure_01",
    route: "/games/river-rescue",
    theme: { accent: "#2bb3c0" },
  },
  {
    id: "adventure_03",
    slug: "word-eggs",
    order: 3,
    title: "Word Eggs",
    subtitle: "Drag • Spell • Hatch",
    islandImage: "/assets/world/islands/word-eggs.png",
    position: { x: 63, y: 34 },
    requiredAdventureId: "adventure_02",
    route: "/games/word-eggs",
    theme: { accent: "#e2a63b" },
  },
  {
    id: "adventure_04",
    slug: "market-day",
    order: 4,
    title: "Market Day",
    subtitle: "Move • Match • Count",
    islandImage: "/assets/world/islands/market-day.png",
    position: { x: 40, y: 68 },
    requiredAdventureId: "adventure_03",
    route: "/games/market-day",
    theme: { accent: "#e8724a" },
  },
  {
    id: "adventure_05",
    slug: "tabla-festival",
    order: 5,
    title: "Tabla Festival",
    subtitle: "Move • Play • Create",
    islandImage: "/assets/world/islands/tabla-festival.png",
    position: { x: 63, y: 73 },
    requiredAdventureId: "adventure_04",
    route: "/games/tabla-festival",
    theme: { accent: "#a855c9" },
  },
];
