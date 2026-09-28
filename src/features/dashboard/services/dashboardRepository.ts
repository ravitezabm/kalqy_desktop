import type { DashboardApiResponse, DashboardData, DashboardStat } from "../types/dashboard";
import type { Profile } from "../../../types/profile";

export interface DashboardRepository {
  getDashboard(profileId: string): Promise<DashboardData>;
}

/**
 * Maps the backend's stat payload onto the view model the UI renders.
 * The backend schema is not final, so this is the single place that needs
 * to change when it shifts — no component reads the raw API shape.
 */
export function mapStats(stats: DashboardApiResponse["stats"]): DashboardStat[] {
  const change = stats.changePercent ?? {};
  const asChange = (value?: number) => (value === undefined ? undefined : `${value}%`);

  return [
    {
      id: "games-played",
      label: "Games Played",
      value: stats.gamesPlayed,
      change: asChange(change.gamesPlayed),
      icon: "games",
    },
    {
      id: "learning-progress",
      label: "Learning Progress",
      value: stats.learningProgress,
      unit: "%",
      change: asChange(change.learningProgress),
      icon: "progress",
    },
    {
      id: "achievements",
      label: "Achievements",
      value: stats.achievements,
      change: asChange(change.achievements),
      icon: "achievements",
    },
    {
      id: "play-time",
      label: "Play Time",
      value: stats.playTimeHours,
      unit: "h",
      change: asChange(change.playTimeHours),
      icon: "playTime",
    },
  ];
}

export function toDashboardData(profile: Profile, response: DashboardApiResponse): DashboardData {
  return {
    profile,
    stats: mapStats(response.stats),
    continuePlaying: response.continuePlaying,
    dailyChallenge: response.dailyChallenge,
  };
}
