import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Phaser from "phaser";
import { Star, Hand, PersonStanding } from "lucide-react";
import { MotionEngine } from "../motion/MotionEngine";
import { MediaPipeMotionProvider } from "../motion/mediapipe/MediaPipeMotionProvider";
import { MockMotionProvider } from "../motion/mock/MockMotionProvider";
import { CameraError } from "../motion/camera/CameraManager";
import { AudioManager } from "../audio/AudioManager";
import { EpisodePlayer } from "../video/EpisodePlayer";
import type { GameProgress } from "../core/KalqyGame";
import { DebugOverlay } from "../debug/DebugOverlay";
import { analytics } from "../../features/games/services/analytics";
import { endeavourRepository } from "../../features/endeavour/services";
import { adventureIdForRoute } from "../../features/endeavour/services/endeavourRepository";
import { profileRepository } from "../../features/profile/services/profileRepository";
import { useOnboarding } from "../../context/OnboardingContext";
import { useSettings } from "../../context/SettingsContext";
import type { Profile } from "../../types/profile";
import { StoryHud, type HudGoal } from "../hud/StoryHud";
import { ProgressManager } from "../progression/ProgressManager";
import { FIRST_STORY_INDEX, type StoryGameDefinition, type StoryScene } from "./StoryGame";
import styles from "./StoryGamePage.module.css";

type Overlay = "pause" | "confirm-exit" | null;
type Phase = "episode" | "starting" | "camera-error" | "engine-error" | "playing";

const MOTION_ASSETS = {
  wasmBasePath: "/vendor/mediapipe/wasm",
  handLandmarkerModelPath: "/vendor/mediapipe/models/hand_landmarker.task",
  poseLandmarkerModelPath: "/vendor/mediapipe/models/pose_landmarker_lite.task",
};

/** Training first; then the first story level not yet completed. */
function pickStartIndex(progress: ProgressManager, levelIds: string[]): number {
  if (!progress.snapshot().trainingCompleted) return 0;
  const next = levelIds.findIndex((id, i) => i >= FIRST_STORY_INDEX && !progress.isCompleted(id));
  return next === -1 ? FIRST_STORY_INDEX : next;
}

