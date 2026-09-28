import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  FamilyRelationship,
  Occupation,
  SchoolStatus,
  ChildGender,
  ChildPhoto,
} from "../types/onboarding";

interface ParentInfo {
  name: string;
  age?: number;
  relationship?: FamilyRelationship;
  occupation?: Occupation;
}

interface ChildInfo {
  name?: string;
  age?: number;
  schoolStatus?: SchoolStatus;
  gender?: ChildGender;
  photo?: ChildPhoto | null;
  preferences?: string[];
}

interface OnboardingState {
  parent: ParentInfo;
  child: ChildInfo;
  currentStep: number;
  completed: boolean;
  activeProfileId: string | null;
}

export interface OnboardingContextValue extends OnboardingState {
  updateParent: (partial: Partial<ParentInfo>) => void;
  updateChild: (partial: Partial<ChildInfo>) => void;
  setCurrentStep: (step: number) => void;
  markCompleted: () => void;
  setActiveProfileId: (id: string) => void;
  reset: () => void;
}

const initialState: OnboardingState = {
  parent: { name: "" },
  child: {},
  currentStep: 1,
  completed: false,
  activeProfileId: null,
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ...state,
      updateParent: (partial) =>
        setState((prev) => ({ ...prev, parent: { ...prev.parent, ...partial } })),
      updateChild: (partial) =>
        setState((prev) => ({ ...prev, child: { ...prev.child, ...partial } })),
      setCurrentStep: (currentStep) => setState((prev) => ({ ...prev, currentStep })),
      markCompleted: () => setState((prev) => ({ ...prev, completed: true })),
      setActiveProfileId: (activeProfileId) => setState((prev) => ({ ...prev, activeProfileId })),
      reset: () => setState(initialState),
    }),
    [state]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}
