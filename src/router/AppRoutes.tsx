import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { SplashPage } from "../pages/SplashPage";
import { LoginPage } from "../pages/LoginPage";
import { LoginEmailPage } from "../pages/LoginEmailPage";
import { LoginOtpPage } from "../pages/LoginOtpPage";
import { HomePage } from "../pages/HomePage";
import { MobileConnectPage } from "../pages/MobileConnectPage";
import { ParentOnboardingPage } from "../pages/ParentOnboardingPage";
import { OnboardingStepPage } from "../pages/onboarding/OnboardingStepPage";
import { ONBOARDING_STEPS } from "../pages/onboarding/onboardingSteps";
import { OnboardingCompletePage } from "../pages/onboarding/OnboardingCompletePage";
import { SetupPage } from "../pages/onboarding/SetupPage";
import { ProfileSelectionPage } from "../pages/ProfileSelectionPage";
import { GamesPage } from "../pages/GamesPage";
import { EndeavourPage } from "../pages/EndeavourPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SectionPlaceholderPage } from "../pages/SectionPlaceholderPage";
import { SECTIONS } from "../pages/sections";
import { PageTransition } from "../animations/PageTransition";

export function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <SplashPage />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <LoginPage />
            </PageTransition>
          }
        />
        <Route
          path="/login/email"
          element={
            <PageTransition>
              <LoginEmailPage />
            </PageTransition>
          }
        />
        <Route
          path="/login/otp"
          element={
            <PageTransition>
              <LoginOtpPage />
            </PageTransition>
          }
        />
        <Route
          path="/home"
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          }
        />
        <Route
          path="/parent/mobile-connect"
          element={
            <PageTransition>
              <MobileConnectPage />
            </PageTransition>
          }
        />
        <Route
          path="/parent/onboarding"
          element={
            <PageTransition>
              <ParentOnboardingPage />
            </PageTransition>
          }
        />

        {/* Every onboarding "question" screen (name/relationship/occupation/
            age/school/gender/photo) is the same widget, driven by config —
            see onboardingSteps.tsx. */}
        {ONBOARDING_STEPS.map((step) => (
          <Route
            key={step.path}
            path={`/parent/onboarding/${step.path}`}
            element={
              <PageTransition>
                <OnboardingStepPage config={step} />
              </PageTransition>
            }
          />
        ))}

        <Route
          path="/parent/onboarding/complete"
          element={
            <PageTransition>
              <OnboardingCompletePage />
            </PageTransition>
          }
        />
        <Route
          path="/parent/onboarding/setup"
          element={
            <PageTransition>
              <SetupPage />
            </PageTransition>
          }
        />
        <Route
          path="/profile-selection"
          element={
            <PageTransition>
              <ProfileSelectionPage />
            </PageTransition>
          }
        />
        <Route
          path="/games"
          element={
            <PageTransition>
              <GamesPage />
            </PageTransition>
          }
        />
        <Route
          path="/endeavour"
          element={
            <PageTransition>
              <EndeavourPage />
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <SettingsPage />
            </PageTransition>
          }
        />

        {/* Sections that exist in navigation but aren't built yet all render
            the same config-driven placeholder. */}
        {SECTIONS.map((section) => (
          <Route
            key={section.path}
            path={section.path}
            element={
              <PageTransition>
                <SectionPlaceholderPage config={section} />
              </PageTransition>
            }
          />
        ))}
      </Routes>
    </AnimatePresence>
  );
}
