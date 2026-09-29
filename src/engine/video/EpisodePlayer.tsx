import { useEffect, useRef, useState } from "react";
import { Play, SkipForward } from "lucide-react";
import styles from "./EpisodePlayer.module.css";

interface EpisodePlayerProps {
  src: string;
  /** Skip is locked until this many seconds of the episode have played. */
  skipAfterSeconds?: number;
  onDone: () => void;
  /** Called (before onDone) only when the child skips rather than watching to the end. */
  onSkip?: () => void;
}

/**
 * Plays an intro episode before a game (PROMPT section 52). Skip unlocks
 * after `skipAfterSeconds` of actual playback; ending or failing to load
 * both hand control straight back so a missing/broken video never blocks
 * the game.
 */
export function EpisodePlayer({ src, skipAfterSeconds = 10, onDone, onSkip }: EpisodePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Fetch as a blob so playback never depends on the packaged app's asset
  // scheme supporting HTTP range requests; fall back to the plain URL if the
  // fetch itself fails.
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    fetch(src)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error("bad status"))))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setVideoUrl(src);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  useEffect(() => {
    if (!videoUrl) return;
    videoRef.current?.play().catch(() => setNeedsTap(true));
  }, [videoUrl]);

  const secondsUntilSkip = Math.max(0, Math.ceil(skipAfterSeconds - currentTime));
  const canSkip = secondsUntilSkip === 0;

  return (
    <div className={styles.wrap}>
      <video
        ref={videoRef}
        className={styles.video}
        src={videoUrl ?? undefined}
        playsInline
        preload="auto"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlaying={() => setNeedsTap(false)}
        onEnded={onDone}
        onError={onDone}
      />

      {needsTap && (
        <button type="button" className={styles.tapToPlay} onClick={() => void videoRef.current?.play()}>
          <Play size={28} fill="currentColor" aria-hidden="true" />
          Tap to play
        </button>
      )}

      <button
        type="button"
        className={styles.skip}
        onClick={() => {
          onSkip?.();
          onDone();
        }}
        disabled={!canSkip}
        aria-label={canSkip ? "Skip episode" : `Skip available in ${secondsUntilSkip} seconds`}
      >
        <SkipForward size={18} aria-hidden="true" />
        {canSkip ? "Skip" : `Skip in ${secondsUntilSkip}`}
      </button>
    </div>
  );
}
