import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AppShell } from "../layouts/AppShell";
import { PrimaryButton } from "../components/PrimaryButton";
import { DashboardHeader } from "../features/dashboard/components/DashboardHeader";
import { HeroBanner } from "../features/dashboard/components/HeroBanner";
import { StatsGrid } from "../features/dashboard/components/StatsGrid";
import { GameGrid } from "../features/games/components/GameGrid";
import { ChallengeBoard } from "../features/dashboard/components/ChallengeBoard";
import { DailyChallengeCard } from "../features/dashboard/components/DailyChallengeCard";
import { DashboardSkeleton } from "../features/dashboard/components/DashboardSkeleton";
import { DecorativeBackground } from "../features/dashboard/components/DecorativeBackground";
import { BottomEnvironment } from "../features/dashboard/components/BottomEnvironment";
import { useDashboard } from "../features/dashboard/hooks/useDashboard";
import { useDashboardSearch } from "../features/dashboard/hooks/useDashboardSearch";
import { launchGame, launchGameById } from "../features/games/services/gameLaunchService";
import { profileRepository } from "../features/profile/services/profileRepository";
import { useOnboarding } from "../context/OnboardingContext";
import type { Profile } from "../types/profile";
import type { DailyChallenge, Game, SearchableItem } from "../features/dashboard/types/dashboard";
import styles from "./HomePage.module.css";

export function HomePage() {
  const navigate = useNavigate();
  const { activeProfileId } = useOnboarding();
  const reduceMotion = Boolean(useReducedMotion());

  const [fallbackProfile, setFallbackProfile] = useState<Profile | null>(null);
  const { data, status, retry } = useDashboard(activeProfileId);
  const search = useDashboardSearch(data);

  // No profile chosen yet (e.g. deep link straight to /home).
  useEffect(() => {
    if (!activeProfileId) {
      navigate("/profile-selection", { replace: true });
    }
  }, [activeProfileId, navigate]);

  // Keep the sidebar/avatar populated even while the dashboard is loading
  // or has failed, so the shell never renders empty.
  useEffect(() => {
    let cancelled = false;
    if (!activeProfileId) return;

    profileRepository.getProfile(activeProfileId).then((profile) => {
      if (!cancelled) setFallbackProfile(profile);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  const profile = data?.profile ?? fallbackProfile;

  const goToGames = useCallback(() => navigate("/games"), [navigate]);

  const handleLaunchGame = useCallback(
    (game: Game) => {
      navigate(launchGame(game).route);
    },
    [navigate]
  );

  const handlePlayChallenge = useCallback(
    (challenge: DailyChallenge) => {
      navigate(challenge.gameId ? launchGameById(challenge.gameId).route : "/endeavour");
    },
    [navigate]
  );

  const handleSelectSearchResult = useCallback(
    (item: SearchableItem) => {
      search.clear();
      navigate(item.route);
    },
    [navigate, search]
  );

  return (
    <AppShell profile={profile} bottomDecoration={<BottomEnvironment />}>
      <div className={styles.page}>
        <DecorativeBackground />

        <DashboardHeader
          profile={profile}
          search={search}
          onSelectResult={handleSelectSearchResult}
        />

        {status === "loading" && <DashboardSkeleton />}

        {status === "error" && (
          <div className={styles.errorState} role="alert">
            <p className={styles.errorTitle}>Something went wrong</p>
            <p className={styles.errorText}>We couldn&rsquo;t load your world just now.</p>
            <PrimaryButton variant="purple" onClick={retry} className={styles.errorButton}>
              Try again
            </PrimaryButton>
          </div>
        )}

        {status === "ready" && data && (
          <motion.div
            className={styles.sections}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <HeroBanner onExplore={goToGames} />

            <StatsGrid stats={data.stats} />

            <section className={styles.playSection}>
              <h2 className={styles.sectionTitle}>Continue Playing</h2>
              <div className={styles.playLayout}>
                <div className={styles.playGames}>
                  <GameGrid
                    games={data.continuePlaying}
                    onLaunch={handleLaunchGame}
                    variant="compact"
                    emptyTitle="No adventures started yet"
                    emptyText="Pick a game and your progress will show up here."
                    emptyActionLabel="Explore Games"
                    onEmptyAction={goToGames}
                  />
                </div>

                {data.dailyChallenge && (
                  <motion.div
                    className={styles.challengeSlot}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
                  >
                    <ChallengeBoard title="Daily Challenge">
                      <DailyChallengeCard
                        challenge={data.dailyChallenge}
                        onPlay={handlePlayChallenge}
                      />
                    </ChallengeBoard>
                  </motion.div>
                )}
              </div>
            </section>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
