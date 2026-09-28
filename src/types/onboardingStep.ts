import type { ReactNode } from "react";
import type { OnboardingContextValue } from "../context/OnboardingContext";
import type { ChildPhoto, SelectOption } from "./onboarding";

export interface OnboardingRequiredCheck {
  isSatisfied: (ctx: OnboardingContextValue) => boolean;
  redirectTo: string;
}

export interface OnboardingTextField {
  kind: "text";
  label: string;
  placeholder: string;
  maxLength?: number;
  requiredMessage: string;
  getValue: (ctx: OnboardingContextValue) => string;
  setValue: (value: string, ctx: OnboardingContextValue) => void;
}

export interface OnboardingSelectField {
  kind: "select";
  ariaLabel: string;
  options: SelectOption<string>[];
  defaultValue: string;
  getValue: (ctx: OnboardingContextValue) => string | undefined;
  setValue: (value: string, ctx: OnboardingContextValue) => void;
}

export interface OnboardingPhotoField {
  kind: "photo";
  getValue: (ctx: OnboardingContextValue) => ChildPhoto | null;
  setValue: (value: ChildPhoto | null, ctx: OnboardingContextValue) => void;
}

export type OnboardingField = OnboardingTextField | OnboardingSelectField | OnboardingPhotoField;

export interface OnboardingStepConfig {
  path: string;
  step: number;
  totalSteps: number;
  backPath: string;
  nextPath: string;
  illustrationSrc: string;
  illustrationAlt: string;
  illustrationMaxWidth?: number;
  heading: string;
  description: ReactNode;
  field: OnboardingField;
  requiredChecks: OnboardingRequiredCheck[];
  onNext?: (ctx: OnboardingContextValue) => void;
}
