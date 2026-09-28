export type OnboardingSessionStatus = "waiting" | "connected" | "completed" | "expired";

export interface OnboardingSession {
  sessionId: string;
  userId: string;
  status: OnboardingSessionStatus;
  createdAt: number;
  expiresAt: number;
}

export interface OnboardingSessionResponse {
  session: OnboardingSession;
  connectUrl: string;
}