export function StoryGamePage({ definition }: { definition: StoryGameDefinition }) {
  const { gameId, route, levelIds, copy } = definition;
  const storyLevelCount = levelIds.length - 1;
  const navigate = useNavigate();
  const { activeProfileId } = useOnboarding();
  const { soundEffects, music } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<StoryScene | null>(null);
  const engineRef = useRef<MotionEngine | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const recordedRef = useRef<GameProgress | null>(null);
  const soundEffectsRef = useRef(soundEffects);
  const musicRef = useRef(music);
  soundEffectsRef.current = soundEffects;
  musicRef.current = music;
  const savedProgress = useMemo(() => new ProgressManager(activeProfileId, { gameKey: definition.progressKey, trainingLevelId: levelIds[0] }),
    [activeProfileId, definition.progressKey, levelIds]
  );

  const [phase, setPhase] = useState<Phase>("episode");
  const [episodeDone, setEpisodeDone] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [useDemoHand, setUseDemoHand] = useState(
    () => import.meta.env.DEV && new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("demo") === "1"
  );
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [savedVersion, setSavedVersion] = useState(0);
  const [trackingLost, setTrackingLost] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    profileRepository.getProfile(activeProfileId).then(setProfile);
  }, [activeProfileId]);

  useEffect(() => {
    if (!episodeDone) return;

    let cancelled = false;
    let engine: MotionEngine | null = null;
    let game: Phaser.Game | null = null;
    let lostPoll: number | null = null;
    const audio = new AudioManager();

    setPhase("starting");
    setProgress(null);

    (async () => {
      const provider = useDemoHand ? new MockMotionProvider() : new MediaPipeMotionProvider();
      engine = new MotionEngine(provider);
      if (import.meta.env.DEV && provider instanceof MockMotionProvider) {
        const w = window as unknown as { __kalqyMockHand?: MockMotionProvider; __kalqyMockBody?: MockMotionProvider["mockBody"] };
        w.__kalqyMockHand = provider;
        w.__kalqyMockBody = provider.mockBody;
        (window as unknown as { __kalqyMockHands?: MockMotionProvider["mockHands"] }).__kalqyMockHands = provider.mockHands;
      }

      try {
        await engine.initialize({ profile: definition.trackingProfile, body: definition.bodyConfig, assets: MOTION_ASSETS });
        await engine.start();
      } catch (error) {
        engine.destroy();
        engine = null;
        if (error instanceof CameraError) analytics.track({ name: "camera_permission_denied", gameId: gameId });
        if (!cancelled) setPhase(error instanceof CameraError ? "camera-error" : "engine-error");
        return;
      }

      if (cancelled || !containerRef.current) {
        engine.destroy();
        return;
      }

      const activeEngine = engine;
      const handleProgress = (next: GameProgress) => {
        setProgress(next);
        setPhase((current) => (current === "starting" ? "playing" : current));
      };

      const { scenes, game: scene } = definition.createScenes({
        context: { motion: activeEngine },
        audio,
        onProgress: handleProgress,
        startIndex: pickStartIndex(savedProgress, levelIds),
        onLoadError: () => setPhase("engine-error"),
      });
      sceneRef.current = scene;
      engineRef.current = activeEngine;
      audioRef.current = audio;
      audio.setEnabled(soundEffectsRef.current, musicRef.current);

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 1280,
        height: 720,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: scenes,
        ...definition.phaserConfig,
      });
      gameRef.current = game;
      analytics.track({ name: "game_started", gameId: gameId });

      audio.startMusic(definition.musicTrack, { fallback: definition.synthMusic !== false }).catch(() => {
        // Audio is never allowed to block the game.
      });

      lostPoll = window.setInterval(() => setTrackingLost(!definition.isTracked(activeEngine)), 250);
    })();

    return () => {
      cancelled = true;
      sceneRef.current = null;
      engineRef.current = null;
      gameRef.current = null;
      audioRef.current = null;
      if (lostPoll !== null) window.clearInterval(lostPoll);
      game?.destroy(true);
      engine?.destroy();
      audio.destroy();
    };
  }, [episodeDone, attempt, useDemoHand, savedProgress, definition, gameId, levelIds]);

  // Persist each win exactly once, when the scene reports it.
  useEffect(() => {
    if (!progress || progress.status !== "success" || recordedRef.current === progress) return;
    recordedRef.current = progress;
    savedProgress.recordSuccess(progress.levelId, progress.stars, progress.score, progress.wrongTries);
    setSavedVersion((v) => v + 1);

    // Tell Endeavour how far through the adventure the child is; finishing every
    // story level completes it, which is what unlocks the next island.
    const adventureId = adventureIdForRoute(route);
    if (!activeProfileId || !adventureId || progress.levelId === levelIds[0]) return;
    const records = Object.values(savedProgress.snapshot().levels);
    if (records.length >= storyLevelCount) {
      const stars = Math.max(1, Math.min(3, Math.round(records.reduce((sum, r) => sum + r.stars, 0) / records.length)));
      const score = records.reduce((sum, r) => sum + r.bestScore, 0);
      analytics.track({ name: "story_completed", gameId: gameId });
      void endeavourRepository.completeAdventure(activeProfileId, adventureId, { stars, score });
    } else {
      void endeavourRepository.reportProgress(activeProfileId, adventureId, (records.length / storyLevelCount) * 100);
    }
  }, [progress, savedProgress, activeProfileId]);

  useEffect(() => {
    audioRef.current?.setEnabled(soundEffects, music);
  }, [soundEffects, music]);

  // Pausing freezes gameplay + music; resuming restores both.
  useEffect(() => {
    const paused = overlay !== null;
    sceneRef.current?.setPaused(paused);
    if (paused) audioRef.current?.pauseMusic();
    else audioRef.current?.resumeMusic();
  }, [overlay]);

  const canPause = phase === "playing" && progress?.status === "playing";

  // Esc toggles pause while a level is running.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !canPause) return;
      setOverlay((current) => {
        analytics.track({ name: current ? "game_resumed" : "game_paused", gameId: gameId });
        return current ? null : "pause";
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPause]);

  const exit = useCallback(() => {
    analytics.track({ name: "game_exited", gameId: gameId, levelId: progress?.levelId ?? "" });
    navigate("/endeavour");
  }, [navigate, progress?.levelId]);
  const openPause = useCallback(() => {
    analytics.track({ name: "game_paused", gameId: gameId });
    setOverlay("pause");
  }, []);
  const resume = useCallback(() => {
    analytics.track({ name: "game_resumed", gameId: gameId });
    setOverlay(null);
  }, []);
  const retryEngine = useCallback(() => setAttempt((n) => n + 1), []);
  const finishEpisode = useCallback(() => setEpisodeDone(true), []);
  const goToLevel = useCallback((index: number) => {
    setOverlay(null);
    sceneRef.current?.startLevelAt(index);
  }, []);

  const readDebugStats = useCallback((): string[] => {
    const quality = engineRef.current?.quality();
    const hand = engineRef.current?.hand("primary");
    const body = engineRef.current?.body();
    return [
      `game fps      ${gameRef.current?.loop.actualFps.toFixed(0) ?? "-"}`,
      `tracking fps  ${quality?.fps.toFixed(0) ?? "-"}   latency ${quality?.latencyMs.toFixed(0) ?? "-"}ms`,
      `hand          ${hand?.visible ? `${hand.position.x.toFixed(2)}, ${hand.position.y.toFixed(2)}  conf ${hand.confidence.toFixed(2)}` : "not visible"}`,
      `body          ${body?.visible ? `x ${body.center().x.toFixed(2)}  ${body.movementDirection()}${body.isLeaningLeft() ? " lean-L" : ""}${body.isLeaningRight() ? " lean-R" : ""}` : "not visible"}`,
      `level         ${sceneRef.current?.getProgress().levelId ?? "-"}  hold ${Math.round((sceneRef.current?.getProgress().holdProgress ?? 0) * 100)}%`,
    ];
  }, []);

  const goals = useMemo<HudGoal[]>(() => {
    const saved = savedProgress.snapshot();
    const records = Object.values(saved.levels);
    return [
      { id: "move", label: "Move & Explore", value: records.length, target: storyLevelCount },
      { id: "brain", label: "Brain Boost", value: records.reduce((sum, r) => sum + r.stars, 0), target: storyLevelCount * 3 },
      { id: "streak", label: "Streak", value: progress?.streak ?? 0, target: 5 },
    ];
    // savedVersion changes whenever a win is written, since snapshot() is a live object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedProgress, progress?.streak, savedVersion]);

  // No popup between levels: after the celebration, roll straight into the next one.
  useEffect(() => {
    if (phase !== "playing" || progress?.status !== "success" || progress.levelIndex >= progress.totalLevels - 1) return;
    const nextIndex = progress.levelIndex + 1;
    const timeout = window.setTimeout(() => goToLevel(nextIndex), 2600);
    return () => window.clearTimeout(timeout);
  }, [phase, progress?.status, progress?.levelIndex, progress?.totalLevels, goToLevel]);

  const isLastLevel = progress ? progress.levelIndex === progress.totalLevels - 1 : false;
  const isTraining = progress?.levelId === levelIds[0];

  return (
    <div className={styles.page}>
      <div ref={containerRef} className={styles.canvas} />

      {phase === "episode" && <EpisodePlayer
          src={definition.episodeVideo}
          onDone={finishEpisode}
          onSkip={() => analytics.track({ name: "episode_skipped", gameId: gameId })}
        />}

      {phase === "playing" && progress && (
        <StoryHud
          progress={progress}
          headline={definition.headline(progress)}
          lostHint={copy.lostHint}
          idleMessage={copy.idleMessage}
          playerName={profile?.name ?? "Player 1"}
          avatar={profile?.image ?? null}
          goals={goals}
          tip={definition.tip}
          trackingLost={trackingLost}
          showGoals={definition.hud?.goals}
          showHoldBar={definition.hud?.holdBar}
          onPause={openPause}
          onExit={() => setOverlay("confirm-exit")}
        />
      )}

      {phase === "starting" && (
        <div className={styles.overlay} role="status">
          <p className={styles.title}>{copy.loading}</p>
        </div>
      )}

      {phase === "camera-error" && (
        <div className={styles.overlay} role="alert">
          <p className={styles.title}>Camera access is needed to play.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={retryEngine}>
              Try Again
            </button>
            {import.meta.env.DEV && (
              <button type="button" className={styles.secondary} onClick={() => setUseDemoHand(true)}>
                Use demo hand (dev)
              </button>
            )}
            <button type="button" className={styles.secondary} onClick={exit}>
              Exit
            </button>
          </div>
        </div>
      )}

      {phase === "engine-error" && (
        <div className={styles.overlay} role="alert">
          <p className={styles.title}>Something went wrong getting the game ready.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={retryEngine}>
              Try Again
            </button>
            <button type="button" className={styles.secondary} onClick={exit}>
              Exit
            </button>
          </div>
        </div>
      )}

      {phase === "playing" && progress && (progress.waitingForHand || trackingLost) && progress.status === "playing" && overlay === null && (
        <div className={`${styles.ready} `} role="status">
          {definition.readyIcon === "body" ? <PersonStanding size={40} aria-hidden="true" /> : <Hand size={40} aria-hidden="true" />}
          <strong>{progress.waitingForHand ? copy.readyTitle : copy.lostTitle}</strong>
          <span>{progress.waitingForHand ? copy.readyBody : copy.lostHint}</span>
        </div>
      )}

      {overlay === "pause" && (
        <div className={styles.overlay} role="dialog" aria-label="Paused">
          <p className={styles.title}>Paused</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={resume}>
              Resume
            </button>
            <button type="button" className={styles.secondary} onClick={() => progress && goToLevel(progress.levelIndex)}>
              Restart Level
            </button>
            <button type="button" className={styles.secondary} onClick={() => setOverlay("confirm-exit")}>
              Exit
            </button>
          </div>
        </div>
      )}

      {overlay === "confirm-exit" && (
        <div className={styles.overlay} role="dialog" aria-label={copy.exitTitle}>
          <p className={styles.title}>{copy.exitTitle}</p>
          <p className={styles.subtitle}>Your progress is saved.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={resume}>
              Continue
            </button>
            <button type="button" className={styles.secondary} onClick={exit}>
              Exit
            </button>
          </div>
        </div>
      )}

      {phase === "playing" && progress?.status === "failed" && (
        <div className={styles.overlay}>
          <p className={styles.title}>Nice try! Let&rsquo;s go again.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => goToLevel(progress.levelIndex)}>
              Try Again
            </button>
            <button type="button" className={styles.secondary} onClick={exit}>
              Exit
            </button>
          </div>
        </div>
      )}

      {phase === "playing" && progress?.status === "success" && isLastLevel && (
        <div className={styles.overlay}>
          <p className={styles.title}>
            {isLastLevel ? copy.storyDoneTitle : isTraining ? copy.trainingDoneTitle : "Great Job!"}
          </p>
          <p className={styles.subtitle}>
            {isLastLevel ? copy.storyDoneBody : isTraining ? copy.trainingDoneBody : "Nicely done!"}
          </p>
          {!isTraining && (
            <div className={styles.stars} aria-label={`${progress.stars} of 3 stars`}>
              {[1, 2, 3].map((n) => (
                <Star key={n} size={44} fill={n <= progress.stars ? "#ffd166" : "rgba(255,255,255,0.25)"} color="#ffffff" />
              ))}
            </div>
          )}
          <div className={styles.actions}>
            {isLastLevel ? (
              <button type="button" className={styles.primary} onClick={() => goToLevel(FIRST_STORY_INDEX)}>
                Replay
              </button>
            ) : (
              <button type="button" className={styles.primary} onClick={() => goToLevel(progress.levelIndex + 1)}>
                {isTraining ? "Start Level 1" : "Next Level"}
              </button>
            )}
            <button type="button" className={styles.secondary} onClick={exit}>
              Exit
            </button>
          </div>
        </div>
      )}
      <DebugOverlay
        readStats={readDebugStats}
        actions={[
          {
            label: "Skip level",
            run: () => progress && goToLevel(Math.min(progress.levelIndex + 1, progress.totalLevels - 1)),
          },
          {
            label: "Reset progress",
            run: () => {
              savedProgress.reset();
              setSavedVersion((v) => v + 1);
              goToLevel(0);
            },
          },
        ]}
      />
    </div>
  );
}
