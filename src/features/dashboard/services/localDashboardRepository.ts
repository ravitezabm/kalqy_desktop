import { profileRepository } from "../../profile/services/profileRepository";
import { GAME_CATALOG } from "../../games/data/gameCatalog";
import { toDashboardData } from "./dashboardRepository";
import type { DashboardRepository } from "./dashboardRepository";
import type { DashboardApiResponse, DashboardData } from "../types/dashboard";

const NETWORK_DELAY_MS = 450;
const CONTINUE_PLAYING_LIMIT = 4;

/** "Continue playing" = games this profile has progress in, most advanced first. */
function continuePlaying() {
  return GAME_CATALOG.filter((game) => (game.progress ?? 0) > 0)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, CONTINUE_PLAYING_LIMIT);
}

/** Development data only — the shape mirrors GET /dashboard/:profileId. */
function buildResponse(profileId: string): DashboardApiResponse {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return {
    profileId,
    stats: {
      gamesPlayed: 24,
      learningProgress: 24,
      achievements: 24,
      playTimeHours: 24,
      changePercent: {
        gamesPlayed: 24,
        learningProgress: 24,
        achievements: 24,
        playTimeHours: 24,
      },
    },
    continuePlaying: continuePlaying(),
    dailyChallenge: {
      id: "daily-math-adventure",
      title: "Score 1000 points in Math Adventure",
      target: 1000,
      progress: 650,
      reward: { type: "Stars", amount: 50 },
      expiresAt: endOfDay.toISOString(),
      gameId: "math-adventure",
    },
  };
}

export const localDashboardRepository: DashboardRepository = {
  async getDashboard(profileId: string): Promise<DashboardData> {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

    const profile = await profileRepository.getProfile(profileId);
    if (!profile) {
      throw new Error(`Unknown profile: ${profileId}`);
    }

    return toDashboardData(profile, buildResponse(profileId));
  },
};
