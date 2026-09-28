import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface AuthState {
  email: string;
  authenticated: boolean;
  otpVerified: boolean;
}

interface AuthContextValue extends AuthState {
  setEmail: (email: string) => void;
  setOtpVerified: (verified: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  reset: () => void;
}

const initialState: AuthState = {
  email: "",
  authenticated: false,
  otpVerified: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      setEmail: (email) => setState((prev) => ({ ...prev, email })),
      setOtpVerified: (otpVerified) => setState((prev) => ({ ...prev, otpVerified })),
      setAuthenticated: (authenticated) => setState((prev) => ({ ...prev, authenticated })),
      reset: () => setState(initialState),
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
