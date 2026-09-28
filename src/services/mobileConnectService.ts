import type { OnboardingSession, OnboardingSessionResponse } from "../types/mobileConnect";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const MOBILE_CONNECT_BASE_URL =
  import.meta.env.VITE_MOBILE_CONNECT_BASE_URL ?? "https://app.kalqy.in/onboarding/connect";

const SESSION_TTL_MS = 10 * 60 * 1000;

/**
 * In-memory session store standing in for a real backend. A production
 * implementation would replace the bodies of the exported functions below
 * with calls to:
 *   POST   /api/onboarding/session
 *   GET    /api/onboarding/session/:sessionId
 *   POST   /api/onboarding/session/:sessionId/complete
 * against `${API_BASE_URL}`, without changing any calling code.
 */
const sessionStore = new Map<string, OnboardingSession>();

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function buildConnectUrl(sessionId: string): string {
  return `${MOBILE_CONNECT_BASE_URL}?session=${encodeURIComponent(sessionId)}`;
}

function withExpiryCheck(session: OnboardingSession): OnboardingSession {
  if (session.status !== "completed" && session.status !== "expired" && Date.now() >= session.expiresAt) {
    session.status = "expired";
  }
  return session;
}

export async function createOnboardingSession(userId: string): Promise<OnboardingSessionResponse> {
  const now = Date.now();
  const session: OnboardingSession = {
    sessionId: generateSessionId(),
    userId,
    status: "waiting",
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  sessionStore.set(session.sessionId, session);

  return {
    session: { ...session },
    connectUrl: buildConnectUrl(session.sessionId),
  };
}

export async function getSessionStatus(sessionId: string): Promise<OnboardingSession | null> {
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  return { ...withExpiryCheck(session) };
}

export async function completeOnboardingSession(sessionId: string): Promise<OnboardingSession | null> {
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  session.status = "completed";
  return { ...session };
}

type StatusListener = (session: OnboardingSession) => void;

/**
 * Polls session status on an interval and reports changes. Swap the interval
 * for a WebSocket/SSE subscription later without touching calling components.
 */
export function subscribeToSessionStatus(
  sessionId: string,
  onUpdate: StatusListener,
  intervalMs = 2000
): () => void {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    const session = await getSessionStatus(sessionId);
    if (session && !stopped) {
      onUpdate(session);
    }
  };

  tick();
  const intervalId = setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    clearInterval(intervalId);
  };
}

/**
 * Development-only helpers for exercising the connect flow without a real
 * mobile device. Never referenced by production UI logic.
 */
export const mobileConnectDevTools = {
  simulateMobileConnect(sessionId: string): void {
    const session = sessionStore.get(sessionId);
    if (session && session.status === "waiting") {
      session.status = "connected";
    }
  },
  simulateMobileComplete(sessionId: string): void {
    const session = sessionStore.get(sessionId);
    if (session) {
      session.status = "completed";
    }
  },
};

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __kalqyMobileConnectDevTools: typeof mobileConnectDevTools }).__kalqyMobileConnectDevTools =
    mobileConnectDevTools;
}
