import type { Profile } from "../../../types/profile";
import type { Game } from "../../games/types/game";

/** The dashboard renders the canonical game entity — see features/games. */
export type { Game };

/** Icon is chosen by the view-model layer, never sent by the backend. */
export type StatIconName = "games" | "progress" | "achievements" | "playTime";

export interface DashboardStat {
  id: string;
  label: string;
  value: number;
  /** Formatted suffix for the value, e.g. "h" for play time. */
  unit?: string;
  /** Period-over-period change, already formatted (e.g. "24%"). */
  change?: string;
  icon: StatIconName;
}

export interface ChallengeReward {
  type: string;
  amount: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: ChallengeReward;
  /** ISO timestamp — the countdown is derived from this, never hardcoded. */
  expiresAt: string;
  gameId?: string;
}

export interface DashboardData {
  profile: Profile;
  stats: DashboardStat[];
  continuePlaying: Game[];
  dailyChallenge: DailyChallenge | null;
}

export type SearchableItemType = "game" | "category" | "endeavour";

export interface SearchableItem {
  id: string;
  type: SearchableItemType;
  title: string;
  description?: string;
  category?: string;
  image?: string;
  route: string;
}

/**
 * Shape the backend is expected to return from GET /dashboard/:profileId.
 * Kept separate from the view models above so a schema change only needs a
 * new mapper, not changes to every component.
 */
export interface DashboardApiResponse {
  profileId: string;
  stats: {
    gamesPlayed: number;
    learningProgress: number;
    achievements: number;
    playTimeHours: number;
    changePercent?: Partial<Record<"gamesPlayed" | "learningProgress" | "achievements" | "playTimeHours", number>>;
  };
  continuePlaying: Game[];
  dailyChallenge: DailyChallenge | null;
}
